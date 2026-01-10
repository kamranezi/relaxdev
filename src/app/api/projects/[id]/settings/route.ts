import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase-admin';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> } // Promise важен для Next.js 15
) {
  try {
    if (!db || !adminAuth) {
      return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
    }

    const params = await context.params;
    const projectId = params.id;

    // Авторизация
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userEmail = decodedToken.email;

    const body = await request.json();
    const { autodeploy } = body;

    const projectRef = db.ref(`projects/${projectId}`);
    const snapshot = await projectRef.once('value');
    const project = snapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Проверка прав
    const adminRef = db.ref(`admins/${decodedToken.uid}`);
    const adminSnapshot = await adminRef.once('value');
    const isAdmin = adminSnapshot.val() === true;

    if (project.owner !== userEmail && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Обновление
    await projectRef.update({
      autodeploy: autodeploy === true,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, autodeploy });

  } catch (error: any) {
    console.error('Settings API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}