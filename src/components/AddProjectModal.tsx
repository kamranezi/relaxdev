'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTranslation, Language } from '@/lib/i18n';
import { Loader2 } from 'lucide-react';

interface AddProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDeploy: (gitUrl: string, projectName: string) => Promise<void>;
  language: Language;
}

export function AddProjectModal({
  isOpen,
  onClose,
  onDeploy,
  language,
}: AddProjectModalProps) {
  const t = getTranslation(language);
  const [gitUrl, setGitUrl] = useState('');
  const [projectName, setProjectName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setGitUrl('');
      setProjectName('');
      setError('');
    }
  }, [isOpen]);

  const extractProjectName = (url: string) => {
    try {
      const match = url.match(/github\.com\/[^\/]+\/([^\/]+)/);
      if (match && match[1]) {
        return match[1].replace(/\.git$/, '');
      }
    } catch {
      // Invalid URL
    }
    return '';
  };

  const handleGitUrlChange = (value: string) => {
    setGitUrl(value);
    const extracted = extractProjectName(value);
    if (extracted) {
      setProjectName(extracted);
    }
  };

  const validateInput = () => {
    if (!gitUrl.trim()) {
      setError(language === 'ru' ? 'Введите ссылку на GitHub' : 'Enter GitHub URL');
      return false;
    }
    if (!gitUrl.includes('github.com')) {
      setError(language === 'ru' ? 'Неверная ссылка на GitHub' : 'Invalid GitHub URL');
      return false;
    }
    if (!projectName.trim()) {
      setError(language === 'ru' ? 'Введите название проекта' : 'Enter project name');
      return false;
    }
    return true;
  };

  const handleDeploy = async () => {
    setError('');
    if (!validateInput()) {
      return;
    }

    setIsLoading(true);
    try {
      await onDeploy(gitUrl, projectName);
      onClose();
    } catch (err) {
      setError(
        language === 'ru'
          ? 'Ошибка при деплое проекта'
          : 'Error deploying project'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
            {t.addProject}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {t.githubUrl}
            </label>
            <Input
              placeholder="https://github.com/user/repo"
              value={gitUrl}
              onChange={(e) => handleGitUrlChange(e.target.value)}
              disabled={isLoading}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-300">
              {t.projectName}
            </label>
            <Input
              placeholder={t.projectName}
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {error && (
            <p className="text-sm text-red-500">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="border-gray-800 text-gray-300 hover:bg-gray-800"
          >
            {language === 'ru' ? 'Отмена' : 'Cancel'}
          </Button>
          <Button
            onClick={handleDeploy}
            disabled={isLoading}
            className="bg-white text-black hover:bg-gray-200"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {language === 'ru' ? 'Деплой...' : 'Deploying...'}
              </>
            ) : (
              t.deploy
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

