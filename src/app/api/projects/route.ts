// src/app/api/projects/route.ts
import { NextResponse } from 'next/server';
import { listContainers } from '@/lib/yandex';

export const dynamic = 'force-dynamic'; // Не кешировать!

export async function GET() {
  try {
    const folderId = process.env.YC_FOLDER_ID;
    if (!folderId) {
      return NextResponse.json({ error: 'YC_FOLDER_ID not set' }, { status: 500 });
    }

    const data = await listContainers(folderId);
    
    // Превращаем формат Яндекса в наш формат Project
    const projects = (data.containers || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      status: c.status === 'ACTIVE' ? 'Активен' : 'Ошибка', // Упрощаем
      repoUrl: '', // Яндекс не знает про GitHub URL, увы
      lastDeployed: c.createdAt,
      targetImage: '',
      domain: c.url, // ВОТ ОНА, ВАША ССЫЛКА!
    }));

    // Фильтруем сам Дашборд из списка (чтобы не показывать его самого)
    const filteredProjects = projects.filter((p: any) => !p.name.includes('ruvercel-frontend'));

    return NextResponse.json(filteredProjects);
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}