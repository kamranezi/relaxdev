'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/types';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/components/AuthProvider';
import { useLanguage } from '@/components/LanguageContext';
import { getTranslation } from '@/lib/i18n';
import { Loader2, Trash2, RefreshCw, Globe, Github } from 'lucide-react';

interface ProjectSettingsProps {
  project: Project;
  onUpdate: () => void;
}

export function ProjectSettings({ project, onUpdate }: ProjectSettingsProps) {
  const router = useRouter();
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = getTranslation(language);

  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Универсальная функция для смены настроек (PUT /api/projects/[id])
  const handleSettingChange = async (key: 'autodeploy' | 'isPublic', value: boolean) => {
    if (!user) return;
    setIsUpdating(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await user.getIdToken();
      
      // Используем PUT на основной роут проекта
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error('Failed to update settings');
      }
      
      setSuccess(key === 'autodeploy' ? t.autodeploySuccess : 'Settings saved');
      onUpdate(); // Обновляем данные в родителе
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsUpdating(false);
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
    }
  };

  // Функция удаления проекта (DELETE /api/projects/[id])
  const handleDelete = async () => {
    if (!confirm(t.deleteConfirmation)) return;
    
    setIsDeleting(true);
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`/api/projects/${project.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        router.push('/');
      } else {
        const err = await res.json();
        alert(err.error || t.deleteError);
      }
    } catch (error) {
      console.error(error);
      alert(t.deleteError);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg bg-[#111] border border-gray-800 p-4 sm:p-6 space-y-6 sm:space-y-8">
        <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5" />
            {t.settings}
        </h3>
        
        {/* --- Блок Автодеплоя --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="autodeploy-switch" className="text-white font-medium cursor-pointer text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-400" />
              {t.autodeploy}
            </Label>
            <p className="text-sm text-gray-400">
              {t.autodeployDescription}
            </p>
          </div>
          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto pt-2 sm:pt-0">
              <span className="sm:hidden text-sm text-gray-500 mr-2">Status:</span>
              <Switch
                  id="autodeploy-switch"
                  checked={project.autodeploy !== false}
                  onCheckedChange={(checked) => handleSettingChange('autodeploy', checked)}
                  disabled={isUpdating}
                  className="data-[state=checked]:bg-blue-600"
              />
          </div>
        </div>

        <div className="border-t border-gray-800 my-4" />

        {/* --- Блок Публичности --- */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col space-y-1">
            <Label htmlFor="public-switch" className="text-white font-medium cursor-pointer text-base flex items-center gap-2">
              <Globe className="w-4 h-4 text-green-400" />
              {t.publicProject}
            </Label>
            <p className="text-sm text-gray-400">
              {t.publicProjectDescription}
            </p>
          </div>
          <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto pt-2 sm:pt-0">
              <span className="sm:hidden text-sm text-gray-500 mr-2">Status:</span>
              <Switch
                  id="public-switch"
                  checked={project.isPublic}
                  onCheckedChange={(checked) => handleSettingChange('isPublic', checked)}
                  disabled={isUpdating}
                  className="data-[state=checked]:bg-green-600"
              />
          </div>
        </div>

        {/* --- Информационный блок --- */}
        <div className="border-t border-gray-800 my-4" />
        <div className="space-y-4">
             <div>
                <Label className="text-gray-500 text-xs uppercase tracking-wider mb-2 block">
                    {t.githubUrl}
                </Label>
                <div className="flex items-center gap-2 bg-black/50 p-3 rounded border border-gray-700 text-gray-300 font-mono text-sm break-all">
                    <Github className="w-4 h-4 flex-shrink-0" />
                    {project.repoUrl}
                </div>
            </div>
        </div>

        {/* Сообщения о статусе */}
        <div className="min-h-[20px]">
          {isUpdating && <p className="text-sm text-gray-400 animate-pulse">Saving...</p>}
          {error && <p className="text-sm text-red-500">{error}</p>}
          {success && <p className="text-sm text-green-500">{success}</p>}
        </div>
      </div>

      {/* --- Danger Zone (Удаление) --- */}
      <div className="border border-red-900/50 bg-red-900/10 rounded-lg p-5 mt-8">
        <h3 className="text-red-400 font-bold mb-2 uppercase text-sm tracking-wider flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Danger Zone
        </h3>
        <p className="text-gray-400 text-sm mb-4">
          {language === 'ru' 
            ? 'Это действие необратимо. Проект будет удален, а все ресурсы (контейнеры, образы) очищены.' 
            : 'This action cannot be undone. The project and all associated resources will be permanently deleted.'}
        </p>
        <Button 
          variant="destructive" 
          onClick={handleDelete} 
          disabled={isDeleting}
          className="bg-red-600 hover:bg-red-700 text-white w-full sm:w-auto"
        >
          {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
          {t.delete}
        </Button>
      </div>
    </div>
  );
}

// Вспомогательная иконка, если нужна локально, или импортируйте из lucide-react
function SettingsIcon({ className }: { className?: string }) {
    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="currentColor" 
            strokeWidth="2" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            className={className}
        >
            <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}