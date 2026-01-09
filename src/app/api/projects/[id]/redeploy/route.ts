import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase-admin';
import { Octokit } from '@octokit/rest';

export async function POST(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { id: projectId } = context.params;

    const idToken = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    const adminRef = db.ref(`admins/${uid}`);
    const adminSnapshot = await adminRef.once('value');
    const isAdmin = adminSnapshot.val() === true;

    const projectRef = db.ref(`projects/${projectId}`);
    const projectSnapshot = await projectRef.once('value');
    const project = projectSnapshot.val();

    if (!project || (project.owner !== decodedToken.email && !isAdmin)) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    const userRef = db.ref(`users/${uid}`);
    const userSnapshot = await userRef.once('value');
    const user = userSnapshot.val();
    const githubToken = user?.githubAccessToken;

    if (!githubToken) {
        return NextResponse.json({ error: 'GitHub token not found. Please re-login with GitHub.' }, { status: 400 });
    }

    const octokit = new Octokit({ auth: githubToken });

    const [owner, repo] = project.repoUrl.replace('https://github.com/', '').split('/');

    await octokit.actions.createWorkflowDispatch({
      owner,
      repo,
      workflow_id: 'deploy.yml',
      ref: 'main',
      inputs: {
        project_id: projectId,
      },
    });

    await projectRef.update({
      status: 'Сборка',
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: 'Redeployment successfully started' });

  } catch (error) {
    console.error('Redeploy API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to start redeployment';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
