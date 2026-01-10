import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase-admin';
import { Octokit } from '@octokit/rest';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. ПРОВЕРКА
    if (!db || !adminAuth) {
        return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
    }

    const params = await context.params;
    const projectId = params.id;

    const idToken = request.headers.get('authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // TS знает, что adminAuth существует
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    
    // TS знает, что db существует
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
        return NextResponse.json({ error: 'GitHub token not found. Please re-login.' }, { status: 400 });
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

    return NextResponse.json({ success: true, message: 'Redeploy started' });

  } catch (error: any) {
    console.error('Redeploy API Error:', error);
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 });
  }
}