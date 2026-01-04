'use client';

import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Language } from '@/lib/i18n';

interface LanguageToggleProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageToggle({ language, onLanguageChange }: LanguageToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onLanguageChange(language === 'ru' ? 'en' : 'ru')}
      className="text-gray-400 hover:text-white"
    >
      <Globe className="h-4 w-4 mr-2" />
      {language === 'ru' ? 'EN' : 'RU'}
    </Button>
  );
}

