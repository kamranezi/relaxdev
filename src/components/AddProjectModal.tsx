'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"; // Если нет shadcn tabs, можно простыми кнопками
import { Github, Link as LinkIcon, Lock, Search, Loader2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (gitUrl: string, projectName: string, gitToken?: string) => Promise<void>;
  language: 'ru' | 'en';
}

export function AddProjectModal({ isOpen, onClose, onDeploy, language }: AddProjectModalProps) {
  const { data: session } = useSession();
  const [gitUrl, setGitUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [gitToken, setGitToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Для списка репозиториев
  const [repos, setRepos] = useState<any[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Загрузка репозиториев при открытии
  useEffect(() => {
    if (isOpen && session) {
      loadRepos();
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

  const handleRepoSelect = (repo: any) => {
    setGitUrl(repo.url);
    // Автоматически ставим имя проекта (чистим от спецсимволов)
    setProjectName(repo.name.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
    // Если репо приватный, можно сразу подсказать пользователю про токен
    // Но так как мы уже авторизованы через App, токен может и не понадобиться, если допилим Builder
  };

  const handleDeployClick = async () => {
    if (!gitUrl || !projectName) return;
    setIsLoading(true);
    try {
      await onDeploy(gitUrl, projectName, gitToken);
      onClose();
      // Сброс полей
      setGitUrl('');
      setProjectName('');
      setGitToken('');
    } catch (error) {
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

        {/* Простой переключатель вкладок, если нет shadcn Tabs */}
        <div className="space-y-4">
            {!session ? (
                 <div className="text-center py-4 text-gray-400">
                    <p>Войдите через GitHub, чтобы видеть список репозиториев.</p>
                 </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <Input 
                        placeholder={language === 'ru' ? "Поиск репозитория..." : "Search repositories..."}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-black/50 border-gray-700"
                        prefix={<Search className="w-4 h-4 text-gray-500" />}
                    />
                    
                    <div className="h-[200px] overflow-y-auto border border-gray-800 rounded-md p-2 space-y-1">
                        {isLoadingRepos ? (
                            <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>
                        ) : filteredRepos.length === 0 ? (
                            <div className="text-center text-gray-500 p-4">Ничего не найдено</div>
                        ) : (
                            filteredRepos.map((repo) => (
                                <div 
                                    key={repo.id}
                                    onClick={() => handleRepoSelect(repo)}
                                    className={`p-2 rounded cursor-pointer flex items-center justify-between text-sm ${gitUrl === repo.url ? 'bg-blue-900/30 border border-blue-500/50' : 'hover:bg-white/5'}`}
                                >
                                    <div className="flex items-center gap-2">
                                        {repo.private ? <Lock className="w-3 h-3 text-yellow-500" /> : <Github className="w-3 h-3 text-gray-400" />}
                                        <span className="truncate max-w-[280px]">{repo.full_name}</span>
                                    </div>
                                    <Button variant="ghost" size="sm" className="h-6 text-xs">Select</Button>
                                </div>
                            ))
                        )}
                    </div>
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
                
                {/* Если выбран не из списка, показываем поле URL */}
                <div className="space-y-2">
                     <label className="text-xs font-medium text-gray-400">Git URL</label>
                    <Input
                        value={gitUrl}
                        onChange={(e) => setGitUrl(e.target.value)}
                        placeholder="https://github.com/..."
                        className="bg-black/50 border-gray-700"
                    />
                </div>
            </div>

            <Button 
                onClick={handleDeployClick} 
                disabled={isLoading || !projectName || !gitUrl} 
                className="w-full bg-white text-black hover:bg-gray-200 mt-2"
            >
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (language === 'ru' ? 'Деплой' : 'Deploy')}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}