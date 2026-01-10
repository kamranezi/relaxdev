'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { Project } from '@/types';
import { getTranslation } from '@/lib/i18n';
import { ProjectCard } from '@/components/ProjectCard';
import { AddProjectModal } from '@/components/AddProjectModal';
import { Button } from '@/components/ui/button';
import { Plus, Layers, RefreshCw } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" {...props}>
    <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
  </svg>
);

export default function Home() {
  const { user, loading: authLoading, signInWithGitHub, signOut } = useAuth();
  const { language } = useLanguage(); 
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  // Реф для хранения предыдущего состояния проектов (чтобы сравнивать статусы)
  const prevProjectsRef = useRef<Project[]>([]);

  const t = getTranslation(language);
  
  const handleAddProjectClick = () => {
    if (user) {
      setIsModalOpen(true);
    } else {
      signInWithGitHub();
    }
  };

  // Запрос разрешения на уведомления
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'default') {
        Notification.requestPermission();
      }
    }
  }, []);

  const fetchProjects = useCallback(async (isAutoRefresh = false) => {
    // При авто-обновлении не включаем спиннер на весь экран
    if (!isAutoRefresh) setIsLoading(true);
    
    try {
        const token = user ? await user.getIdToken() : '';
        const headers: HeadersInit = token ? { 'Authorization': `Bearer ${token}` } : {};
        const res = await fetch('/api/projects', { headers });

      if (res.ok) {
        const apiProjects = await res.json();
        const validApiProjects = Array.isArray(apiProjects) ? apiProjects : [];

        // Сортировка
        const sortedProjects = validApiProjects.sort((a: Project, b: Project) => 
            new Date(b.lastDeployed).getTime() - new Date(a.lastDeployed).getTime()
        );

        setProjects(sortedProjects);

        // ⭐ ПРОВЕРКА ИЗМЕНЕНИЯ СТАТУСА ДЛЯ УВЕДОМЛЕНИЙ
        const prevProjects = prevProjectsRef.current;
        if (prevProjects.length > 0) {
            sortedProjects.forEach((newP: Project) => {
                const oldP = prevProjects.find(p => p.id === newP.id);
                // Если проект был в сборке, а стал Активен
                if (oldP && (oldP.status === 'Сборка' || oldP.status === 'Building') && 
                   (newP.status === 'Активен' || newP.status === 'Live')) {
                    
                    // Показываем уведомление браузера
                    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
                        new Notification('Relax Dev', {
                            body: `Проект ${newP.name} успешно развернут!`,
                            icon: '/favicon-96x96.png'
                        });
                    }
                    // Можно также добавить звук
                    // const audio = new Audio('/success.mp3'); audio.play().catch(()=>{});
                }
            });
        }
        
        // Обновляем реф
        prevProjectsRef.current = sortedProjects;

      } else if (res.status === 401) {
        console.error('Auth error, please sign in again.');
        signOut(); 
      }

    } catch (e) {
      console.error('Ошибка загрузки проектов:', e);
    } finally {
      if (!isAutoRefresh) setIsLoading(false);
    }
  }, [user, signOut]);

  // Первичная загрузка
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ⭐ ПОЛЛИНГ: Обновление каждые 10 секунд
  useEffect(() => {
    const interval = setInterval(() => {
        // Передаем true, чтобы не мигал лоадер
        fetchProjects(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [fetchProjects]);

  const formatTimeAgo = (timeStr: string | undefined): string => {
    if (!timeStr) return '';
    const date = new Date(timeStr);
    if (isNaN(date.getTime())) return 'Только что';

    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t.timeAgo.justNow;
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return t.timeAgo.minutesAgo(diffInMinutes);
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return t.timeAgo.hoursAgo(diffInHours);
    return date.toLocaleDateString(language === 'ru' ? 'ru-RU' : 'en-US');
  };

  const handleDeploy = async (gitUrl: string, projectName: string, gitToken: string | undefined, envVars: { key: string; value: string }[] | null, isPublic: boolean, autodeploy: boolean) => {
    if (!user) throw new Error('User not authenticated');
    try {
        const token = await user.getIdToken();
        const response = await fetch('/api/deploy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ gitUrl, projectName, gitToken, envVars, isPublic, autodeploy }),
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || response.statusText || 'Deployment failed';
            throw new Error(errorMessage);
        }
        const newProject = await response.json();
        
        // Сразу добавляем в стейт со статусом "Сборка"
        const localizedProject: Project = {
            ...newProject,
            status: t.status.building,
            lastDeployed: new Date().toISOString(),
        };
        setProjects((prev) => [localizedProject, ...prev]);
        
        // Обновляем список через 3 сек на всякий случай
        setTimeout(() => fetchProjects(true), 3000); 
    } catch (error: any) {
        console.error('Deploy error:', error);
        alert(`Ошибка деплоя: ${error.message}`);
        throw error;
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 md:mb-8 gap-4">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl md:text-3xl font-bold text-white">{t.projects}</h2>
            <button onClick={() => fetchProjects(false)} disabled={isLoading || authLoading} className="p-2 hover:bg-gray-800 rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title="Обновить список">
              <RefreshCw className={`h-5 w-5 ${isLoading || authLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
          {user && !authLoading && (
            <Button onClick={handleAddProjectClick} className="bg-white text-black hover:bg-gray-200 transition-colors w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              {t.addProject}
            </Button>
          )}
        </div>

        {projects.length === 0 && !isLoading && !authLoading && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Layers className="h-14 w-14 sm:h-16 sm:w-16 text-gray-600 mb-4" />
            <h3 className="text-lg sm:text-xl font-semibold text-gray-400 mb-2">{user ? t.noProjectsTitle : 'Проекты не найдены'}</h3>
            <p className="text-gray-500 mb-6 max-w-sm">{user ? t.noProjectsDescription : 'Публичные проекты отсутствуют. Войдите, чтобы добавить свой.'}</p>
            {!user && (
              <Button onClick={signInWithGitHub} className="bg-[#24292e] text-white hover:bg-[#2f363d] flex items-center gap-2 px-4 py-2 rounded-md">
                  <GithubIcon className="fill-white"/>
                  <span>{t.signin}</span>
              </Button>
            )}
          </div>
        ) || (isLoading || authLoading) && projects.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-gray-800/50 rounded-lg p-6 animate-pulse">
                    <div className="h-6 bg-gray-700 rounded w-3/4 mb-4"></div>
                    <div className="h-4 bg-gray-700 rounded w-1/2 mb-6"></div>
                </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={{
                  ...project,
                  lastDeployed: formatTimeAgo(project.lastDeployed),
                }}
                language={language}
                onRedeploy={fetchProjects} 
                isPublic={project.isPublic}
                ownerLogin={project.ownerLogin}
              />
            ))}
          </div>
        )}

      <AddProjectModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onDeploy={handleDeploy}
        language={language}
        user={user} 
      />
    </div>
  );
}