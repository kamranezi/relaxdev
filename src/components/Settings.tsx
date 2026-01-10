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

  const handleAutodeployChange = async (autodeploy: boolean) => {
    if (!user) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const token = await user.getIdToken();
      const response = await fetch(`/api/projects/${project.id}/settings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ autodeploy }),
      });

      if (!response.ok) {
        throw new Error(t.autodeployError);
      }
      setSuccess(t.autodeploySuccess);
      onSettingsChange();
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
    <div className="rounded-lg bg-[#1A1A1A] p-6 shadow-md">
      <h3 className="text-xl font-bold text-white mb-6">{t.settings}</h3>
      <div className="flex items-center justify-between space-x-4">
        <div className="flex flex-col">
          <Label htmlFor="autodeploy-switch" className="text-white font-medium">
            {t.autodeploy}
          </Label>
          <p className="text-sm text-gray-400 mt-1">
            {t.autodeployDescription}
          </p>
        </div>
        <Switch
          id="autodeploy-switch"
          checked={project.autodeploy}
          onCheckedChange={handleAutodeployChange}
          disabled={isSaving}
        />
      </div>
      {isSaving && <p className="text-sm text-gray-400 mt-4">Сохранение...</p>}
      {error && <p className="text-sm text-red-500 mt-4">{error}</p>}
      {success && <p className="text-sm text-green-500 mt-4">{success}</p>}
    </div>
  );
}
