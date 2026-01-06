import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { db } from "@/lib/firebase";
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
});

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserEmail = session.user.email;
    const currentUserLogin = session.user.login || currentUserEmail.split('@')[0];
    
    // Проверяем роль пользователя
    const userRef = db.ref(`users/${currentUserEmail.replace(/\./g, '_')}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();
    const isAdmin = userData?.role === 'admin' || currentUserEmail === 'alexrus1144@gmail.com';

    const projectRef = db.ref(`projects/${params.id}`);
    const projectSnapshot = await projectRef.once('value');
    const project = projectSnapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Проверяем права доступа
    if (!isAdmin && project.owner !== currentUserEmail && project.ownerLogin !== currentUserLogin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Обновляем статус проекта на "Сборка"
    await projectRef.update({
      status: 'Сборка',
      updatedAt: new Date().toISOString(),
      buildErrors: [],
      missingEnvVars: [],
      deploymentLogs: 'Starting redeploy...',
    });

    // Подготавливаем переменные окружения для передачи в workflow
    const envVarsString = project.envVars && project.envVars.length > 0 
      ? JSON.stringify(project.envVars) 
      : '';

    // Запускаем workflow заново
    await octokit.actions.createWorkflowDispatch({
      owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
      repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
      workflow_id: 'universal-builder.yml',
      ref: 'main',
      inputs: {
        gitUrl: project.repoUrl,
        projectName: params.id,
        gitToken: project.gitToken || '',
        owner: project.ownerLogin || currentUserLogin,
        envVars: envVarsString,
      },
    });

    console.log(`[API] Triggered redeploy for ${params.id} by ${currentUserLogin}`);

    const updatedProject = {
      ...project,
      status: 'Сборка',
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(updatedProject);

  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to redeploy project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

