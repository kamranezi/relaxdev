import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { db, adminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    if (!db || !adminAuth) {
      console.error("Firebase Admin SDK not initialized");
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
    
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const user = await adminAuth.getUser(uid);
    const ownerEmail = user.email!;

    const userRef = db.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();
    const userGithubToken = userData?.githubAccessToken;
    const ownerLogin = userData?.login || userData?.githubUsername || ownerEmail.split('@')[0];

    if (!userGithubToken) return NextResponse.json({ error: 'GitHub token not found' }, { status: 403 });

    const builderGithubToken = process.env.GITHUB_ACCESS_TOKEN;
    if (!builderGithubToken) return NextResponse.json({ error: 'Server config error' }, { status: 500 });

    const octokit = new Octokit({ auth: builderGithubToken });
    const body = await request.json();
    const { gitUrl, projectName, envVars, isPublic, autodeploy } = body;

    if (!gitUrl || !projectName) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    const projectRef = db.ref(`projects/${safeName}`);
    const now = new Date().toISOString();

    const projectData = {
      id: safeName,
      name: projectName,
      status: 'Сборка',
      repoUrl: gitUrl,
      targetImage: `cr.yandex/${process.env.YC_REGISTRY_ID || '...'}/${safeName}:latest`,
      domain: '',
      owner: ownerEmail,
      ownerLogin: ownerLogin || null,
      isPublic: isPublic || false,
      autodeploy: autodeploy !== false,
      webhookId: null as number | null, // ⭐ Инициализируем null
      envVars: envVars || [],
      buildErrors: [],
      missingEnvVars: [],
      deploymentLogs: '',
      createdAt: now,
      updatedAt: now,
      lastDeployed: now,
    };

    // Сначала сохраняем проект
    await projectRef.set(projectData);

    // ⭐ ЛОГИКА ВЕБХУКА С СОХРАНЕНИЕМ ID ⭐
    if (autodeploy !== false) {
      try {
        const repoUrlParts = gitUrl.replace('https://github.com/', '').split('/');
        const repoOwner = repoUrlParts[0];
        const repoName = repoUrlParts[1];
        // Используйте переменную окружения или хардкод
        const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://relaxdev.ru'}/api/webhook/github`;
        
        const userOctokit = new Octokit({ auth: userGithubToken });

        // 1. Получаем список хуков
        const hooks = await userOctokit.repos.listWebhooks({
            owner: repoOwner,
            repo: repoName,
        });

        const existingHook = hooks.data.find(h => h.config.url === webhookUrl);
        let webhookId: number | undefined;

        if (!existingHook) {
            // 2. Создаем новый
            const newHook = await userOctokit.repos.createWebhook({
                owner: repoOwner,
                repo: repoName,
                name: 'web',
                active: true,
                events: ['push'], 
                config: {
                    url: webhookUrl,
                    content_type: 'json',
                    insecure_ssl: '0',
                    secret: process.env.WEBHOOK_SECRET || 'relaxdev-secret', 
                },
            });
            webhookId = newHook.data.id;
            console.log(`[API] Webhook created: ID ${webhookId}`);
        } else {
            webhookId = existingHook.id;
            console.log(`[API] Webhook exists: ID ${webhookId}`);
        }

        // 3. ⭐ Обновляем проект, сохраняя ID вебхука
        if (webhookId) {
            await projectRef.update({ webhookId: webhookId });
        }

      } catch (err) {
        console.error('Failed to manage webhook:', err);
      }
    }
    // ⭐ КОНЕЦ БЛОКА ВЕБХУКА ⭐

    const envVarsString = envVars && envVars.length > 0 ? JSON.stringify(envVars) : '';
    
    await octokit.actions.createWorkflowDispatch({
      owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
      repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
      workflow_id: 'universal-builder.yml',
      ref: 'main',
      inputs: {
        gitUrl: gitUrl,
        projectName: safeName,
        gitToken: userGithubToken || '', 
        owner: ownerEmail,
        envVars: envVarsString,
      },
    });

    console.log(`[API] Triggered build for ${safeName}`);

    // Возвращаем обновленные данные (с webhookId, если успели обновить, но лучше вернуть то, что есть)
    // Клиент все равно перезапросит список или статус позже
    return NextResponse.json(projectData);

  } catch (error: any) {
    console.error('GitHub API Error:', error);
    const message = error.response?.data?.message || error.message || 'Failed to trigger build';
    return NextResponse.json({ error: message }, { status: error.status || 500 });
  }
}