import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getServerSession } from "next-auth"; 
import { authOptions } from "../../auth/[...nextauth]/route"; // <--- ВАЖНО: Импортируем authOptions, а не handler

// Инициализация клиента GitHub
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    // 1. ПОЛУЧАЕМ ТЕКУЩЕГО ПОЛЬЗОВАТЕЛЯ
    // ВАЖНО: Передаем authOptions
    const session = await getServerSession(authOptions);
    
    // Если пользователь не вошел, используем 'anonymous'
    const ownerLogin = session?.user?.name || 'anonymous';

    const body = await request.json();
    const { gitUrl, projectName, gitToken } = body; 

    if (!gitUrl || !projectName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // 2. ОТПРАВЛЯЕМ OWNER В GITHUB ACTIONS
    await octokit.actions.createWorkflowDispatch({
      owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
      repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
      workflow_id: 'universal-builder.yml',
      ref: 'main',
      inputs: {
        gitUrl: gitUrl,
        projectName: safeName,
        gitToken: gitToken || '', 
        owner: ownerLogin,        // <--- Передаем владельца!
      },
    });

    console.log(`[API] Triggered build for ${safeName} by ${ownerLogin}`);

    return NextResponse.json({
      id: `proj_${Date.now()}`,
      name: projectName,
      status: 'Сборка', 
      repoUrl: gitUrl,
      targetImage: `cr.yandex/.../${safeName}:latest`,
      domain: `${safeName}.containers.yandexcloud.net`,
    });

  } catch (error: any) {
    console.error('GitHub API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to trigger build' }, 
      { status: 500 }
    );
  }
}