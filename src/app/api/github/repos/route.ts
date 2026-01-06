import { NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebase-admin';
import { Octokit } from "@octokit/rest";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  console.log('[API /github/repos] Received request');
  try {
    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      console.log('[API /github/repos] Error: No authorization token found.');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    console.log('[API /github/repos] Verifying Firebase ID token...');
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    console.log(`[API /github/repos] Token verified for UID: ${uid}`);

    console.log(`[API /github/repos] Fetching GitHub token from RTDB for UID: ${uid}`);
    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.once('value');
    const userData = snapshot.val();
    console.log('[API /github/repos] Fetched data from RTDB.');

    if (!userData || !userData.githubAccessToken) {
      console.log('[API /github/repos] Error: GitHub access token not found in RTDB.');
      return NextResponse.json({ error: 'GitHub token not found' }, { status: 403 });
    }

    console.log('[API /github/repos] Initializing Octokit and fetching repos from GitHub...');
    const octokit = new Octokit({ auth: userData.githubAccessToken });

    const { data } = await octokit.repos.listForAuthenticatedUser({
      sort: 'updated',
      direction: 'desc',
      per_page: 100,
      visibility: 'all',
    });
    console.log(`[API /github/repos] Successfully fetched ${data.length} repos from GitHub.`);

    const repos = data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name, 
      url: repo.clone_url,      
      private: repo.private,    
      updated_at: repo.updated_at,
    }));

    console.log('[API /github/repos] Sending response.');
    return NextResponse.json(repos);

  } catch (error) {
    console.error('[API /github/repos] CATCH BLOCK: An error occurred.', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch repositories';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
