import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // <--- ИМПОРТИРУЕМ ОПЦИИ

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    // Передаем authOptions в getServerSession
    const session = await getServerSession(authOptions);
    
    const ownerLogin = session?.user?.login || 'anonymous';

    const body = await request.json();
    const { gitUrl, projectName, gitToken } = body;

    if (!gitUrl || !projectName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
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

  } catch (error) {
    console.error('GitHub API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to trigger build';
    return NextResponse.json(
      { error: message }, 
      { status: 500 }
    );
  }
}
