'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/AuthProvider';
import { Project } from '@/types';
import { Loader2, ArrowLeft, Terminal, Settings, RefreshCw, Globe, AlertCircle, History, RotateCcw } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EnvVarsManager } from '@/components/EnvVarsManager';
import { ProjectSettings } from '@/components/Settings';
import { useLanguage } from '@/components/LanguageContext';
import { getTranslation } from '@/lib/i18n';

export default function ProjectDetailsPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = getTranslation(language);

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeploying, setIsRedeploying] = useState(false);

  // Новое состояние для кнопки отката
  const [isRollingBack, setIsRollingBack] = useState<string | null>(null);

  const loadProject = useCallback(async () => {
    if (!user || !id) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/projects/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else {
        router.push('/');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [user, id, router]);

  useEffect(() => {
    loadProject();
    const interval = setInterval(loadProject, 5000);
    return () => clearInterval(interval);
  }, [loadProject]);

  const handleRedeploy = async () => {
    if (!user || !project) return;
    setIsRedeploying(true);
    try {
      const token = await user.getIdToken();
      await fetch(`/api/projects/${project.id}/redeploy`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      await loadProject();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRedeploying(false);
    }
  };

  // ⭐ ФУНКЦИЯ ОТКАТА (ROLLBACK)
  const handleRollback = async (imageUri: string) => {
    if (!user || !project || isRollingBack) return;

    // Подтверждение
    if (!confirm(language === 'ru' ? 'Вы уверены, что хотите откатиться к этой версии?' : 'Are you sure you want to rollback to this version?')) return;

    setIsRollingBack(imageUri);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/projects/${project.id}/redeploy`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image: imageUri }) // Передаем конкретный образ
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Error: ${err.error}`);
      } else {
        await loadProject();
      }
    } catch (e) {
      console.error(e);
      alert('Rollback failed');
    } finally {
      setIsRollingBack(null);
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-black text-white"><Loader2 className="animate-spin" /></div>;
  }

  if (!project) return null;

  const domainUrl = project.domain ? (project.domain.startsWith('http') ? project.domain : `https://${project.domain}`) : null;
  const isOwner = project.canEdit;

  // Сортировка деплоев (новые сверху)
  const deploymentsList = project.deployments ? Object.values(project.deployments).reverse() : [];

  return (
    <div className="min-h-screen bg-black text-white p-4 sm:p-8 font-sans">
      <div className="max-w-5xl mx-auto">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6 text-gray-400 hover:text-white pl-0"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> {t.backToProjects}
        </Button>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 border-b border-gray-800 pb-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {project.name}
              {project.status === 'Активен' && <div className="w-3 h-3 bg-green-500 rounded-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />}
              {(project.status === 'Сборка' || isRedeploying) && <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />}
              {project.status === 'Ошибка' && <div className="w-3 h-3 bg-red-500 rounded-full" />}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              {domainUrl ? (
                <a href={domainUrl} target="_blank" rel="noreferrer" className="flex items-center hover:text-blue-400 transition-colors">
                  <Globe className="w-4 h-4 mr-1" />
                  {project.domain}
                </a>
              ) : (
                <span className="italic">No domain attached</span>
              )}
              <span className="text-gray-600">|</span>
              <span>Updated: {new Date(project.updatedAt).toLocaleString()}</span>
            </div>
          </div>

          {isOwner && (
            <div className="flex gap-3 w-full md:w-auto">
              <Button
                onClick={handleRedeploy}
                disabled={isRedeploying || project.status === 'Сборка'}
                className="bg-white text-black hover:bg-gray-200 w-full md:w-auto"
              >
                {isRedeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                {t.redeploy}
              </Button>
            </div>
          )}
        </div>

        {/* --- TABS --- */}
        <Tabs defaultValue="logs" className="w-full">
          <TabsList className="bg-white/5 border-b border-gray-800 w-full justify-start rounded-none p-0 h-auto">
            <TabsTrigger
              value="logs"
              className="px-6 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 text-gray-400"
            >
              <Terminal className="w-4 h-4 mr-2" />
              {t.logs}
            </TabsTrigger>

            {isOwner && (
              <>
                <TabsTrigger
                  value="env"
                  className="px-6 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 text-gray-400"
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  ENV
                  {(project.missingEnvVars?.length || 0) > 0 && <AlertCircle className="w-3 h-3 ml-2 text-yellow-500" />}
                </TabsTrigger>

                <TabsTrigger
                  value="settings"
                  className="px-6 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 text-gray-400"
                >
                  <Settings className="w-4 h-4 mr-2" />
                  {t.settings}
                </TabsTrigger>

                {/* ⭐ НОВЫЙ ТАБ: ИСТОРИЯ */}
                <TabsTrigger
                  value="deployments"
                  className="px-6 py-3 rounded-none data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-blue-500 data-[state=active]:text-blue-400 text-gray-400"
                >
                  <History className="w-4 h-4 mr-2" />
                  {language === 'ru' ? 'История' : 'History'}
                </TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="logs" className="mt-6">
            <div className="bg-[#111] border border-gray-800 rounded-lg p-4 font-mono text-sm min-h-[400px] overflow-auto whitespace-pre-wrap text-gray-300">
              {project.deploymentLogs || <span className="text-gray-600">{t.noLogs}</span>}
            </div>
          </TabsContent>

          {isOwner && (
            <>
              <TabsContent value="env" className="mt-6">
                <EnvVarsManager
                  projectId={project.id}
                  initialEnvVars={project.envVars || []}
                  onUpdate={loadProject}
                />
              </TabsContent>

              <TabsContent value="settings" className="mt-6">
                <ProjectSettings project={project} onUpdate={loadProject} />
              </TabsContent>

              {/* ⭐ КОНТЕНТ НОВОГО ТАБА */}
              <TabsContent value="deployments" className="mt-6">
                <div className="bg-[#111] border border-gray-800 rounded-lg p-4">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <History className="w-5 h-5 text-blue-400" />
                    {language === 'ru' ? 'История деплоев' : 'Deployment History'}
                  </h2>

                  {deploymentsList.length === 0 ? (
                    <p className="text-gray-500 py-8 text-center">
                      {language === 'ru' ? 'История пуста. Запустите деплой.' : 'No deployment history yet.'}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {deploymentsList.map((deploy: any) => {
                        const isCurrent = project.currentImage === deploy.image;
                        const shortHash = deploy.image.split(':').pop();

                        return (
                          <div
                            key={deploy.id}
                            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded border transition-colors ${isCurrent
                                ? 'bg-green-900/10 border-green-500/30'
                                : 'bg-white/5 border-white/10 hover:border-gray-600'
                              }`}
                          >
                            <div className="flex flex-col mb-3 sm:mb-0">
                              <div className="flex items-center gap-2">
                                <span className="text-white font-mono font-medium text-sm bg-black/50 px-2 py-1 rounded">
                                  {shortHash}
                                </span>
                                {isCurrent && (
                                  <span className="text-[10px] uppercase font-bold text-green-400 bg-green-900/30 px-2 py-0.5 rounded-full border border-green-500/30">
                                    Active
                                  </span>
                                )}
                              </div>
                              <span className="text-gray-500 text-xs mt-1">
                                {new Date(deploy.createdAt).toLocaleString()} • {deploy.initiator || 'Unknown'}
                              </span>
                            </div>

                            {!isCurrent && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRollback(deploy.image)}
                                disabled={isRollingBack !== null}
                                className="border-blue-500/30 hover:bg-blue-500/20 text-blue-400 hover:text-blue-300 w-full sm:w-auto"
                              >
                                {isRollingBack === deploy.image ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <>
                                    <RotateCcw className="w-3 h-3 mr-2" />
                                    {language === 'ru' ? 'Откатить' : 'Rollback'}
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </div>
  );
}