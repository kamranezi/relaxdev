export type ProjectStatus = 'Активен' | 'Сборка' | 'Ошибка' | 'Live' | 'Building' | 'Error';

export interface ProjectEnvVar {
  key: string;
  value: string;
}

// ⭐ НОВЫЙ ИНТЕРФЕЙС ДЛЯ ИСТОРИИ ДЕПЛОЕВ
export interface Deployment {
  id: string;
  image: string;
  createdAt: string;
  status: string;
  initiator?: string; // Например: 'Builder' или 'User'
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  repoUrl: string;
  lastDeployed: string;
  targetImage: string;
  domain: string;
  owner: string;
  ownerLogin?: string | null;
  isPublic: boolean;
  autodeploy?: boolean;
  webhookId?: number | null; // ⭐ Добавили ID вебхука
  
  envVars?: ProjectEnvVar[];
  buildErrors?: string[];
  missingEnvVars?: string[];
  deploymentLogs?: string;
  gitToken?: string;
  
  createdAt: string;
  updatedAt: string;
  buildStartedAt?: number; // ⭐ Добавили время старта билда (для таймаутов)
  canEdit?: boolean;

  // ⭐ НОВЫЕ ПОЛЯ ДЛЯ ИСТОРИИ И ОТКАТОВ
  currentImage?: string; // Текущий активный образ
  deployments?: Record<string, Deployment>; // История (ключ = ID деплоя)
}