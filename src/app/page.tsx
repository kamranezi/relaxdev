'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn, signOut } from "next-auth/react"; // <--- Импорт Auth
import { Project } from '@/types';
import { getTranslation, Language } from '@/lib/i18n';
import { ProjectCard } from '@/components/ProjectCard';
import { AddProjectModal } from '@/components/AddProjectModal';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Plus, Bell, Layers, RefreshCw } from 'lucide-react';

export default function Home() {
  const { data: session } = useSession(); // <--- Получаем данные сессии
  const [language, setLanguage] = useState<Language>('ru');
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const t = getTranslation(language);

  // Функция загрузки данных из нашего API (который ходит в Яндекс)
  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/projects');
      if (res.ok) {
        const data = await res.json();
        // Сортируем: новые (по дате создания) сверху
        const sortedData = Array.isArray(data) 
          ? data.sort((a: any, b: any) => new Date(b.lastDeployed).getTime() - new Date(a.lastDeployed).getTime())
          : [];
        setProjects(sortedData);
      }
    } catch (e) {
      console.error('Ошибка загрузки проектов:', e);
    } finally {
      setIsLoading(false);
    }
  };

  // 1. ЗАГРУЗКА: При открытии страницы + авто-обновление каждые 10 сек
  useEffect(() => {
    fetchProjects();

    const interval = setInterval(fetchProjects, 10000); // 10 секунд
    return () => clearInterval(interval);
  }, []);

  const formatTimeAgo = (timeStr: string): string => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return language === 'ru' ? 'Только что' : 'Just now';
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return language === 'ru' 
        ? t.timeAgo.minutesAgo(diffInMinutes) 
        : `${diffInMinutes} min ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return language === 'ru' 
        ? `${diffInHours} ч. назад` 
        : `${diffInHours} hours ago`;
    }

    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US');
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
      
      // Добавляем проект в список "оптимистично"
      const localizedProject: Project = {
        ...newProject,
        status: language === 'ru' ? 'Сборка' : 'Building',
        lastDeployed: new Date().toISOString(),
      };

      setProjects((prev) => [localizedProject, ...prev]);
    } catch (error) {
      console.error('Deploy error:', error);
      throw error;
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0A0A0A] text-gray-300 font-sans">
      <header className="flex items-center justify-between p-4 md:p-6 border-b border-gray-800">
        <div className="flex items-center space-x-3 md:space-x-4">
          <Layers className="h-8 w-8 text-white" />
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
            Relax Dev
          </h1>
        </div>
        <div className="flex items-center space-x-2 md:space-x-4">
          <LanguageToggle language={language} onLanguageChange={setLanguage} />
          <button className="text-gray-400 hover:text-white transition-colors p-2">
            <Bell className="h-5 w-5 md:h-6 md:w-6" />
          </button>
          
          {/* СЕКЦИЯ АВТОРИЗАЦИИ */}
          {session ? (
            <div className="flex items-center gap-3 pl-2 border-l border-gray-800">
              <div className="text-right hidden sm:block">
                <div className="text-sm text-white font-medium">{session.user?.name}</div>
                <div className="text-xs text-gray-500">{session.user?.email}</div>
              </div>
              {session.user?.image && (
                <img 
                  src={session.user.image} 
                  alt="Avatar" 
                  className="h-8 w-8 md:h-10 md:w-10 rounded-full border border-gray-700"
                />
              )}
              <Button 
                variant="ghost" 
                onClick={() => signOut()} 
                className="text-xs text-gray-400 hover:text-white px-2"
              >
                {language === 'ru' ? 'Выйти' : 'Sign Out'}
              </Button>
            </div>
          ) : (
            <Button onClick={() => signIn('github')} className="bg-white text-black hover:bg-gray-200 ml-2">
              {language === 'ru' ? 'Войти через GitHub' : 'Sign In with GitHub'}
            </Button>
          )}

        </div>
      </header>

      <main className="flex-1 p-4 md:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-white">
              {t.projects}
            </h2>
            {/* Кнопка ручного обновления */}
            <button 
              onClick={fetchProjects} 
              disabled={isLoading} 
              className="p-2 hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Обновить список"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-white text-black hover:bg-gray-200 transition-colors w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t.addProject}
          </Button>
        </div>

        {projects.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Layers className="h-16 w-16 text-gray-600 mb-4" />
            <h3 className="text-xl font-semibold text-gray-400 mb-2">
              {language === 'ru' ? 'Нет активных проектов' : 'No active projects'}
            </h3>
            <p className="text-gray-500 mb-6">
              {language === 'ru' 
                ? 'Ваш список контейнеров в Яндекс Облаке пуст.' 
                : 'Your Yandex Cloud container list is empty.'}
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