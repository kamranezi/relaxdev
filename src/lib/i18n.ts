export type Language = 'ru' | 'en';

export const translations = {
  ru: {
    projects: 'Проекты',
    addProject: 'Добавить проект',
    importProject: 'Импортировать проект',
    deploy: 'Деплой',
    githubUrl: 'Ссылка на GitHub',
    projectName: 'Название проекта',
    lastDeployed: 'Последний деплой',
    status: {
      active: 'Активен',
      building: 'Сборка',
      error: 'Ошибка',
      live: 'Активен',
    },
    timeAgo: {
      justNow: 'Только что',
      minutesAgo: (n: number) => `${n} ${n === 1 ? 'минуту' : n < 5 ? 'минуты' : 'минут'} назад`,
      hoursAgo: (n: number) => `${n} ${n === 1 ? 'час' : n < 5 ? 'часа' : 'часов'} назад`,
      daysAgo: (n: number) => `${n} ${n === 1 ? 'день' : n < 5 ? 'дня' : 'дней'} назад`,
    },
    signin: 'Войти через GitHub',
    signout: 'Выйти',
    noProjectsTitle: 'Нет активных проектов',
    noProjectsDescription: 'Ваш список контейнеров в Яндекс Облаке пуст.',
    overview: 'Обзор',
    settings: 'Настройки',
    envVars: 'Переменные и секреты',
    logs: 'Логи',
    owner: 'Владелец',
    domain: 'Домен',
    repoUrl: 'Репозиторий',
    created: 'Создан',
    buildErrors: 'Ошибки сборки',
    missingEnvVars: 'Отсутствующие переменные среды',
    addEnvVar: 'Добавить переменную',
    add: 'Добавить',
    noEnvVars: 'Переменные среды не найдены.',
    noLogs: 'Логи деплоя отсутствуют.',
    deleteConfirmation: 'Вы уверены, что хотите удалить этот проект?',
    redeploy: 'Редеплой',
    delete: 'Удалить',
    back: 'Назад',
    projectNotFound: 'Проект не найден',
    backToHome: 'Вернуться на главную',
    redeployError: 'Ошибка редеплоя',
    deleteError: 'Ошибка удаления проекта',
    saveVarError: 'Ошибка сохранения переменной',
    deleteVarError: 'Ошибка удаления переменной',
    copyError: 'Ошибка копирования',
    
    // Кнопки для моб версии
    buildShort: 'Билд', 
    deleteShort: 'Удал.',

    // Настройки
    autodeploy: 'Автодеплой (Push-to-Deploy)',
    autodeployDescription: 'Автоматически запускать сборку при пуше в основную ветку.',
    autodeploySuccess: 'Настройки автодеплоя обновлены.',
    autodeployError: 'Ошибка обновления настроек автодеплоя.',
    publicProject: 'Публичный проект',
    publicProjectDescription: 'Разрешить всем пользователям в Интернете просматривать этот проект.',

    // --- НОВЫЕ КЛЮЧИ ДЛЯ ENV MANAGER ---
    envListMode: 'Список',
    envRawMode: 'Редактор (.env)',
    uploadEnv: 'Загрузить .env',
    saveChanges: 'Сохранить',
    copy: 'Копировать',
    // ---------------------------------

    warnings: {
        title: 'Проблемы со сборкой'
    },
  },
  en: {
    projects: 'Projects',
    addProject: 'Add Project',
    importProject: 'Import Project',
    deploy: 'Deploy',
    githubUrl: 'GitHub Repository URL',
    projectName: 'Project Name',
    lastDeployed: 'Last Deployed',
    status: {
      active: 'Live',
      building: 'Building',
      error: 'Error',
      live: 'Live',
    },
    timeAgo: {
        justNow: 'Just now',
        minutesAgo: (n: number) => `${n} min${n === 1 ? '' : 's'} ago`,
        hoursAgo: (n: number) => `${n} hour${n === 1 ? '' : 's'} ago`,
        daysAgo: (n: number) => `${n} day${n === 1 ? '' : 's'} ago`,
    },
    signin: 'Sign In with GitHub',
    signout: 'Sign Out',
    noProjectsTitle: 'No active projects',
    noProjectsDescription: 'Your Yandex Cloud container list is empty.',
    overview: 'Overview',
    settings: 'Settings',
    envVars: 'Environment Variables',
    logs: 'Logs',
    owner: 'Owner',
    domain: 'Domain',
    repoUrl: 'Repository',
    created: 'Created',
    buildErrors: 'Build Errors',
    missingEnvVars: 'Missing Environment Variables',
    addEnvVar: 'Add Variable',
    add: 'Add',
    noEnvVars: 'No environment variables found.',
    noLogs: 'No deployment logs available.',
    deleteConfirmation: 'Are you sure you want to delete this project?',
    redeploy: 'Redeploy',
    delete: 'Delete',
    back: 'Back',
    projectNotFound: 'Project not found',
    backToHome: 'Back to Home',
    redeployError: 'Redeploy Error',
    deleteError: 'Error deleting project',
    saveVarError: 'Error saving variable',
    deleteVarError: 'Error deleting variable',
    copyError: 'Copy Error',
    
    // Mobile buttons
    buildShort: 'Build',
    deleteShort: 'Del',

    // Settings
    autodeploy: 'Autodeploy (Push-to-Deploy)',
    autodeployDescription: 'Automatically trigger a new build on push to the main branch.',
    autodeploySuccess: 'Autodeploy settings updated.',
    autodeployError: 'Error updating autodeploy settings.',
    publicProject: 'Public Project',
    publicProjectDescription: 'Allow anyone on the internet to view this project.',

    // --- NEW KEYS FOR ENV MANAGER ---
    envListMode: 'List',
    envRawMode: 'Editor (.env)',
    uploadEnv: 'Upload .env',
    saveChanges: 'Save Changes',
    copy: 'Copy',
    // ---------------------------------

    warnings: {
        title: 'Build warnings'
    },
  },
};

export const getTranslation = (lang: Language) => translations[lang];