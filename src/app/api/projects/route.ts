import { NextResponse } from 'next/server';
import { listContainers } from '@/lib/yandex';
import { db, adminAuth } from "@/lib/firebase-admin";
import { Project } from '@/types';

export const dynamic = 'force-dynamic';

interface YandexContainer {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  url: string; 
  labels: { [key: string]: string };
}

export async function GET(req: Request) {
  try {
    if (!db || !adminAuth) {
      return NextResponse.json({ error: "Firebase not initialized" }, { status: 500 });
    }

    const idToken = req.headers.get('Authorization')?.split('Bearer ')[1];
    let currentUserEmail: string | null = null;
    let isAdmin = false;

    if (idToken) {
        try {
            const decodedToken = await adminAuth.verifyIdToken(idToken);
            const user = await adminAuth.getUser(decodedToken.uid);
            currentUserEmail = user.email!;
            const adminRef = db.ref(`admins/${decodedToken.uid}`);
            const snapshot = await adminRef.once('value');
            isAdmin = snapshot.val() === true;
        } catch (e) {
            console.warn("Auth warning:", e);
        }
    }

    const projectsRef = db.ref('projects');
    const projectsSnapshot = await projectsRef.once('value');
    const allProjects = projectsSnapshot.val() || {};

    // Получаем контейнеры из Яндекса
    const folderId = process.env.YC_FOLDER_ID;
    const containersMap: Record<string, YandexContainer> = {};
    
    if (folderId) {
      try {
        const containersData = await listContainers(folderId);
        // @ts-ignore
        const containers = (containersData.containers || []) as YandexContainer[];
        containers.forEach((c: YandexContainer) => {
          containersMap[c.name] = c;
        });
      } catch (error) {
        console.error('Yandex Error:', error);
      }
    }

    const projects: Project[] = (Object.entries(allProjects) as [string, any][])
      .filter(([key, project]) => {
        if (isAdmin) return true;
        if (currentUserEmail) {
          return project.owner === currentUserEmail || project.isPublic === true;
        }
        return project.isPublic === true;
      })
      .map(([key, project]) => {
        // Ищем контейнер по ID проекта (safeName) или по ключу
        const containerName = project.id || key;
        const container = containersMap[containerName];
        
        // Базовый статус из БД (например, "Сборка" или "Ошибка" от билдера)
        let status = project.status || 'Сборка';

        // Если есть контейнер в Яндексе, его статус приоритетнее,
        // НО только если он Активен или упал.
        // Если контейнера нет, верим базе (там может быть "Ошибка" сборки).
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
          lastDeployed: project.lastDeployed || project.updatedAt || '',
          targetImage: project.targetImage || '',
          domain: container?.url || project.domain || '',
          owner: project.owner || '',
          ownerLogin: project.ownerLogin || null,
          isPublic: project.isPublic || false,
          autodeploy: project.autodeploy !== false,
          envVars: project.envVars || [],
          buildErrors: project.buildErrors || [],
          missingEnvVars: project.missingEnvVars || [],
          deploymentLogs: project.deploymentLogs || '',
          createdAt: project.createdAt || '',
          updatedAt: project.updatedAt || '',
        } as Project;
      })
      .sort((a, b) => {
        return new Date(b.lastDeployed || 0).getTime() - 
               new Date(a.lastDeployed || 0).getTime();
      });

    return NextResponse.json(projects);

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}