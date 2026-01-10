export type ProjectStatus = 'Активен' | 'Сборка' | 'Ошибка' | 'Live' | 'Building' | 'Error';

export interface ProjectEnvVar {
  key: string;
  value: string;
}

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  repoUrl: string;
  lastDeployed: string; // Теперь обязательно (мы его инициализируем при создании)
  targetImage: string; // Yandex Container Registry
  domain: string;
  owner: string; // email пользователя-владельца
  ownerLogin?: string | null; // ⭐ ИСПРАВЛЕНО: добавили | null, так как база может вернуть null
  isPublic: boolean;
  autodeploy?: boolean; // Опционально, так как в старых проектах может не быть
  envVars?: ProjectEnvVar[]; 
  buildErrors?: string[]; 
  missingEnvVars?: string[]; 
  deploymentLogs?: string; 
  gitToken?: string; 
  createdAt: string;
  updatedAt: string;
}