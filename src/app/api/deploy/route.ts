import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { db, adminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    // 1. Проверяем Firebase
    if (!db || !adminAuth) {
      console.error("[Deploy API] Error: Firebase Admin SDK not initialized");
      return NextResponse.json(
          { error: "Server Error: Firebase connection failed" },
          { status: 500 }
      );
    }

    // 2. Проверяем токен авторизации (от фронтенда)
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized: No token provided' }, { status: 401 });
    }

    // 3. Расшифровываем токен юзера
    let uid, ownerEmail;
    try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        uid = decodedToken.uid;
        ownerEmail = decodedToken.email;
        if (!ownerEmail) throw new Error("No email in token");
    } catch (e) {
        console.error("[Deploy API] Token verification failed:", e);
        return NextResponse.json({ error: 'Unauthorized: Invalid token' }, { status: 401 });
    }

    // 4. Получаем данные пользователя (GitHub токен) из БД
    const userRef = db.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();
    const userGithubToken = userData?.githubAccessToken;
    const ownerLogin = userData?.login;

    if (!userGithubToken) {
        return NextResponse.json({ error: 'User GitHub token not found. Please Sign In again.' }, { status: 403 });
    }

    // 5. Проверяем токен Билдера (Серверный)
    // ЭТОТ ТОКЕН ДОЛЖЕН БЫТЬ В .env ФАЙЛЕ (Settings -> Environment Variables)
    const builderGithubToken = process.env.GITHUB_ACCESS_TOKEN;
    if (!builderGithubToken) {
        console.error('[Deploy API] CRITICAL: GITHUB_ACCESS_TOKEN is missing in .env');
        return NextResponse.json({ error: 'Server configuration error: Missing Builder Token' }, { status: 500 });
    }

    // 6. Читаем тело запроса
    const body = await request.json();
    const { gitUrl, projectName, envVars, isPublic } = body;

    if (!gitUrl || !projectName) {
      return NextResponse.json({ error: 'Missing required fields: gitUrl or projectName' }, { status: 400 });
    }

    // Инициализируем GitHub клиент (от имени бота-билдера)
    const octokit = new Octokit({ auth: builderGithubToken });
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // 7. Сохраняем проект в БД
    const projectRef = db.ref(`projects/${safeName}`);
    const projectData = {
      id: safeName,
      name: projectName,
      status: 'Сборка',
      repoUrl: gitUrl,
      targetImage: `cr.yandex/${process.env.YC_REGISTRY_ID || '...'}/${safeName}:latest`,
      domain: `${safeName}.containers.yandexcloud.net`,
      owner: ownerEmail,
      ownerLogin: ownerLogin || '',
      isPublic: isPublic || false,
      envVars: envVars || [],
      buildErrors: [],
      missingEnvVars: [],
      deploymentLogs: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Важно: сохраняем токен владельца, чтобы потом использовать его при авто-деплое, если нужно
      // Но безопаснее его не хранить тут, а брать из users/${uid}
    };

    await projectRef.set(projectData);

    const envVarsString = envVars && envVars.length > 0 
      ? JSON.stringify(envVars) 
      : '';
    
    // 8. Запускаем GitHub Workflow
    try {
        await octokit.actions.createWorkflowDispatch({
            owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
            repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
            workflow_id: 'universal-builder.yml',
            ref: 'main',
            inputs: {
                gitUrl: gitUrl,
                projectName: safeName,
                gitToken: userGithubToken, // Токен юзера для клонирования
                owner: ownerEmail,
                envVars: envVarsString,
            },
        });
        console.log(`[API] Successfully triggered build for ${safeName}`);
    } catch (ghError: any) {
        console.error("[Deploy API] GitHub Workflow Error:", ghError.response?.data || ghError.message);
        // Если упал GitHub, помечаем проект как ошибку
        await projectRef.update({ status: 'Ошибка', buildErrors: ['Failed to start build pipeline'] });
        return NextResponse.json({ error: 'Failed to trigger GitHub Action: ' + (ghError.message || 'Unknown') }, { status: 500 });
    }

    return NextResponse.json(projectData);

  } catch (error: any) {
    console.error('[Deploy API] Unhandled Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}