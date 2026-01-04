// src/app/api/deploy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';

// Инициализация клиента GitHub
// ВАЖНО: Токен должен быть в переменных окружения контейнера
const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gitUrl, projectName } = body;

    if (!gitUrl || !projectName) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    // Приводим имя к безопасному виду
    const safeName = projectName.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    
    // ВЫЗОВ СБОРКИ: Пинаем наш репозиторий-сборщик
    await octokit.actions.createWorkflowDispatch({
      owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
      repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
      workflow_id: 'universal-builder.yml',
      ref: 'main', // Ветка, где лежит yml файл
      inputs: {
        gitUrl: gitUrl,
        projectName: safeName,
      },
    });

    console.log(`[API] Triggered build for ${safeName}`);

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