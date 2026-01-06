import { NextRequest, NextResponse } from 'next/server';
import { adminAuth, db } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { idToken, provider, accessToken } = body;

    if (!idToken || !provider) {
      return NextResponse.json({ error: 'Missing idToken or provider' }, { status: 400 });
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const user = await adminAuth.getUser(uid);

    const userRef = db.ref(`users/${uid}`);

    const updates: { [key: string]: any } = {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        lastLogin: new Date().toISOString(),
    };

    if (provider === 'github' && accessToken) {
        updates.githubAccessToken = accessToken;
    }

    const usersSnapshot = await db.ref('users').once('value');
    if (!usersSnapshot.exists()) {
      updates.role = 'admin';
    }

    await userRef.update(updates);

    return NextResponse.json({ success: true, uid });
  } catch (error) {
    console.error('Error during auth processing:', error);
    const message = error instanceof Error ? error.message : 'Internal Server Error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
