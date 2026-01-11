import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase-admin';
import { Octokit } from '@octokit/rest';
import { getContainerByName, deployRevision } from '@/lib/yandex'; // ⭐ Импорт функций для отката

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!db || !adminAuth) {
        return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
    }

    const params = await context.params;
    const projectId = params.id;

    const idToken = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // Проверка админа
    const adminRef = db.ref(`admins/${uid}`);
    const adminSnapshot = await adminRef.once('value');
    const isAdmin = adminSnapshot.val() === true;

    // Получаем проект
    const projectRef = db.ref(`projects/${projectId}`);
    const projectSnapshot = await projectRef.once('value');
    const project = projectSnapshot.val();

    // Проверка доступа
    if (!project || (project.owner !== decodedToken.email && !isAdmin)) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Проверяем, передан ли конкретный образ для отката
    let targetImage = null;
    try {
        const body = await request.json();
        targetImage = body.image;
    } catch (e) {
        // Body может быть пустым при обычном редеплое
    }

    // ⭐ СЦЕНАРИЙ 1: БЫСТРЫЙ ОТКАТ (Rollback)
    // Если передан image, мы просто обновляем ревизию в Yandex без пересборки кода
    if (targetImage) {
        console.log(`[Redeploy] Rolling back ${project.name} to ${targetImage}`);
        
        const container = await getContainerByName(project.name);
        if (!container) {
            return NextResponse.json({ error: 'Container not found in Yandex Cloud' }, { status: 404 });
        }

        // Подготовка переменных окружения
        const envVarsMap: Record<string, string> = {};
        if (project.envVars && Array.isArray(project.envVars)) {
            project.envVars.forEach((v: any) => { envVarsMap[v.key] = v.value; });
        }

        try {
            // Вызов Yandex API напрямую
            await deployRevision(
                container.id,
                targetImage,
                process.env.YC_SA_ID!,
                envVarsMap
            );

            // Обновляем статус в БД мгновенно
            await projectRef.update({ 
                status: 'Активен', 
                currentImage: targetImage,
                lastDeployed: new Date().toISOString(),
                deploymentLogs: `Rollback to image ${targetImage} initiated.`
            });

            return NextResponse.json({ success: true, message: 'Rollback initiated successfully' });
        } catch (e: any) {
            console.error('[Redeploy] Rollback failed:', e);
            return NextResponse.json({ error: `Rollback failed: ${e.message}` }, { status: 500 });
        }
    }

    // ⭐ СЦЕНАРИЙ 2: ПОЛНЫЙ РЕДЕПЛОЙ (через GitHub Actions)
    
    // Получаем токен пользователя для доступа к его коду
    const userRef = db.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();
    const userGithubToken = user?.githubAccessToken;

    if (!userGithubToken) {
        return NextResponse.json({ error: 'GitHub token not found. Please re-login.' }, { status: 400 });
    }

    const builderGithubToken = process.env.GITHUB_ACCESS_TOKEN;
    if (!builderGithubToken) {
        console.error('GITHUB_ACCESS_TOKEN is missing for redeploy');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const octokit = new Octokit({ auth: builderGithubToken });

    const envVarsString = project.envVars && project.envVars.length > 0 
      ? JSON.stringify(project.envVars) 
      : '';

    // Запускаем workflow
    await octokit.actions.createWorkflowDispatch({
      owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
      repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
      workflow_id: 'universal-builder.yml',
      ref: 'main',
      inputs: {
        gitUrl: project.repoUrl,
        projectName: projectId,
        gitToken: userGithubToken,
        owner: project.owner,
        envVars: envVarsString,
      },
    });

    await projectRef.update({
      status: 'Сборка',
      updatedAt: new Date().toISOString(),
      buildStartedAt: Date.now() // Для таймаутов
    });

    return NextResponse.json({ success: true, message: 'Redeploy started' });

  } catch (error: any) {
    console.error('Redeploy API Error:', error);
    const message = error.response?.data?.message || error.message || 'Failed to trigger build';
    return NextResponse.json(
      { error: message }, 
      { status: error.status || 500 }
    );
  }
}