export type ProjectStatus = 'Активен' | 'Сборка' | 'Ошибка' | 'Live' | 'Building' | 'Error';

export interface Project {
  id: string;
  name: string;
  status: ProjectStatus;
  repoUrl: string;
  lastDeployed: string;
  targetImage: string; // Yandex Container Registry
  domain: string;
}

