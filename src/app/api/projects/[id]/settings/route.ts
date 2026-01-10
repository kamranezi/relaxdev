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

    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userEmail = decodedToken.email;

    // Получаем тело запроса
    const body = await request.json();
    
    // Проверяем проект
    const projectRef = db.ref(`projects/${projectId}`);
    const snapshot = await projectRef.once('value');
    const project = snapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Проверяем права
    const adminRef = db.ref(`admins/${decodedToken.uid}`);
    const adminSnapshot = await adminRef.once('value');
    const isAdmin = adminSnapshot.val() === true;

    if (project.owner !== userEmail && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Формируем обновления
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    // Если прислали autodeploy - обновляем его
    if (typeof body.autodeploy === 'boolean') {
        updates.autodeploy = body.autodeploy;
    }
    
    // Если прислали isPublic - обновляем его
    if (typeof body.isPublic === 'boolean') {
        updates.isPublic = body.isPublic;
    }

    await projectRef.update(updates);

    return NextResponse.json({ success: true, updates });

  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}