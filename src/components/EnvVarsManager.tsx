'use client';

import { useState, useRef, useEffect } from 'react';
import { Project, ProjectEnvVar } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/components/AuthProvider';
import { getTranslation } from '@/lib/i18n';
import { useLanguage } from '@/components/LanguageContext';
import { 
  Plus, 
  X, 
  Loader2, 
  Copy, 
  Check, 
  Upload, 
  FileText, 
  List, 
  Save 
} from 'lucide-react';

interface EnvVarsManagerProps {
  projectId: string;
  initialEnvVars: ProjectEnvVar[];
  onUpdate: () => Promise<void>;
}

export function EnvVarsManager({ projectId, initialEnvVars, onUpdate }: EnvVarsManagerProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = getTranslation(language);

  const [mode, setMode] = useState<'list' | 'raw'>('list');
  const [envVars, setEnvVars] = useState<ProjectEnvVar[]>(initialEnvVars || []);
  const [isSaving, setIsSaving] = useState(false);
  
  // Для добавления одной переменной (режим списка)
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  
  // Для копирования
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Для Raw режима
  const [rawContent, setRawContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Синхронизация при обновлении пропсов
  useEffect(() => {
    setEnvVars(initialEnvVars || []);
  }, [initialEnvVars]);

  // При переключении в Raw режим генерируем текст из текущих переменных
  useEffect(() => {
    if (mode === 'raw') {
      const text = envVars.map(v => `${v.key}=${v.value}`).join('\n');
      setRawContent(text);
    }
  }, [mode, envVars]);

  const saveEnvVars = async (newVars: ProjectEnvVar[]) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ envVars: newVars }),
      });

      if (res.ok) {
        await onUpdate();
        // Если мы в режиме добавления, очищаем поля
        setNewKey('');
        setNewValue('');
      } else {
        alert(t.saveVarError);
      }
    } catch (error) {
      console.error('Error saving env vars:', error);
      alert(t.saveVarError);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSingle = () => {
    if (!newKey.trim() || !newValue.trim()) return;
    const updated = [...envVars, { key: newKey.trim(), value: newValue.trim() }];
    saveEnvVars(updated);
  };

  const handleRemove = (index: number) => {
    const updated = envVars.filter((_, i) => i !== index);
    saveEnvVars(updated);
  };

  const handleSaveRaw = () => {
    // Парсинг содержимого Textarea
    const lines = rawContent.split('\n');
    const parsedVars: ProjectEnvVar[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue; // Пропуск комментариев и пустых строк
      
      const firstEqualIndex = trimmed.indexOf('=');
      if (firstEqualIndex === -1) continue; // Пропуск строк без =

      const key = trimmed.slice(0, firstEqualIndex).trim();
      let value = trimmed.slice(firstEqualIndex + 1).trim();

      // Удаление кавычек, если они есть
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }

      if (key) {
        parsedVars.push({ key, value });
      }
    }
    
    saveEnvVars(parsedVars);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        // Добавляем содержимое файла к текущему содержимому редактора (или заменяем)
        // Здесь мы просто вставляем в редактор, пользователь сам нажмет Сохранить
        setRawContent(text); 
      }
    };
    reader.readAsText(file);
    // Сброс input, чтобы можно было загрузить тот же файл снова
    e.target.value = '';
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(null), 2000);
    } catch (error) {
      console.error('Copy error:', error);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-black/30 p-2 rounded-lg">
        <div className="flex gap-2">
          <Button
            variant={mode === 'list' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('list')}
            className="text-sm"
          >
            <List className="h-4 w-4 mr-2" />
            {t.envListMode}
          </Button>
          <Button
            variant={mode === 'raw' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => setMode('raw')}
            className="text-sm"
          >
            <FileText className="h-4 w-4 mr-2" />
            {t.envRawMode}
          </Button>
        </div>
        
        {mode === 'raw' && (
           <div className="flex gap-2">
             <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".env,text/plain"
                onChange={handleFileUpload}
             />
             <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                className="bg-transparent border-gray-600 hover:bg-gray-800"
             >
               <Upload className="h-4 w-4 mr-2" />
               {t.uploadEnv}
             </Button>
             <Button 
                size="sm" 
                onClick={handleSaveRaw}
                disabled={isSaving}
                className="bg-white text-black hover:bg-gray-200"
             >
               {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
               {t.saveChanges}
             </Button>
           </div>
        )}
      </div>

      {mode === 'list' ? (
        <div className="space-y-4">
          <div className="bg-black/30 rounded-lg p-4">
            <div className="text-sm font-medium text-gray-300 mb-3">
              {t.addEnvVar}
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Input
                value={newKey}
                onChange={(e) => setNewKey(e.target.value)}
                placeholder="KEY"
                className="bg-black/50 border-gray-700 font-mono"
              />
              <Input
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="VALUE"
                className="bg-black/50 border-gray-700 font-mono"
                type="text" // Можно password, но часто удобнее видеть
              />
              <Button
                onClick={handleAddSingle}
                disabled={!newKey.trim() || !newValue.trim() || isSaving}
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

          <div className="space-y-2">
            {envVars.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {t.noEnvVars}
              </div>
            ) : (
              envVars.map((envVar, index) => (
                <div key={index} className="bg-black/30 rounded-lg p-3 sm:p-4 flex items-center justify-between group">
                  <div className="flex-1 overflow-hidden mr-4">
                    <div className="font-mono text-sm text-blue-400 mb-1 truncate">{envVar.key}</div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-mono text-xs truncate max-w-[200px] sm:max-w-md bg-black/20 px-1.5 py-0.5 rounded">
                        {envVar.value}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(envVar.value, `${envVar.key}-value`)}
                        className="h-6 w-6 p-0 opacity-50 group-hover:opacity-100 transition-opacity"
                        title={t.copy}
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
                    onClick={() => handleRemove(index)}
                    disabled={isSaving}
                    className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="bg-black/30 rounded-lg p-4">
            <p className="text-xs text-gray-400 mb-2">
                {language === 'ru' 
                    ? 'Введите переменные в формате KEY=VALUE. Каждая с новой строки. # для комментариев.' 
                    : 'Enter variables as KEY=VALUE. One per line. Use # for comments.'}
            </p>
            <Textarea 
                value={rawContent}
                onChange={(e) => setRawContent(e.target.value)}
                className="bg-black/50 border-gray-700 font-mono text-sm min-h-[300px] whitespace-pre"
                placeholder="DB_HOST=localhost&#10;DB_USER=admin"
            />
        </div>
      )}
    </div>
  );
}