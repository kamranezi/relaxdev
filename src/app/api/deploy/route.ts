import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { db, adminAuth } from "@/lib/firebase-admin";

export async function POST(request: NextRequest) {
  try {
    if (!db || !adminAuth) {
      console.error("Firebase Admin SDK not initialized");
      return NextResponse.json(
          { error: "Internal Server Error: Firebase not initialized." },
          { status: 500 }
      );
    }
    
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const user = await adminAuth.getUser(uid);
    const ownerEmail = user.email!;

    const userRef = db.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();
    const userGithubToken = userData?.githubAccessToken;
    const ownerLogin = userData?.login;

    if (!userGithubToken) {
        return NextResponse.json({ error: 'User GitHub token not found' }, { status: 403 });
    }

    // Используем специальный токен для запуска сборки
    const builderGithubToken = process.env.GITHUB_ACCESS_TOKEN;
    if (!builderGithubToken) {
        console.error('GITHUB_ACCESS_TOKEN is not set on the server');
        return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const octokit = new Octokit({ auth: builderGithubToken });

    const body = await request.json();
    const { gitUrl, projectName, envVars, isPublic } = body;

    if (!gitUrl || !projectName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    const projectRef = db.ref(`projects/${safeName}`);
    const projectData = {
      id: safeName,
      name: projectName,
      status: 'Сборка',
      repoUrl: gitUrl,
      targetImage: `cr.yandex/${process.env.YC_REGISTRY_ID || '...'}/${safeName}:latest`,
      domain: `${safeName}.containers.yandexcloud.net`,
      owner: ownerEmail,
      ownerLogin: ownerLogin,
      isPublic: isPublic || false,
      envVars: envVars || [],
      buildErrors: [],
      missingEnvVars: [],
      deploymentLogs: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await projectRef.set(projectData);

    const envVarsString = envVars && envVars.length > 0 
      ? JSON.stringify(envVars) 
      : '';
    
    await octokit.actions.createWorkflowDispatch({
      owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
      repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
      workflow_id: 'universal-builder.yml',
      ref: 'main',
      inputs: {
        gitUrl: gitUrl,
        projectName: safeName,
        // Передаем токен пользователя для клонирования его репозитория
        gitToken: userGithubToken || '', 
        owner: ownerEmail,
        envVars: envVarsString,
      },
    });

    console.log(`[API] Triggered build for ${safeName} by ${ownerEmail}`);

    return NextResponse.json(projectData);

  } catch (error) {
    console.error('GitHub API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to trigger build';
    return NextResponse.json(
      { error: message }, 
      { status: 500 }
    );
  }
}
