import { NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  // Проверка на инициализацию Firebase Admin
  if (!adminAuth || !db) {
    console.error('[API /auth] Firebase Admin SDK not initialized');
    return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
  }

  try {
    const body = await request.json();
    const { idToken, provider, accessToken } = body;
    
    console.log('[API /auth] Received request. Verifying token...');

    if (!idToken) {
        console.error('[API /auth] Error: ID token is missing.');
        return NextResponse.json({ error: 'ID token is required.' }, { status: 400 });
    }

    // Верификация токена и получение данных пользователя
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email || '';
    const name = decodedToken.name || '';
    const picture = decodedToken.picture || '';

    console.log(`[API /auth] Token verified for UID: ${uid}, Email: ${email}`);

    const userRef = db.ref(`users/${uid}`);

    // Атомарное обновление данных пользователя
    await userRef.update({
      uid,
      email,
      name,
      picture,
      lastLogin: new Date().toISOString(),
      // Сохраняем токен доступа только если провайдер - GitHub
      ...(provider === 'github.com' && accessToken && { githubAccessToken: accessToken }),
    });

    console.log(`[API /auth] User data saved/updated successfully for UID: ${uid}`);

    return NextResponse.json({ status: 'success', uid });

  } catch (error: any) {
    console.error('[API /auth] An error occurred:', error);
    if (error.code === 'auth/id-token-expired') {
      return NextResponse.json({ error: 'Firebase ID token has expired. Please re-authenticate.' }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
