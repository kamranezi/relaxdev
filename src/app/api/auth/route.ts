import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase-admin';

interface UserData {
  email: string;
  name: string;
  image: string;
  provider: string;
  updatedAt: string;
  githubAccessToken?: string;
  createdAt?: string;
  role?: string;
}

export async function POST(req: NextRequest) {
  const { idToken, provider, accessToken } = await req.json();

  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const user = await adminAuth.getUser(uid);

    const userRef = db.ref(`users/${uid}`);
    const snapshot = await userRef.once('value');
    const userData: UserData = {
      email: user.email || '',
      name: user.displayName || '',
      image: user.photoURL || '',
      provider: provider,
      updatedAt: new Date().toISOString(),
    };

    if (provider === 'github' && accessToken) {
      userData.githubAccessToken = accessToken;
    }

    if (!snapshot.exists()) {
      userData.createdAt = new Date().toISOString();
      userData.role = user.email === 'alexrus1144@gmail.com' ? 'admin' : 'user';
      await userRef.set(userData);
    } else {
      await userRef.update(userData);
    }

    return NextResponse.json({ uid: user.uid, email: user.email, name: user.displayName });
  } catch (error) {
    console.error('Firebase auth error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
