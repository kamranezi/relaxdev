import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from "@/lib/firebase-admin";
import { Octokit } from '@octokit/rest';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const user = await adminAuth.getUser(uid);
    const currentUserEmail = user.email!;

    const userRef = db.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();
    const isAdmin = userData?.role === 'admin' || currentUserEmail === 'alexrus1144@gmail.com';
    const githubToken = userData?.githubAccessToken;

    if (!githubToken) {
        return NextResponse.json({ error: 'GitHub token not found' }, { status: 403 });
    }

    const octokit = new Octokit({ auth: githubToken });

    const projectRef = db.ref(`projects/${params.id}`);
    const projectSnapshot = await projectRef.once('value');
    const project = projectSnapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (!isAdmin && project.owner !== currentUserEmail) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await projectRef.update({
      status: 'Сборка',
      updatedAt: new Date().toISOString(),
      buildErrors: [],
      missingEnvVars: [],
      deploymentLogs: 'Starting redeploy...',
    });

    const envVarsString = project.envVars && project.envVars.length > 0 
      ? JSON.stringify(project.envVars) 
      : '';

    await octokit.actions.createWorkflowDispatch({
      owner: process.env.BUILDER_REPO_OWNER || 'kamranezi',
      repo: process.env.BUILDER_REPO_NAME || 'ruvercel-builder',
      workflow_id: 'universal-builder.yml',
      ref: 'main',
      inputs: {
        gitUrl: project.repoUrl,
        projectName: params.id,
        gitToken: githubToken || '',
        owner: project.owner,
        envVars: envVarsString,
      },
    });

    console.log(`[API] Triggered redeploy for ${params.id} by ${currentUserEmail}`);

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
