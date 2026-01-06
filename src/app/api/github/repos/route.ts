import { NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebase-admin';
import { Octokit } from "@octokit/rest";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();

    if (!userData || !userData.githubAccessToken) {
      return NextResponse.json({ error: 'GitHub token not found' }, { status: 403 });
    }

    const octokit = new Octokit({ auth: userData.githubAccessToken });

    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
      visibility: 'all',
    });

    const repos = data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name, 
      url: repo.clone_url,      
      private: repo.private,    
      updated_at: repo.updated_at,
    }));

    return NextResponse.json(repos);

  } catch (error) {
    console.error('GitHub API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch repositories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
