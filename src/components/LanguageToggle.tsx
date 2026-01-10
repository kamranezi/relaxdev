'use client';

import { Button } from '@/components/ui/button';
import { Language } from '@/lib/i18n';
import { RuFlag } from './RuFlag';
import { EnglandFlag } from './EnglandFlag';

interface LanguageToggleProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
}

export function LanguageToggle({
  language,
  onLanguageChange,
}: LanguageToggleProps) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => onLanguageChange(language === 'ru' ? 'en' : 'ru')}
      className="text-gray-400 hover:text-white flex items-center gap-2"
    >
      {language === 'ru' ? (
        <>
          <EnglandFlag className="h-4 w-6" />
          <span>EN</span>
        </>
      ) : (
        <>
          <RuFlag className="h-4 w-6" />
          <span>RU</span>
        </>
      )}
    </Button>
  );
}
