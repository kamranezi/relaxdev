// src/components/Header.tsx
'use client';

import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Bell, Layers } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext'; // Используем наш новый контекст
import { getTranslation } from '@/lib/i18n';
import Link from 'next/link'; // Для навигации

// Иконка Github (локальная для этого компонента)
const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg aria-hidden="true" height="16" viewBox="0 0 16 16" version="1.1" width="16" {...props}>
    <path fillRule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
  </svg>
);

export function Header() {
  const { user, loading: authLoading, signInWithGitHub, signOut } = useAuth();
  const { language, setLanguage } = useLanguage(); // Берем язык из контекста
  const t = getTranslation(language);

  return (
    // ⭐ sticky top-0: Приклеивает хедер к верху
    // ⭐ z-50: Поверх всего контента
    // ⭐ backdrop-blur: Красивый эффект размытия фона при скролле
    <header className="sticky top-0 z-50 flex items-center justify-between p-4 md:p-6 border-b border-gray-800 w-full bg-[#0A0A0A]/90 backdrop-blur-sm">
      <Link href="/" className="flex items-center space-x-3 md:space-x-4 cursor-pointer">
        <Layers className="h-7 w-7 md:h-8 md:w-8 text-white" />
        <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-gray-200 to-gray-400 bg-clip-text text-transparent">
          Relax Dev
        </h1>
      </Link>
      
      <div className="flex items-center space-x-2 md:space-x-4">
        <LanguageToggle language={language} onLanguageChange={setLanguage} />
        
        <button className="text-gray-400 hover:text-white transition-colors p-2 hidden sm:block">
          <Bell className="h-5 w-5 md:h-6 md:w-6" />
        </button>
        
        {user ? (
          <div className="flex items-center gap-3 pl-2 sm:border-l border-gray-800">
            <div className="text-right hidden sm:block">
              <div className="text-sm text-white font-medium truncate">{user.displayName}</div>
              <div className="text-xs text-gray-500 truncate">{user.email}</div>
            </div>
            {user.photoURL && (
              <Image 
                src={user.photoURL} 
                alt="Avatar" 
                width={40} 
                height={40} 
                className="rounded-full border border-gray-700"
              />
            )}
            <Button 
              variant="ghost" 
              onClick={signOut} 
              className="text-xs text-gray-400 hover:text-white px-2 hidden sm:block"
            >
              {t.signout}
            </Button>
          </div>
        ) : (
          !authLoading && (
            <Button 
                onClick={signInWithGitHub} 
                className="bg-[#24292e] text-white hover:bg-[#2f363d] flex items-center gap-2 px-4 py-2 rounded-md">
                <GithubIcon className="fill-white"/>
                <span className='hidden sm:inline'>{t.signin}</span>
            </Button>
          )
        )}
      </div>
    </header>
  );
}