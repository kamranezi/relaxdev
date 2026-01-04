import { NextResponse } from 'next/server';
import { listContainers } from '@/lib/yandex';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // <--- ИМПОРТИРУЕМ ОПЦИИ

export const dynamic = 'force-dynamic';

// Определяем тип для объекта контейнера от Yandex
interface YandexContainer {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  url: string; // domain
  labels: { [key: string]: string };
}

export async function GET() {
  try {
    const folderId = process.env.YC_FOLDER_ID;
    if (!folderId) {
      return NextResponse.json({ error: 'YC_FOLDER_ID not set' }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    // Используем login, так как он более надежен
    const currentUser = session?.user?.login;

    const data = await listContainers(folderId);
    
    // Применяем строгую типизацию
    const myProjects = (data.containers || [])
      .filter((c: YandexContainer) => {
         // Проверяем, совпадает ли владелец проекта с текущим пользователем
         return c.labels?.owner === currentUser;
      })
      .map((c: YandexContainer) => ({
        id: c.id,
        name: c.name,
        status: c.status === 'ACTIVE' ? 'Активен' : 'Ошибка',
        repoUrl: c.labels?.repoUrl || '',
        lastDeployed: c.createdAt,
        targetImage: '' /* Это поле больше не нужно, так как мы получаем его из API */, 
        domain: c.url,
      }));

    return NextResponse.json(myProjects);

  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to list projects';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
