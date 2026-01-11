'use client';

import { useState, useRef, useEffect } from 'react';
import { ProjectEnvVar } from '@/types';
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
  Save,
  Eye,
  EyeOff,
  Pencil
} from 'lucide-react';

interface EnvVarsManagerProps {
  projectId?: string; 
  initialEnvVars: ProjectEnvVar[];
  onUpdate?: () => Promise<void>;
  onChange?: (vars: ProjectEnvVar[]) => void;
}

export function EnvVarsManager({ projectId, initialEnvVars, onUpdate, onChange }: EnvVarsManagerProps) {
  const { user } = useAuth();
  const { language } = useLanguage();
  const t = getTranslation(language);

  const [mode, setMode] = useState<'list' | 'raw'>('list');
  const [envVars, setEnvVars] = useState<ProjectEnvVar[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  // Поля ввода для новой переменной
  const [newKey, setNewKey] = useState('');
  const [newValue, setNewValue] = useState('');
  
  // Inline редактирование
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editKey, setEditKey] = useState('');
  const [editValue, setEditValue] = useState('');
  
  // UI состояния
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [visibleValues, setVisibleValues] = useState<Record<number, boolean>>({});
  const [rawContent, setRawContent] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Инициализация
  useEffect(() => {
    let vars = initialEnvVars;
    if (vars && typeof vars === 'object' && !Array.isArray(vars)) {
      vars = Object.values(vars);
    }
    setEnvVars(Array.isArray(vars) ? vars : []);
  }, [initialEnvVars]);

  // Синхронизация Raw контента
  useEffect(() => {
    if (mode === 'raw') {
      const text = envVars.map(v => `${v.key}=${v.value}`).join('\n');
      setRawContent(text);
    }
  }, [mode, envVars]);

  // Главная функция сохранения
  const handleSaveVars = async (newVars: ProjectEnvVar[]) => {
    // 1. ЛОКАЛЬНЫЙ РЕЖИМ
    if (onChange) {
      setEnvVars(newVars);
      onChange(newVars);
      setNewKey('');
      setNewValue('');
      setEditingIndex(null);
      return;
    }

    // 2. API РЕЖИМ
    if (!projectId || !user) return;
    
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
        if (onUpdate) await onUpdate();
        setNewKey('');
        setNewValue('');
        setEditingIndex(null);
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
    const existingIndex = envVars.findIndex(v => v.key === newKey.trim());
    let updated = [...envVars];
    
    if (existingIndex >= 0) {
      updated[existingIndex] = { key: newKey.trim(), value: newValue.trim() };
    } else {
      updated.push({ key: newKey.trim(), value: newValue.trim() });
    }
    
    handleSaveVars(updated);
  };

  const handleRemove = (index: number) => {
    const updated = envVars.filter((_, i) => i !== index);
    handleSaveVars(updated);
  };

  // ⭐ INLINE РЕДАКТИРОВАНИЕ
  const handleStartEdit = (index: number) => {
    setEditingIndex(index);
    setEditKey(envVars[index].key);
    setEditValue(envVars[index].value);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setEditKey('');
    setEditValue('');
  };

  const handleSaveEdit = () => {
    if (editingIndex === null) return;
    if (!editKey.trim() || !editValue.trim()) return;
    
    const updated = [...envVars];
    updated[editingIndex] = { key: editKey.trim(), value: editValue.trim() };
    handleSaveVars(updated);
  };

  const toggleVisibility = (index: number) => {
    setVisibleValues(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleSaveRaw = () => {
    const lines = rawContent.split('\n');
    const parsedVars: ProjectEnvVar[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const firstEqualIndex = trimmed.indexOf('=');
      if (firstEqualIndex === -1) continue;
      const key = trimmed.slice(0, firstEqualIndex).trim();
      let value = trimmed.slice(firstEqualIndex + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      if (key) parsedVars.push({ key, value });
    }
    
    handleSaveVars(parsedVars);
    if (onChange) setMode('list'); 
  };

  // ⭐ ИСПРАВЛЕННАЯ ОБРАБОТКА ЗАГРУЗКИ ФАЙЛОВ
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;
      
      const isJSON = file.name.endsWith('.json') || (text.trim().startsWith('{') && text.trim().endsWith('}'));
      
      if (isJSON) {
        try {
          const json = JSON.parse(text);
          let content = '';
          if (typeof json === 'object' && json !== null) {
            Object.entries(json).forEach(([key, value]) => {
              const val = String(value);
              // Если значение содержит пробелы или переносы, лучше обернуть в кавычки, но для raw вида часто оставляют как есть
              content += `${key}=${val}\n`;
            });
          }
          setRawContent(content.trim());
        } catch (error) {
          console.error('Invalid JSON:', error);
          setRawContent(text);
        }
      } else {
        // ДЛЯ ОБЫЧНЫХ .ENV и ТЕКСТОВЫХ ФАЙЛОВ
        // Просто берем текст как есть, но можно сразу почистить пустые строки если надо
        setRawContent(text);
      }
    };
    reader.readAsText(file);
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
      {/* --- ТУЛБАР (SCROLL + ADAPTATION) --- */}
      <div className="bg-black/30 p-2 rounded-lg overflow-x-auto custom-scrollbar">
        <div className="flex items-center justify-between min-w-max gap-4">
          <div className="flex gap-2">
            <Button 
              variant={mode === 'list' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setMode('list')} 
              className="text-sm"
            >
              <List className="h-4 w-4 mr-2" />{t.envListMode}
            </Button>
            <Button 
              variant={mode === 'raw' ? 'secondary' : 'ghost'} 
              size="sm" 
              onClick={() => setMode('raw')} 
              className="text-sm"
            >
              <FileText className="h-4 w-4 mr-2" />{t.envRawMode}
            </Button>
          </div>
          {mode === 'raw' && (
            <div className="flex gap-2">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="*,.env,.txt,.json,text/plain,application/json" 
                onChange={handleFileUpload} 
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()} 
                className="bg-transparent border-gray-600 hover:bg-gray-800"
              >
                <Upload className="h-4 w-4 mr-2" />{t.uploadEnv}
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
      </div>

      {/* --- СПИСОК --- */}
      {mode === 'list' ? (
        <div className="space-y-4">
          <div className="bg-black/30 rounded-lg p-4 border border-gray-800">
            <div className="text-sm font-medium text-gray-300 mb-3">{t.addEnvVar}</div>
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
                className="bg-black/50 border-gray-700 font-mono flex-1" 
                type="text" 
              />
              <Button 
                onClick={handleAddSingle} 
                disabled={!newKey.trim() || !newValue.trim() || isSaving} 
                className="bg-white text-black hover:bg-gray-200 flex-shrink-0"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : (
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
              <div className="text-center py-8 text-gray-500">{t.noEnvVars}</div>
            ) : (
              envVars.map((envVar, index) => (
                <div 
                  key={index} 
                  className="bg-black/30 rounded-lg p-3 sm:p-4 hover:border-gray-700 border border-transparent transition-all"
                >
                  {editingIndex === index ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input 
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                        placeholder="KEY"
                        className="bg-black/50 border-gray-700 font-mono"
                      />
                      <Input 
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        placeholder="VALUE"
                        className="bg-black/50 border-gray-700 font-mono flex-1"
                      />
                      <div className="flex gap-2">
                        <Button 
                          onClick={handleSaveEdit}
                          disabled={!editKey.trim() || !editValue.trim() || isSaving}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button 
                          onClick={handleCancelEdit}
                          size="sm"
                          variant="ghost"
                          className="text-gray-400 hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between group">
                      <div className="flex-1 overflow-hidden mr-4">
                        <div className="font-mono text-sm text-blue-400 mb-1 truncate">{envVar.key}</div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-300 font-mono text-xs truncate block bg-black/40 px-2 py-1 rounded min-w-[120px] sm:min-w-[150px] max-w-[200px] sm:max-w-md">
                            {visibleValues[index] ? envVar.value : '••••••••••••'}
                          </span>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => toggleVisibility(index)} 
                            className="h-6 w-6 p-0 text-gray-500 hover:text-white"
                          >
                            {visibleValues[index] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </Button>

                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => copyToClipboard(envVar.value, `${envVar.key}-value`)} 
                            className="h-6 w-6 p-0 text-gray-500 hover:text-white"
                          >
                            {copiedKey === `${envVar.key}-value` ? (
                              <Check className="h-3 w-3 text-green-400" />
                            ) : (
                              <Copy className="h-3 w-3" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleStartEdit(index)} 
                          disabled={isSaving}
                          className="text-gray-400 hover:text-blue-400 h-8 w-8 p-0"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>

                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleRemove(index)} 
                          disabled={isSaving}
                          className="text-gray-400 hover:text-red-400 h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* --- RAW EDITOR --- */
        <div className="bg-black/30 rounded-lg p-4 border border-gray-800">
          <p className="text-xs text-gray-400 mb-2">
            {language === 'ru' 
              ? 'Формат: KEY=VALUE (каждая с новой строки). Поддерживаются .env, .txt и .json файлы.' 
              : 'Format: KEY=VALUE (one per line). Supports .env, .txt and .json files.'}
          </p>
          <Textarea 
            value={rawContent}
            onChange={(e) => setRawContent(e.target.value)}
            className="bg-black/50 border-gray-700 font-mono text-sm min-h-[300px] whitespace-pre"
            placeholder="DB_HOST=localhost&#10;DB_USER=admin"
          />
          {onChange && (
            <Button 
              onClick={handleSaveRaw} 
              className="mt-4 w-full bg-white text-black hover:bg-gray-200"
            >
              {t.saveChanges}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}