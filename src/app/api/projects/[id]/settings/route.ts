import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from '@/lib/firebase-admin';

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Проверяем инициализацию Firebase
    if (!db || !adminAuth) {
      return NextResponse.json({ error: 'Firebase not initialized' }, { status: 500 });
    }

    const params = await context.params;
    const projectId = params.id;

    // 2. Проверяем авторизацию
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    const userEmail = decodedToken.email;

    // 3. Получаем данные (autodeploy)
    const body = await request.json();
    const { autodeploy } = body;

    // 4. Проверяем права доступа в Realtime Database
    const projectRef = db.ref(`projects/${projectId}`);
    const snapshot = await projectRef.once('value');
    const project = snapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Проверка: владелец ли это?
    if (project.owner !== userEmail) {
      // Можно добавить проверку на админа, если нужно
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // 5. Обновляем настройку
    await projectRef.update({
      autodeploy: autodeploy === true,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, autodeploy });

  } catch (error: any) {
    console.error('Settings update error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}