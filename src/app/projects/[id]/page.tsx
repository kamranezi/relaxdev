'use client';

// ... импорты остаются прежними ...
import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  CheckCircle2, 
  Loader2, 
  XCircle, 
  ExternalLink, 
  Trash2, 
  RefreshCw, 
  ArrowLeft,
  Plus,
  X,
  AlertCircle,
  Copy,
  Check
} from 'lucide-react';
import { getTranslation } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings } from '@/components/Settings';
import { useLanguage } from '@/components/LanguageContext';

// ... GithubIcon ...
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35.0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35.0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
    <path d="M9 18c-4.51 2-5-2-7-2"/>
  </svg>
);

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage(); 

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRedeploying, setIsRedeploying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const t = getTranslation(language);
  const projectId = params.id as string;

  // ... fetchProject без изменений ...
  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    try {
      const idToken = user ? await user.getIdToken() : null;
      const headers: HeadersInit = idToken ? { 'Authorization': `Bearer ${idToken}` } : {};
      
      const res = await fetch(`/api/projects/${projectId}`, {
        headers: headers
      });
      
      if (res.ok) {
        const data = await res.json();
        setProject(data);
      } else if (res.status === 404) {
        router.push('/');
      }
    } catch (error) {
      console.error('Ошибка загрузки проекта:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, router, user]);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId, fetchProject]);

  // ... handleRedeploy ...
  const handleRedeploy = async () => {
    if (!project || !user) return;
    setIsRedeploying(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}/redeploy`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        await fetchProject();
        setTimeout(fetchProject, 3000);
      }
    } catch (error) {
      console.error('Ошибка редеплоя:', error);
      alert(t.redeployError);
    } finally {
      setIsRedeploying(false);
    }
  };

  // ... handleDelete (ИСПРАВЛЕН ALERT) ...
  const handleDelete = async () => {
    if (!user || !confirm(t.deleteConfirmation)) {
      return;
    }
    setIsDeleting(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        router.push('/');
      } else {
          alert(t.deleteError);
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert(t.deleteError);
    } finally {
      setIsDeleting(false);
    }
  };

  // ... handleAddEnvVar / handleRemoveEnvVar (ИСПРАВЛЕНЫ ALERT) ...
  const handleAddEnvVar = async () => {
    if (!project || !newEnvKey.trim() || !newEnvValue.trim() || !user) return;
    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();
      const updatedEnvVars = [...(project.envVars || []), { key: newEnvKey.trim(), value: newEnvValue.trim() }];
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ envVars: updatedEnvVars }),
      });
      if (res.ok) {
        await fetchProject();
        setNewEnvKey('');
        setNewEnvValue('');
      }
    } catch (error) {
      console.error('Ошибка сохранения переменной:', error);
      alert(t.saveVarError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveEnvVar = async (index: number) => {
    if (!project || !user) return;
    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();
      const updatedEnvVars = (project.envVars || []).filter((_, i) => i !== index);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}` 
        },
        body: JSON.stringify({ envVars: updatedEnvVars }),
      });
      if (res.ok) {
        await fetchProject();
      }
    } catch (error) {
      console.error('Ошибка удаления переменной:', error);
      alert(t.deleteVarError);
    } finally {
      setIsSaving(false);
    }
  };  

  // ... copyToClipboard ...
  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Ошибка копирования:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-80px)] bg-[#0A0A0A]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] bg-[#0A0A0A] text-gray-400">
        <p>{t.projectNotFound}</p>
        <Button onClick={() => router.push('/')} className="mt-4">
          {t.backToHome}
        </Button>
      </div>
    );
  }

  const getStatusConfig = () => {
    const isActive = project.status === 'Активен' || project.status === 'Live';
    const isBuilding = project.status === 'Сборка' || project.status === 'Building';
    
    if (isActive) {
      return {
        icon: CheckCircle2,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        text: t.status.active,
      };
    }
    if (isBuilding) {
      return {
        icon: Loader2,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        text: t.status.building,
        animate: true,
      };
    }
    return {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      text: t.status.error,
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const domainUrl = project.domain.startsWith('http') ? project.domain : `https://${project.domain}`;
  const canManage = !!project.envVars;

  return (
    <div className="min-h-full bg-[#0A0A0A] text-gray-300">
      <main className="max-w-6xl mx-auto p-4 sm:p-6 md:p-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-4 md:mb-6 text-gray-400 hover:text-white pl-0"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t.back}
        </Button>

        <div className="bg-[#1A1A1A] rounded-lg shadow-lg p-4 sm:p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-start justify-between mb-6 gap-4">
            <div className="flex-1">
              <div className="flex items-start sm:items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-bold text-white break-all">{project.name}</h1>
                <span className={`px-3 py-1 rounded-full text-xs sm:text-sm flex items-center gap-2 ${statusConfig.color} ${statusConfig.bgColor} flex-shrink-0`}>
                  <StatusIcon className={`h-4 w-4 ${statusConfig.animate ? 'animate-spin' : ''}`} />
                  {statusConfig.text}
                </span>
              </div>
              {/* ... Ссылки на репо и домен ... */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-400">
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors truncate"
                >
                  <GithubIcon className="h-4 w-4 flex-shrink-0" />
                  <span className="truncate">{project.repoUrl.replace('https://github.com/', '')}</span>
                </a>
                {project.domain && (
                  <a
                    href={domainUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-cyan-400 transition-colors truncate"
                  >
                    <ExternalLink className="h-4 w-4 flex-shrink-0" />
                    <span className="truncate">{project.domain}</span>
                  </a>
                )}
              </div>
            </div>
            
            {/* ИСПРАВЛЕНИЕ: Кнопки управления с правильными переводами */}
            {canManage && (
                <div className="flex gap-2 w-full md:w-auto">
                <Button
                    onClick={handleRedeploy}
                    disabled={isRedeploying}
                    className="bg-white text-black hover:bg-gray-200 flex-1 md:flex-initial"
                >
                    {isRedeploying ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                    <>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        {/* Для десктопа - полный текст */}
                        <span className="hidden md:inline">{t.redeploy}</span>
                        {/* Для мобильных - короткий текст из переводов */}
                        <span className="md:hidden">{t.buildShort || t.redeploy}</span>
                    </>
                    )}
                </Button>
                <Button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    variant="destructive"
                    className="flex-1 md:flex-initial"
                >
                    {isDeleting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                    <>
                        <Trash2 className="h-4 w-4 mr-2" />
                         {/* Для десктопа - полный текст */}
                        <span className="hidden md:inline">{t.delete}</span>
                         {/* Для мобильных - короткий текст из переводов */}
                        <span className="md:hidden">{t.deleteShort || t.delete}</span>
                    </>
                    )}
                </Button>
                </div>
            )}
          </div>

          <Tabs defaultValue="overview" className="w-full">
             {/* ... Контент табов остается прежним, только убедитесь что используется 't' ... */}
            <div className="w-full overflow-x-auto pb-2 -mb-2 sm:mb-0 sm:pb-0 scrollbar-none">
                <TabsList className="bg-black/50 w-full sm:w-auto flex justify-start min-w-[320px]">
                  <TabsTrigger className="flex-1" value="overview">{t.overview}</TabsTrigger>
                  {canManage && <TabsTrigger className="flex-1" value="env">{t.envVars}</TabsTrigger>}
                  {canManage && <TabsTrigger className="flex-1" value="logs">{t.logs}</TabsTrigger>}
                  {canManage && <TabsTrigger className="flex-1" value="settings">{t.settings}</TabsTrigger>}
                </TabsList>
            </div>
            
            {/* ... Rest of the component (TabsContent) logic stays same, it was already using 't' ... */}
            <TabsContent value="overview" className="mt-6">
                {/* ... Сокращенный код для примера, логика внутри TabsContent была правильной ... */}
                 <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">{t.owner}</div>
                    <div className="text-white truncate">{project.owner}</div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">{t.lastDeployed}</div>
                    <div className="text-white">
                      {new Date(project.lastDeployed).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">{t.created}</div>
                    <div className="text-white">
                      {new Date(project.createdAt).toLocaleString(language === 'ru' ? 'ru-RU' : 'en-US')}
                    </div>
                  </div>
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">{t.domain}</div>
                    <div className="text-white font-mono text-sm truncate">{project.domain}</div>
                  </div>
                </div>
                
                 {/* ... Блок ошибок ... */}
                {(project.buildErrors && project.buildErrors.length > 0) || 
                 (project.missingEnvVars && project.missingEnvVars.length > 0) ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        {project.buildErrors && project.buildErrors.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-yellow-400 mb-1">
                              {t.buildErrors}
                            </div>
                            <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                              {project.buildErrors.map((error, i) => (
                                <li key={i} className="break-words">{error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {project.missingEnvVars && project.missingEnvVars.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-yellow-400 mb-1">
                              {t.missingEnvVars}
                            </div>
                            <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                              {project.missingEnvVars.map((varName, i) => (
                                <li key={i} className="font-mono">{varName}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </TabsContent>
            
            {canManage && (
                <>
                 <TabsContent value="env" className="mt-6">
                    {/* ... Тут также просто используем 't', код внутри был верен ... */}
                     <div className="space-y-4">
                        <div className="bg-black/30 rounded-lg p-4">
                        <div className="text-sm font-medium text-gray-300 mb-3">
                            {t.addEnvVar}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Input
                            value={newEnvKey}
                            onChange={(e) => setNewEnvKey(e.target.value)}
                            placeholder="KEY"
                            className="bg-black/50 border-gray-700"
                            />
                            <Input
                            value={newEnvValue}
                            onChange={(e) => setNewEnvValue(e.target.value)}
                            placeholder="VALUE"
                            className="bg-black/50 border-gray-700"
                            type="password"
                            />
                            <Button
                            onClick={handleAddEnvVar}
                            disabled={!newEnvKey.trim() || !newEnvValue.trim() || isSaving}
                            className="bg-white text-black hover:bg-gray-200 flex-shrink-0"
                            >
                            {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                <Plus className="h-4 w-4 md:mr-2" />
                                <span className="hidden md:inline">{t.add}</span>
                                </>
                            )}
                            </Button>
                        </div>
                        </div>
                        {/* ... Список переменных ... */}
                        <div className="space-y-2">
                        {(project.envVars || []).length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                            {t.noEnvVars}
                            </div>
                        ) : (
                            (project.envVars || []).map((envVar, index) => (
                            <div key={index} className="bg-black/30 rounded-lg p-3 sm:p-4 flex items-center justify-between">
                                <div className="flex-1 overflow-hidden">
                                <div className="font-mono text-sm text-blue-400 mb-1 truncate">{envVar.key}</div>
                                <div className="flex items-center gap-2">
                                    <span className="text-green-400 font-mono text-xs">••••••••</span>
                                    <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => copyToClipboard(envVar.value, `${envVar.key}-value`)}
                                    className="h-6 w-6 p-0"
                                    >
                                    {copiedKey === `${envVar.key}-value` ? (
                                        <Check className="h-3 w-3 text-green-400" />
                                    ) : (
                                        <Copy className="h-3 w-3 text-gray-400" />
                                    )}
                                    </Button>
                                </div>
                                </div>
                                <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveEnvVar(index)}
                                disabled={isSaving}
                                className="text-red-400 hover:text-red-300 ml-2"
                                >
                                <X className="h-4 w-4" />
                                </Button>
                            </div>
                            ))
                        )}
                        </div>
                    </div>
                 </TabsContent>
                 <TabsContent value="logs" className="mt-6">
                    <div className="bg-black/30 rounded-lg p-4 overflow-x-auto">
                        <pre className="font-mono text-xs text-gray-300 whitespace-pre">
                        {project.deploymentLogs || t.noLogs}
                        </pre>
                    </div>
                    </TabsContent>
                    
                    <TabsContent value="settings" className="mt-6">
                    <Settings 
                        project={project} 
                        language={language} 
                        onSettingsChange={fetchProject} 
                    />
                    </TabsContent>
                </>
            )}

          </Tabs>
        </div>
      </main>
    </div>
  );
}