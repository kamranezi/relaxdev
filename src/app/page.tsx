'use client';

import { useState, useEffect } from 'react';
import { Project } from '@/types';
import { getTranslation, Language } from '@/lib/i18n';
import { ProjectCard } from '@/components/ProjectCard';
import { AddProjectModal } from '@/components/AddProjectModal';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Plus, Bell, Layers } from 'lucide-react';

export default function Home() {
  const [language, setLanguage] = useState<Language>('ru');
  const [isMounted, setIsMounted] = useState(false); // Нужно для корректной работы с LocalStorage
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const t = getTranslation(language);

  // 1. ЗАГРУЗКА: При открытии страницы пытаемся достать данные из памяти
  useEffect(() => {
    setIsMounted(true);
    const savedProjects = localStorage.getItem('ruvercel-projects');
    if (savedProjects) {
      try {
        setProjects(JSON.parse(savedProjects));
      } catch (e) {
        console.error('Ошибка чтения LocalStorage', e);
      }
    } else {
      // Демо-данные, если память пуста
      setProjects([
        {
          id: 'proj_1',
          name: 'Demo Shop',
          status: 'Активен',
          repoUrl: 'https://github.com/vercel/next-learn',
          lastDeployed: '10 минут назад',
          targetImage: 'cr.yandex/demo',
          domain: 'demo.ruvercel.app',
        }
      ]);
    }
  }, []);

  // 2. СОХРАНЕНИЕ: При любом изменении списка сохраняем его в память
  useEffect(() => {
    if (isMounted) {
      localStorage.setItem('ruvercel-projects', JSON.stringify(projects));
    }
  }, [projects, isMounted]);

  const formatTimeAgo = (timeStr: string): string => {
    if (timeStr.includes('назад') || timeStr.includes('ago')) return timeStr;
    const minutesMatch = timeStr.match(/(\d+)\s*(minute|минут)/i);
    if (minutesMatch) {
      const n = parseInt(minutesMatch[1]);
      return language === 'ru' ? t.timeAgo.minutesAgo(n) : `${n} ${n === 1 ? 'minute' : 'minutes'} ago`;
    }
    return timeStr;
  };

  const handleDeploy = async (gitUrl: string, projectName: string, gitToken?: string) => {
    try {
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gitUrl, projectName, gitToken }),
      });

      if (!response.ok) throw new Error('Deployment failed');

      const newProject = await response.json();
      
      const localizedProject: Project = {
        ...newProject,
        status: language === 'ru' ? 'Сборка' : 'Building',
        lastDeployed: language === 'ru' ? 'Только что' : 'Just now',
      };

      // Добавляем новый проект в начало списка
      setProjects((prev) => [localizedProject, ...prev]);
      
      console.log('Новый проект добавлен:', newProject);
    } catch (error) {
      console.error('Deploy error:', error);
      throw error;
    }
  };

  // Пока не загрузились данные из браузера, не показываем контент (чтобы не прыгало)
  if (!isMounted) {
    return <div className="min-h-screen bg-[#0A0A0A]" />;
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-gray-300 font-sans">
      <header className="flex items-center justify-between p-4 md:p-6 border-b border-gray-800">
        <div className="flex items-center space-x-3 md:space-x-4">
          <Layers className="h-8 w-8 text-white" />
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
            RuVercel
          </h1>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <LanguageToggle language={language} onLanguageChange={setLanguage} />
          <button className="text-gray-400 hover:text-white transition-colors p-2">
            <Bell className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          <div className="h-8 w-8 md:h-10 md:w-10 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500"></div>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
          <h2 className="text-2xl md:text-3xl font-bold text-white">
            {t.projects}
          </h2>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-black hover:bg-gray-200 transition-colors w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.addProject}
          </Button>
        </div>

        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Layers className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {language === 'ru' ? 'Нет проектов' : 'No projects'}
            </h3>
            <p className="text-gray-500 mb-6">
              {language === 'ru' ? 'Начните с добавления проекта' : 'Start by adding your first project'}
            </p>
            <Button onClick={() => setIsModalOpen(true)} className="bg-white text-black hover:bg-gray-200">
              <Plus className="h-4 w-4 mr-2" />
              {t.addProject}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={{
                  ...project,
                  lastDeployed: formatTimeAgo(project.lastDeployed),
                }}
                language={language}
              />
            ))}
          </div>
        )}
      </main>

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDeploy={handleDeploy}
        language={language}
      />
    </div>
  );
}