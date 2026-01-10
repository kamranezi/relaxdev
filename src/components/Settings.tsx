'use client';

import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Language, getTranslation } from '@/lib/i18n';
import { Project } from '@/types';
import { useAuth } from '@/components/AuthProvider';
import { useState } from 'react';

interface SettingsProps {
  project: Project;
  language: Language;
  onSettingsChange: () => void;
}

export function Settings({ project, language, onSettingsChange }: SettingsProps) {
  const t = getTranslation(language);
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Универсальная функция для смены настроек
  const handleSettingChange = async (key: 'autodeploy' | 'isPublic', value: boolean) => {
    if (!user) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await user.getIdToken();
      // Отправляем запрос на обновление
      const response = await fetch(`/api/projects/${project.id}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        // Динамически формируем тело: { autodeploy: ... } или { isPublic: ... }
        body: JSON.stringify({ [key]: value }),
      });

      if (!response.ok) {
        throw new Error(t.autodeployError || 'Failed to update settings');
      }
      
      setSuccess(t.autodeploySuccess || 'Settings saved');
      onSettingsChange(); // Обновляем данные в родителе
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        setSuccess(null);
        setError(null);
      }, 3000);
    }
  };

  return (
    <div className="rounded-lg bg-[#1A1A1A] p-4 sm:p-6 shadow-md space-y-6 sm:space-y-8">
      <h3 className="text-lg sm:text-xl font-bold text-white mb-4 sm:mb-6">{t.settings}</h3>
      
      {/* --- Блок Автодеплоя --- */}
      {/* ⭐ АДАПТАЦИЯ: flex-col на мобильных, flex-row на десктопе */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <Label htmlFor="autodeploy-switch" className="text-white font-medium cursor-pointer text-base">
            {t.autodeploy}
          </Label>
          <p className="text-sm text-gray-400 mt-1">
            {t.autodeployDescription}
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto pt-2 sm:pt-0">
            <span className="sm:hidden text-sm text-gray-500 mr-2">Включить:</span>
            <Switch
                id="autodeploy-switch"
                checked={project.autodeploy}
                onCheckedChange={(checked) => handleSettingChange('autodeploy', checked)}
                disabled={isSaving}
            />
        </div>
      </div>

      <div className="border-t border-gray-800 my-4" />

      {/* --- Блок Публичности --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col">
          <Label htmlFor="public-switch" className="text-white font-medium cursor-pointer text-base">
            {t.publicProject || 'Публичный проект'}
          </Label>
          <p className="text-sm text-gray-400 mt-1">
            {t.publicProjectDescription || 'Разрешить всем пользователям просматривать этот проект.'}
          </p>
        </div>
        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto pt-2 sm:pt-0">
            <span className="sm:hidden text-sm text-gray-500 mr-2">Включить:</span>
            <Switch
                id="public-switch"
                checked={project.isPublic}
                onCheckedChange={(checked) => handleSettingChange('isPublic', checked)}
                disabled={isSaving}
            />
        </div>
      </div>

      {/* Сообщения о статусе */}
      <div className="min-h-[20px] pt-2">
        {isSaving && <p className="text-sm text-gray-400 animate-pulse">Сохранение...</p>}
        {error && <p className="text-sm text-red-500">{error}</p>}
        {success && <p className="text-sm text-green-500">{success}</p>}
      </div>
    </div>
  );
}