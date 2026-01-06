'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
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
import { getTranslation, Language } from '@/lib/i18n';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  const { data: session } = useSession();
  const [language, setLanguage] = useState<Language>('ru');
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

  const fetchProject = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`);
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
  }, [projectId, router]);

  useEffect(() => {
    if (projectId && session) {
      fetchProject();
    }
  }, [projectId, session, fetchProject]);

  const handleRedeploy = async () => {
    if (!project) return;
    setIsRedeploying(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/redeploy`, {
        method: 'POST',
      });
      if (res.ok) {
        await fetchProject();
        setTimeout(fetchProject, 3000);
      }
    } catch (error) {
      console.error('Ошибка редеплоя:', error);
      alert('Ошибка редеплоя');
    } finally {
      setIsRedeploying(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(language === 'ru' ? 'Вы уверены, что хотите удалить этот проект?' : 'Are you sure you want to delete this project?')) {
      return;
    }
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        router.push('/');
      }
    } catch (error) {
      console.error('Ошибка удаления:', error);
      alert('Ошибка удаления проекта');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAddEnvVar = async () => {
    if (!project || !newEnvKey.trim() || !newEnvValue.trim()) return;
    setIsSaving(true);
    try {
      const updatedEnvVars = [...(project.envVars || []), { key: newEnvKey.trim(), value: newEnvValue.trim() }];
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envVars: updatedEnvVars }),
      });
      if (res.ok) {
        await fetchProject();
        setNewEnvKey('');
        setNewEnvValue('');
      }
    } catch (error) {
      console.error('Ошибка сохранения переменной:', error);
      alert('Ошибка сохранения переменной');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveEnvVar = async (index: number) => {
    if (!project) return;
    setIsSaving(true);
    try {
      const updatedEnvVars = (project.envVars || []).filter((_, i) => i !== index);
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ envVars: updatedEnvVars }),
      });
      if (res.ok) {
        await fetchProject();
      }
    } catch (error) {
      console.error('Ошибка удаления переменной:', error);
      alert('Ошибка удаления переменной');
    } finally {
      setIsSaving(false);
    }
  };

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
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A0A0A] text-gray-400">
        <p>Проект не найден</p>
        <Button onClick={() => router.push('/')} className="mt-4">
          Вернуться на главную
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
        text: language === 'ru' ? 'Активен' : 'Live',
      };
    }
    if (isBuilding) {
      return {
        icon: Loader2,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        text: language === 'ru' ? 'Сборка' : 'Building',
        animate: true,
      };
    }
    return {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      text: language === 'ru' ? 'Ошибка' : 'Error',
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const domainUrl = project.domain.startsWith('http') ? project.domain : `https://${project.domain}`;

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-gray-300">
      <div className="max-w-6xl mx-auto p-4 md:p-8">
        <Button
          variant="ghost"
          onClick={() => router.push('/')}
          className="mb-6 text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          {language === 'ru' ? 'Назад' : 'Back'}
        </Button>

        <div className="bg-[#1A1A1A] rounded-lg shadow-lg p-6 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                <span className={`px-3 py-1 rounded-full text-sm flex items-center gap-2 ${statusConfig.color} ${statusConfig.bgColor}`}>
                  <StatusIcon className={`h-4 w-4 ${statusConfig.animate ? 'animate-spin' : ''}`} />
                  {statusConfig.text}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm text-gray-400">
                <a
                  href={project.repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-white transition-colors"
                >
                  <GithubIcon className="h-4 w-4" />
                  {project.repoUrl.replace('https://github.com/', '')}
                </a>
                {project.domain && (
                  <a
                    href={domainUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 hover:text-cyan-400 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                    {project.domain}
                  </a>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleRedeploy}
                disabled={isRedeploying}
                className="bg-white text-black hover:bg-gray-200"
              >
                {isRedeploying ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {language === 'ru' ? 'Редеплой' : 'Redeploy'}
                  </>
                )}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={isDeleting}
                variant="destructive"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {language === 'ru' ? 'Удалить' : 'Delete'}
                  </>
                )}
              </Button>
            </div>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="bg-black/50">
              <TabsTrigger value="overview">{t.overview}</TabsTrigger>
              <TabsTrigger value="env">{t.envVars}</TabsTrigger>
              <TabsTrigger value="logs">{t.logs}</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-black/30 rounded-lg p-4">
                    <div className="text-sm text-gray-400 mb-1">{t.owner}</div>
                    <div className="text-white">{project.owner}</div>
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
                    <div className="text-white font-mono text-sm">{project.domain}</div>
                  </div>
                </div>

                {(project.buildErrors && project.buildErrors.length > 0) || 
                 (project.missingEnvVars && project.missingEnvVars.length > 0) ? (
                  <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                      <div className="flex-1 space-y-2">
                        {project.buildErrors && project.buildErrors.length > 0 && (
                          <div>
                            <div className="text-sm font-medium text-yellow-400 mb-1">
                              {t.buildErrors}
                            </div>
                            <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
                              {project.buildErrors.map((error, i) => (
                                <li key={i}>{error}</li>
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

            <TabsContent value="env" className="mt-6">
              <div className="space-y-4">
                <div className="bg-black/30 rounded-lg p-4">
                  <div className="text-sm font-medium text-gray-300 mb-3">
                    {t.addEnvVar}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={newEnvKey}
                      onChange={(e) => setNewEnvKey(e.target.value)}
                      placeholder="KEY"
                      className="bg-black/50 border-gray-700"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newEnvKey.trim() && newEnvValue.trim()) {
                          handleAddEnvVar();
                        }
                      }}
                    />
                    <Input
                      value={newEnvValue}
                      onChange={(e) => setNewEnvValue(e.target.value)}
                      placeholder="VALUE"
                      className="bg-black/50 border-gray-700"
                      type="password"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && newEnvKey.trim() && newEnvValue.trim()) {
                          handleAddEnvVar();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddEnvVar}
                      disabled={!newEnvKey.trim() || !newEnvValue.trim() || isSaving}
                      className="bg-white text-black hover:bg-gray-200"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  {(project.envVars || []).length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      {t.noEnvVars}
                    </div>
                  ) : (
                    (project.envVars || []).map((envVar, index) => (
                      <div key={index} className="bg-black/30 rounded-lg p-4 flex items-center justify-between">
                        <div className="flex-1">
                          <div className="font-mono text-sm text-blue-400 mb-1">{envVar.key}</div>
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
                          className="text-red-400 hover:text-red-300"
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
              <div className="bg-black/30 rounded-lg p-4">
                <div className="font-mono text-xs text-gray-300 whitespace-pre-wrap">
                  {project.deploymentLogs || t.noLogs}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
