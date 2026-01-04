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
  },
};

export const getTranslation = (lang: Language) => translations[lang];
