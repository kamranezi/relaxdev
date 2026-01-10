import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase-admin';
import { Octokit } from '@octokit/rest';

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

    // Получаем токен пользователя для доступа к его коду
    const userRef = db.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();
    const userGithubToken = user?.githubAccessToken;

    if (!userGithubToken) {
        return NextResponse.json({ error: 'GitHub token not found. Please re-login.' }, { status: 400 });
    }

    // ⭐ ИСПОЛЬЗУЕМ СЕРВЕРНЫЙ ТОКЕН ДЛЯ ЗАПУСКА БИЛДЕРА (как в deploy)
    const builderGithubToken = process.env.GITHUB_ACCESS_TOKEN;
    if (!builderGithubToken) {
        console.error('GITHUB_ACCESS_TOKEN is missing for redeploy');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const octokit = new Octokit({ auth: builderGithubToken });

    const envVarsString = project.envVars && project.envVars.length > 0 
      ? JSON.stringify(project.envVars) 
      : '';

    // Запускаем тот же workflow, что и при создании
    await octokit.actions.createWorkflowDispatch({
      owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
      repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
      workflow_id: 'universal-builder.yml',
      ref: 'main',
      inputs: {
        gitUrl: project.repoUrl,
        projectName: projectId, // Используем ID как safeName
        gitToken: userGithubToken, // Токен пользователя для клонирования
        owner: project.owner,
        envVars: envVarsString,
      },
    });

    await projectRef.update({
      status: 'Сборка',
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: 'Redeploy started' });

  } catch (error: any) {
    console.error('Redeploy API Error:', error);
    if (error.response) {
        console.error('GitHub Error Data:', error.response.data);
    }
    const message = error.response?.data?.message || error.message || 'Failed to trigger build';
    return NextResponse.json(
      { error: message }, 
      { status: error.status || 500 }
    );
  }
}
