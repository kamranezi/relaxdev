import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { db } from "@/lib/firebase";
import { Octokit } from '@octokit/rest';

const octokit = new Octokit({
  auth: process.env.GITHUB_ACCESS_TOKEN,
});

export const dynamic = 'force-dynamic';

// GET - получить детальную информацию о проекте
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserEmail = session.user.email;
    const currentUserLogin = session.user.login || currentUserEmail.split('@')[0];
    
    // Проверяем роль пользователя
    const userRef = db.ref(`users/${currentUserEmail.replace(/\./g, '_')}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();
    const isAdmin = userData?.role === 'admin' || currentUserEmail === 'alexrus1144@gmail.com';

    // Получаем проект из Firebase
    const projectRef = db.ref(`projects/${params.id}`);
    const projectSnapshot = await projectRef.once('value');
    const project = projectSnapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Проверяем права доступа
    if (!isAdmin && project.owner !== currentUserEmail && project.ownerLogin !== currentUserLogin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(project);

  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to get project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT - обновить проект (например, переменные окружения, статус)
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserEmail = session.user.email;
    const currentUserLogin = session.user.login || currentUserEmail.split('@')[0];
    
    // Проверяем роль пользователя
    const userRef = db.ref(`users/${currentUserEmail.replace(/\./g, '_')}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();
    const isAdmin = userData?.role === 'admin' || currentUserEmail === 'alexrus1144@gmail.com';

    const projectRef = db.ref(`projects/${params.id}`);
    const projectSnapshot = await projectRef.once('value');
    const project = projectSnapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Проверяем права доступа
    if (!isAdmin && project.owner !== currentUserEmail && project.ownerLogin !== currentUserLogin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const updates: any = {
      ...body,
      updatedAt: new Date().toISOString(),
    };

    // Не позволяем менять owner и ownerLogin
    delete updates.owner;
    delete updates.ownerLogin;

    await projectRef.update(updates);

    // Обновляем локальный объект проекта
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
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserEmail = session.user.email;
    const currentUserLogin = session.user.login || currentUserEmail.split('@')[0];
    
    // Проверяем роль пользователя
    const userRef = db.ref(`users/${currentUserEmail.replace(/\./g, '_')}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();
    const isAdmin = userData?.role === 'admin' || currentUserEmail === 'alexrus1144@gmail.com';

    const projectRef = db.ref(`projects/${params.id}`);
    const projectSnapshot = await projectRef.once('value');
    const project = projectSnapshot.val();

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    // Проверяем права доступа
    if (!isAdmin && project.owner !== currentUserEmail && project.ownerLogin !== currentUserLogin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Удаляем проект из Firebase
    await projectRef.remove();

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to delete project';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

