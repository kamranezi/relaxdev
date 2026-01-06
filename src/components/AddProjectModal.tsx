'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Github, Lock, Search, Loader2, X, Plus } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { ProjectEnvVar } from '@/types';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (gitUrl: string, projectName: string, gitToken?: string, envVars?: ProjectEnvVar[]) => Promise<void>;
  language: 'ru' | 'en';
}

// Тип для объекта репозитория
interface Repo {
  id: number;
  name: string;
  full_name: string;
  url: string;
  private: boolean;
}

export function AddProjectModal({ isOpen, onClose, onDeploy, language }: AddProjectModalProps) {
  const { data: session } = useSession();
  const [gitUrl, setGitUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  const [envVars, setEnvVars] = useState<ProjectEnvVar[]>([]);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  useEffect(() => {
    if (isOpen && session) {
      loadRepos();
    }
    if (isOpen) {
        setSelectedRepo(null);
        setGitUrl('');
        setProjectName('');
        setSearchQuery('');
        setEnvVars([]);
        setNewEnvKey('');
        setNewEnvValue('');
    }
  }, [isOpen, session]);

  const loadRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const res = await fetch('/api/github/repos');
      if (res.ok) {
        setRepos(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleRepoSelect = (repo: Repo) => {
    setSelectedRepo(repo);
    setGitUrl(repo.url);
    setProjectName(repo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
  };

  const handleResetSelection = () => {
    setSelectedRepo(null);
    setGitUrl('');
    setProjectName('');
  };

  const handleAddEnvVar = () => {
    if (newEnvKey.trim() && newEnvValue.trim()) {
      setEnvVars([...envVars, { key: newEnvKey.trim(), value: newEnvValue.trim() }]);
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const handleRemoveEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
  };

  const handleDeployClick = async () => {
    if (!gitUrl || !projectName) return;
    setIsLoading(true);
    try {
      // Токен пока не используется, передаем пустую строку
      await onDeploy(gitUrl, projectName, '', envVars.length > 0 ? envVars : undefined);
      onClose();
    } catch (error) {
      console.error("Ошибка деплоя:", error);
      alert('Error deploying project');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredRepos = repos.filter(repo => 
    repo.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#111] border-gray-800 text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{language === 'ru' ? 'Новый проект' : 'New Project'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
            {!session ? (
                 <div className="text-center py-4 text-gray-400">
                    <p>Войдите через GitHub, чтобы видеть список репозиториев.</p>
                 </div>
            ) : (
                <div className="flex flex-col gap-4">
                    {selectedRepo ? (
                        <div className="bg-blue-900/20 border border-blue-500/50 rounded-md p-3 flex items-center justify-between animate-in fade-in zoom-in-95 duration-200">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="bg-blue-500/20 p-2 rounded-full">
                                    <Github className="w-4 h-4 text-blue-400" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-sm font-medium text-blue-100 truncate">
                                        {selectedRepo.full_name}
                                    </span>
                                    <span className="text-xs text-blue-300/70 truncate">
                                        {selectedRepo.url}
                                    </span>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleResetSelection}
                                className="text-gray-400 hover:text-white hover:bg-white/10 h-8 w-8 p-0 rounded-full"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    ) : (
                        <>
                            <Input 
                                placeholder={language === 'ru' ? "Поиск репозитория..." : "Search repositories..."}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="bg-black/50 border-gray-700"
                                prefix={<Search className="w-4 h-4 text-gray-500" />}
                            />
                            
                            <div className="h-[200px] overflow-y-auto border border-gray-800 rounded-md p-2 space-y-1 custom-scrollbar">
                                {isLoadingRepos ? (
                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-500" /></div>
                                ) : filteredRepos.length === 0 ? (
                                    <div className="text-center text-gray-500 p-4 text-sm">Ничего не найдено</div>
                                ) : (
                                    filteredRepos.map((repo) => (
                                        <div 
                                            key={repo.id}
                                            onClick={() => handleRepoSelect(repo)}
                                            className="p-2 rounded cursor-pointer flex items-center justify-between text-sm hover:bg-white/5 transition-colors group"
                                        >
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                {repo.private ? <Lock className="w-3 h-3 text-yellow-500 shrink-0" /> : <Github className="w-3 h-3 text-gray-400 shrink-0" />}
                                                <span className="truncate text-gray-300 group-hover:text-white">{repo.full_name}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-gray-400">
                                                Select
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}

            <div className="space-y-3 pt-4 border-t border-gray-800">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400">Project Name (ID)</label>
                    <Input
                        value={projectName}
                        onChange={(e) => setProjectName(e.target.value)}
                        placeholder="my-awesome-project"
                        className="bg-black/50 border-gray-700"
                    />
                </div>
                
                {!selectedRepo && (
                    <div className="space-y-2">
                         <label className="text-xs font-medium text-gray-400">Git URL</label>
                        <Input
                            value={gitUrl}
                            onChange={(e) => setGitUrl(e.target.value)}
                            placeholder="https://github.com/..."
                            className="bg-black/50 border-gray-700"
                        />
                    </div>
                )}
            </div>

            <div className="space-y-3 pt-4 border-t border-gray-800">
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-gray-400">
                  {language === 'ru' ? 'Переменные окружения' : 'Environment Variables'}
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleAddEnvVar}
                  disabled={!newEnvKey.trim() || !newEnvValue.trim()}
                  className="text-xs h-7"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  {language === 'ru' ? 'Добавить' : 'Add'}
                </Button>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newEnvKey}
                    onChange={(e) => setNewEnvKey(e.target.value)}
                    placeholder={language === 'ru' ? 'KEY' : 'KEY'}
                    className="bg-black/50 border-gray-700 text-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newEnvKey.trim() && newEnvValue.trim()) {
                        handleAddEnvVar();
                      }
                    }}
                  />
                  <Input
                    value={newEnvValue}
                    onChange={(e) => setNewEnvValue(e.target.value)}
                    placeholder={language === 'ru' ? 'VALUE' : 'VALUE'}
                    className="bg-black/50 border-gray-700 text-xs"
                    type="password"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && newEnvKey.trim() && newEnvValue.trim()) {
                        handleAddEnvVar();
                      }
                    }}
                  />
                </div>

                {envVars.length > 0 && (
                  <div className="space-y-1 max-h-32 overflow-y-auto border border-gray-800 rounded-md p-2">
                    {envVars.map((envVar, index) => (
                      <div key={index} className="flex items-center justify-between text-xs bg-gray-900/50 p-2 rounded">
                        <span className="text-gray-300">
                          <span className="font-mono text-blue-400">{envVar.key}</span>
                          <span className="text-gray-500 mx-2">=</span>
                          <span className="text-green-400">••••••••</span>
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveEnvVar(index)}
                          className="h-5 w-5 p-0 text-red-400 hover:text-red-300"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Button 
                onClick={handleDeployClick} 
                disabled={isLoading || !projectName || !gitUrl} 
                className="w-full bg-white text-black hover:bg-gray-200 mt-2 font-medium"
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (language === 'ru' ? 'Деплой' : 'Deploy')}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}