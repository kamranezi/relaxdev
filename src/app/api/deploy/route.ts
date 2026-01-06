import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/firebase";

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const ownerEmail = session.user.email;
    const ownerLogin = session.user.login || ownerEmail.split('@')[0];

    const body = await request.json();
    const { gitUrl, projectName, gitToken, envVars } = body;

    if (!gitUrl || !projectName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // Сохраняем проект в Firebase (используем safeName как ID, т.к. это имя контейнера)
    const projectRef = db.ref(`projects/${safeName}`);
    const projectData = {
      id: safeName, // Используем safeName как ID
      name: projectName,
      status: 'Сборка',
      repoUrl: gitUrl,
      targetImage: `cr.yandex/${process.env.YC_REGISTRY_ID || '...'}/${safeName}:latest`,
      domain: `${safeName}.containers.yandexcloud.net`,
      owner: ownerEmail,
      ownerLogin: ownerLogin,
      envVars: envVars || [],
      buildErrors: [],
      missingEnvVars: [],
      deploymentLogs: '',
      gitToken: gitToken || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await projectRef.set(projectData);

    // Запускаем workflow с переменными окружения
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
        gitToken: gitToken || '',
        owner: ownerLogin,
        envVars: envVarsString,
      },
    });

    console.log(`[API] Triggered build for ${safeName} by ${ownerLogin}`);

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
