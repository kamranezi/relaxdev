'use client';

import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Github, Lock, Loader2, X } from 'lucide-react';
import { ProjectEnvVar } from '@/types';
import { User } from 'firebase/auth';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { EnvVarsManager } from '@/components/EnvVarsManager';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (
    gitUrl: string, 
    projectName: string, 
    gitToken: string | undefined, 
    envVars: ProjectEnvVar[] | null,
    isPublic: boolean, 
    autodeploy: boolean
  ) => Promise<void>;
  language: 'ru' | 'en';
  user: User | null;
}

interface Repo {
  id: number;
  name: string;
  full_name: string;
  url: string;
  private: boolean;
}

export function AddProjectModal({ isOpen, onClose, onDeploy, language, user }: AddProjectModalProps) {
  const [gitUrl, setGitUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [repos, setRepos] = useState<Repo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<Repo | null>(null);
  
  const [envVars, setEnvVars] = useState<ProjectEnvVar[]>([]);
  const [isPublic, setIsPublic] = useState(false);
  const [autodeploy, setAutodeploy] = useState(true);

  const loadRepos = useCallback(async () => {
    if (!user) return;
    setIsLoadingRepos(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch('/api/github/repos', {
        headers: { 'Authorization': `Bearer ${idToken}` }
      });
      if (res.ok) {
        setRepos(await res.json());
      } else {
        setRepos([]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingRepos(false);
    }
  }, [user]);

  useEffect(() => {
    if (isOpen && user) loadRepos();
    if (isOpen) {
        setSelectedRepo(null);
        setGitUrl('');
        setProjectName('');
        setSearchQuery('');
        setEnvVars([]);
        setIsPublic(false);
        setAutodeploy(true); 
    }
  }, [isOpen, user, loadRepos]);

  const handleRepoSelect = (repo: Repo) => {
    setSelectedRepo(repo);
    setGitUrl(repo.url);
    setProjectName(repo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const url = e.target.value;
    setGitUrl(url);
    const match = url.match(/github\.com\/[^\/]+\/([^\/]+?)(\.git)?$/);
    if (match && match[1]) {
        setProjectName(match[1].toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    }
  };

  const handleResetSelection = () => {
    setSelectedRepo(null);
    setGitUrl('');
    setProjectName('');
  };

  const handleDeployClick = async () => {
    if (!gitUrl || !projectName) return;
    setIsLoading(true);
    try {
      await onDeploy(
        gitUrl, 
        projectName, 
        '', 
        envVars.length > 0 ? envVars : null, 
        isPublic, 
        autodeploy
      );
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
      <DialogContent className="bg-[#111] border-gray-800 text-white sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-y-auto custom-scrollbar p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{language === 'ru' ? 'Новый проект' : 'New Project'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
            {/* 1. ВЫБОР РЕПОЗИТОРИЯ */}
            {!user ? (
                 <div className="text-center py-4 text-gray-400">
                    <p>Войдите через GitHub, чтобы видеть список репозиториев.</p>
                 </div>
            ) : (
                <div className="flex flex-col gap-4 w-full">
                    {selectedRepo ? (
                        /* ⭐ ИСПРАВЛЕНИЕ: max-w-full и overflow-hidden для родителя */
                        <div className="bg-blue-900/20 border border-blue-500/50 rounded-md p-3 flex items-center justify-between w-full max-w-full overflow-hidden">
                            {/* ⭐ ИСПРАВЛЕНИЕ: flex-1 и min-w-0 для текстового блока */}
                            <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                                <div className="bg-blue-500/20 p-2 rounded-full flex-shrink-0">
                                    <Github className="w-4 h-4 text-blue-400" />
                                </div>
                                <div className="flex flex-col min-w-0 overflow-hidden w-full">
                                    <span className="text-sm font-medium text-blue-100 truncate block w-full">
                                        {selectedRepo.full_name}
                                    </span>
                                    <span className="text-xs text-blue-300/70 truncate block w-full">
                                        {selectedRepo.url}
                                    </span>
                                </div>
                            </div>
                            <Button 
                                variant="ghost" size="sm" onClick={handleResetSelection}
                                className="text-gray-400 hover:text-white h-8 w-8 p-0 ml-2 flex-shrink-0"
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
                            />
                            
                            <div className="h-[150px] overflow-y-auto border border-gray-800 rounded-md p-2 space-y-1 custom-scrollbar">
                                {isLoadingRepos ? (
                                    <div className="flex justify-center p-4"><Loader2 className="animate-spin text-gray-500" /></div>
                                ) : filteredRepos.length === 0 ? (
                                    <div className="text-center text-gray-500 p-4 text-sm">Ничего не найдено</div>
                                ) : (
                                    filteredRepos.map((repo) => (
                                        <div 
                                            key={repo.id}
                                            onClick={() => handleRepoSelect(repo)}
                                            className="p-2 rounded cursor-pointer flex items-center justify-between text-sm hover:bg-white/5 transition-colors group w-full max-w-full overflow-hidden"
                                        >
                                            {/* ⭐ ИСПРАВЛЕНИЕ: min-w-0 для названия */}
                                            <div className="flex items-center gap-2 overflow-hidden flex-1 min-w-0">
                                                {repo.private ? <Lock className="w-3 h-3 text-yellow-500 shrink-0" /> : <Github className="w-3 h-3 text-gray-400 shrink-0" />}
                                                <span className="truncate text-gray-300 group-hover:text-white block w-full">{repo.full_name}</span>
                                            </div>
                                            <Button variant="ghost" size="sm" className="h-6 text-xs opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 flex-shrink-0 ml-2">
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

            {/* 2. НАЗВАНИЕ И URL */}
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
                            onChange={handleUrlChange}
                            placeholder="https://github.com/..."
                            className="bg-black/50 border-gray-700"
                        />
                    </div>
                )}
            </div>

            {/* 3. ПЕРЕМЕННЫЕ ОКРУЖЕНИЯ */}
            <div className="pt-4 border-t border-gray-800">
                <div className="mb-2 text-xs font-medium text-gray-400">
                  {language === 'ru' ? 'Переменные окружения' : 'Environment Variables'}
                </div>
                <EnvVarsManager 
                    initialEnvVars={envVars}
                    onChange={(newVars) => setEnvVars(newVars)}
                />
            </div>
            
            {/* 4. НАСТРОЙКИ */}
            <div className="space-y-4 pt-4 border-t border-gray-800">
                 <div className="flex items-center justify-between">
                    <Label htmlFor="public-switch" className="cursor-pointer text-sm font-medium text-gray-300">
                        {language === 'ru' ? 'Сделать проект публичным' : 'Public Project'}
                    </Label>
                    <Switch id="public-switch" checked={isPublic} onCheckedChange={setIsPublic} />
                 </div>
                 
                 <div className="flex items-center justify-between">
                    <Label htmlFor="autodeploy-switch" className="cursor-pointer text-sm font-medium text-gray-300">
                        {language === 'ru' ? 'Включить автодеплой' : 'Enable Autodeploy'}
                    </Label>
                    <Switch id="autodeploy-switch" checked={autodeploy} onCheckedChange={setAutodeploy} />
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