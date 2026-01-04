import { NextResponse } from 'next/server';
import { listContainers } from '@/lib/yandex';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route"; // <--- ИМПОРТИРУЕМ ОПЦИИ

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const folderId = process.env.YC_FOLDER_ID;
    if (!folderId) {
      return NextResponse.json({ error: 'YC_FOLDER_ID not set' }, { status: 500 });
    }

    const session = await getServerSession(authOptions);
    const currentUser = session?.user?.name;

    // Если нужна строгая проверка авторизации:
    // if (!currentUser) return NextResponse.json([]);

    const data = await listContainers(folderId);
    
    const myProjects = (data.containers || [])
      .filter((c: any) => {
         if (!c.labels) return false;
         // Проверяем, совпадает ли owner
         return c.labels.owner === currentUser;
      })
      .map((c: any) => ({
        id: c.id,
        name: c.name,
        status: c.status === 'ACTIVE' ? 'Активен' : 'Ошибка',
        repoUrl: '',
        lastDeployed: c.createdAt,
        targetImage: '',
        domain: c.url,
      }));

    return NextResponse.json(myProjects);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}