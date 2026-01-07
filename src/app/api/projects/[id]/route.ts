import { NextRequest, NextResponse } from 'next/server';
import { db, adminAuth } from "@/lib/firebase-admin";
import { listContainers } from '@/lib/yandex';

export const dynamic = 'force-dynamic';

interface YandexContainer {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  url: string; 
  labels: { [key: string]: string };
}

// GET - получить детальную информацию о проекте
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!db || !adminAuth) {
      console.error("Firebase Admin SDK not initialized");
      return NextResponse.json(
          { error: "Internal Server Error: Firebase not initialized." },
          { status: 500 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const user = await adminAuth.getUser(uid);
    const currentUserEmail = user.email!;

    const projectRef = db.ref(`projects/${params.id}`);
    const projectSnapshot = await projectRef.once('value');
    const project = projectSnapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.owner !== currentUserEmail && currentUserEmail !== 'alexrus1144@gmail.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const folderId = process.env.YC_FOLDER_ID;
    let containerUrl: string | undefined;
    if (folderId) {
      try {
        const containersData = await listContainers(folderId);
        const containers = (containersData.containers || []) as YandexContainer[];
        const container = containers.find(c => c.name === params.id);
        if (container && container.url) {
          containerUrl = container.url;
        }
      } catch (error) {
        console.error('Ошибка получения контейнеров из Yandex:', error);
      }
    }

    const responseProject = {
      ...project,
      domain: containerUrl || project.domain || '',
    };

    return NextResponse.json(responseProject);

  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - обновить проект (например, переменные окружения, статус)
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!db || !adminAuth) {
      console.error("Firebase Admin SDK not initialized");
      return NextResponse.json(
          { error: "Internal Server Error: Firebase not initialized." },
          { status: 500 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const user = await adminAuth.getUser(uid);
    const currentUserEmail = user.email!;

    const projectRef = db.ref(`projects/${params.id}`);
    const projectSnapshot = await projectRef.once('value');
    const project = projectSnapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.owner !== currentUserEmail && currentUserEmail !== 'alexrus1144@gmail.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updates: Record<string, unknown> = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    delete updates.owner;

    await projectRef.update(updates);

    const updatedProject = { ...project, ...updates };

    return NextResponse.json(updatedProject);

  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to update project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE - удалить проект
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const idToken = request.headers.get('Authorization')?.split('Bearer ')[1];
    if (!idToken) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!db || !adminAuth) {
      console.error("Firebase Admin SDK not initialized");
      return NextResponse.json(
          { error: "Internal Server Error: Firebase not initialized." },
          { status: 500 }
      );
    }

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const user = await adminAuth.getUser(uid);
    const currentUserEmail = user.email!;

    const projectRef = db.ref(`projects/${params.id}`);
    const projectSnapshot = await projectRef.once('value');
    const project = projectSnapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    if (project.owner !== currentUserEmail && currentUserEmail !== 'alexrus1144@gmail.com') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await projectRef.remove();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
