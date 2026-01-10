import { NextResponse } from 'next/server';
import { db, adminAuth } from "@/lib/firebase-admin";
import { listContainers } from '@/lib/yandex';

// Хелпер для получения статуса
async function getContainerStatus(projectName: string) {
  try {
    const folderId = process.env.YC_FOLDER_ID;
    if (!folderId) return null;

    const data = await listContainers(folderId);
    // @ts-ignore
    const container = data.containers?.find((c: any) => c.name === projectName);
    
    if (container) {
       if (container.status === 'ACTIVE') return 'Активен';
       if (container.status === 'ERROR' || container.status === 'STOPPED') return 'Ошибка';
    }
    return null;
  } catch (e) {
    console.error('Failed to fetch Yandex status:', e);
    return null;
  }
}

export async function GET(
  request: Request,
  // В Next.js 15 params нужно ждать, поэтому типизируем как Promise
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!db || !Object.keys(db).length) {
      return NextResponse.json({ error: "Firebase connection not initialized" }, { status: 500 });
    }
    const params = await context.params; // Ждем параметры!
    const id = params.id;

    const projectRef = db.ref(`projects/${id}`);
    const snapshot = await projectRef.once('value');
    let project = snapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // ⭐ ПОЛУЧАЕМ РЕАЛЬНЫЙ СТАТУС ИЗ YANDEX
    const realStatus = await getContainerStatus(project.name);
    
    // Если статус в Яндексе отличается от базы — обновляем объект (и базу для порядка)
    if (realStatus && realStatus !== project.status) {
        project.status = realStatus;
        // Фоново обновляем базу, не блокируя ответ
        projectRef.update({ status: realStatus }).catch(console.error);
    }

    return NextResponse.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!db || !Object.keys(db).length) {
      return NextResponse.json({ error: "Firebase connection not initialized" }, { status: 500 });
    }
    const params = await context.params;
    const { id } = params;
    
    // Удаляем из базы
    await db.ref(`projects/${id}`).remove();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!db || !Object.keys(db).length) {
      return NextResponse.json({ error: "Firebase connection not initialized" }, { status: 500 });
    }
    const params = await context.params;
    const { id } = params;
    const body = await request.json();

    const projectRef = db.ref(`projects/${id}`);
    await projectRef.update(body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
