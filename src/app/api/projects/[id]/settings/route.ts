import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase-admin';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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
    const userEmail = decodedToken.email?.toLowerCase();

    // 1. ⭐ СНАЧАЛА читаем тело запроса
    const body = await request.json();

    // 2. Проверяем права Админа (в users/{uid})
    const userRef = db.ref(`users/${decodedToken.uid}`);
    const userSnapshot = await userRef.once('value');
    const isAdmin = userSnapshot.val()?.isAdmin === true;

    // 3. Проверяем проект
    const projectRef = db.ref(`projects/${projectId}`);
    const snapshot = await projectRef.once('value');
    const project = snapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const projectOwner = project.owner ? project.owner.toLowerCase() : '';

    // 4. Проверяем доступ (Владелец или Админ)
    if (projectOwner !== userEmail && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Формируем обновления
    const updates: any = {
      updatedAt: new Date().toISOString(),
    };

    if (typeof body.autodeploy === 'boolean') {
        updates.autodeploy = body.autodeploy;
    }
    
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