import { NextResponse } from 'next/server';
import { listContainers } from '@/lib/yandex';
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { db } from "@/lib/firebase";
import { Project } from '@/types';

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
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentUserEmail = session.user.email;
    const currentUserLogin = session.user.login || currentUserEmail.split('@')[0];
    
    // Проверяем, является ли пользователь админом
    const userRef = db.ref(`users/${currentUserEmail.replace(/\./g, '_')}`);
    const userSnapshot = await userRef.once('value');
    const userData = userSnapshot.val();
    const isAdmin = userData?.role === 'admin' || currentUserEmail === 'alexrus1144@gmail.com';

    // Получаем проекты из Firebase
    const projectsRef = db.ref('projects');
    const projectsSnapshot = await projectsRef.once('value');
    const allProjects = projectsSnapshot.val() || {};

    // Получаем актуальные статусы из Yandex
    const folderId = process.env.YC_FOLDER_ID;
    const containersMap: Record<string, YandexContainer> = {};
    
    if (folderId) {
      try {
        const containersData = await listContainers(folderId);
        const containers = (containersData.containers || []) as YandexContainer[];
        containers.forEach((c: YandexContainer) => {
          containersMap[c.name] = c;
        });
      } catch (error) {
        console.error('Ошибка получения контейнеров из Yandex:', error);
      }
    }

    // Фильтруем проекты в зависимости от роли
    const projects: Project[] = (Object.entries(allProjects) as [string, Project][])
      .filter(([_, project]: [string, Project]) => {
        if (isAdmin) {
          // Админ видит все проекты
          return true;
        }
        // Обычный пользователь видит только свои проекты
        return project.owner === currentUserEmail || 
               project.ownerLogin === currentUserLogin;
      })
      .map(([key, project]: [string, Project]) => {
        const container = containersMap[key];
        
        // Определяем статус на основе данных из Yandex и Firebase
        let status = project.status || 'Сборка';
        if (container) {
          if (container.status === 'ACTIVE') {
            status = 'Активен';
          } else if (container.status === 'ERROR' || container.status === 'STOPPED') {
            status = 'Ошибка';
          }
        }

        return {
          id: project.id || key,
          name: project.name || key,
          status: status,
          repoUrl: project.repoUrl || '',
          lastDeployed: project.lastDeployed || project.updatedAt || project.createdAt || '',
          targetImage: project.targetImage || '',
          domain: container?.url || project.domain || '',
          owner: project.owner || '',
          ownerLogin: project.ownerLogin || '',
          envVars: project.envVars || [],
          buildErrors: project.buildErrors || [],
          missingEnvVars: project.missingEnvVars || [],
          deploymentLogs: project.deploymentLogs || '',
          createdAt: project.createdAt || '',
          updatedAt: project.updatedAt || '',
        } as Project;
      })
      .sort((a, b) => {
        // Сортируем по дате последнего деплоя (новые сверху)
        return new Date(b.lastDeployed || b.updatedAt || 0).getTime() - 
               new Date(a.lastDeployed || a.updatedAt || 0).getTime();
      });

    return NextResponse.json(projects);

  } catch (error) {
    console.error('API Error:', error);
    const message = error instanceof Error ? error.message : 'Failed to list projects';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
