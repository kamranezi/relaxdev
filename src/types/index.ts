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
  lastDeployed: string;
  targetImage: string; // Yandex Container Registry
  domain: string;
  owner: string; // email пользователя-владельца
  ownerLogin?: string; // login пользователя (для GitHub)
  isPublic: boolean;
  autodeploy?: boolean; // <-- Добавлено поле
  envVars?: ProjectEnvVar[]; // переменные окружения
  buildErrors?: string[]; // ошибки сборки
  missingEnvVars?: string[]; // отсутствующие переменные окружения
  deploymentLogs?: string; // логи деплоя
  gitToken?: string; // токен для доступа к приватному репозиторию (опционально)
  createdAt: string;
  updatedAt: string;
}