'use client';

import { Project } from '@/types';
import { Language, getTranslation } from '@/lib/i18n';
import { CheckCircle2, Loader2, XCircle, AlertCircle, RefreshCw, Globe, User as UserIcon } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface ProjectCardProps {
  project: Project;
  language: Language;
  onRedeploy: () => Promise<void>;
  isPublic?: boolean;
  ownerLogin?: string | null; 
}

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="24" 
        height="24" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        {...props}
    >
        <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35.0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35.0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
        <path d="M9 18c-4.51 2-5-2-7-2"/>
    </svg>
);

export function ProjectCard({ project, language, onRedeploy, isPublic, ownerLogin }: ProjectCardProps) {
  const t = getTranslation(language);
  const { user } = useAuth();
  const router = useRouter();
  const [isRedeploying, setIsRedeploying] = useState(false);
  const [imageError, setImageError] = useState(false);

  // ⭐ Используем флаг canEdit (по умолчанию true для старых версий API, но лучше false)
  // Если canEdit undefined (старый API), считаем false для безопасности, если это не владелец
  // Но так как мы обновили API, поле должно быть.
  const canEdit = project.canEdit;

  const handleRedeploy = async (e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!user || isRedeploying) return;

    setIsRedeploying(true);
    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          gitUrl: project.repoUrl, 
          projectName: project.name,
          envVars: project.envVars, 
          isPublic: project.isPublic,
        }),
      });

      if (!response.ok) {
        throw new Error('Redeployment failed');
      }
      await onRedeploy(); 

    } catch (error) {
      console.error('Redeploy error:', error);
    } finally {
      setIsRedeploying(false);
    }
  };

  const getStatusConfig = () => {
    const isError = project.status === 'Ошибка' || project.status === 'Error';
    if (isRedeploying) {
      return {
        icon: Loader2,
        color: 'text-yellow-500',
        dotColor: 'bg-yellow-500',
        text: t.status.building,
        animate: true,
      };
    }

    const isActive = project.status === 'Активен' || project.status === 'Live';
    if (isActive) {
      return {
        icon: CheckCircle2,
        color: 'text-green-500',
        dotColor: 'bg-green-500',
        text: t.status.live,
      };
    }
    const isBuilding = project.status === 'Сборка' || project.status === 'Building';
    if (isBuilding) {
      return {
        icon: Loader2,
        color: 'text-yellow-500',
        dotColor: 'bg-yellow-500',
        text: t.status.building,
        animate: true,
      };
    }
    
    return {
      icon: isError ? RefreshCw : XCircle,
      color: 'text-red-500',
      dotColor: 'bg-red-500',
      text: t.status.error,
      isError: true
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;
  const domainUrl = project.domain ? (project.domain.startsWith('http') ? project.domain : `https://${project.domain}`) : null;
  const hasWarnings = (project.buildErrors && project.buildErrors.length > 0) || 
                     (project.missingEnvVars && project.missingEnvVars.length > 0);

  const handleCardClick = () => {
    // ⭐ Переход только если есть права
    if (canEdit) {
      router.push(`/projects/${project.id}`);
    }
  };

  return (
    <div 
      className={`bg-[#1A1A1A] rounded-lg shadow-lg p-5 transition-all duration-300 group flex flex-col justify-between h-full border border-transparent 
        ${canEdit ? 'hover:shadow-cyan-500/20 hover:border-gray-800' : 'opacity-90'}
      `}
    >
      {/* ⭐ Условный cursor-pointer */}
      <div 
        onClick={handleCardClick} 
        className={`${canEdit ? 'cursor-pointer' : 'cursor-default'} flex-grow`}
      >
        <div className="flex items-start justify-between mb-3">
          <h3 className={`text-lg font-bold text-white break-all pr-2 ${canEdit ? 'group-hover:text-gray-200' : ''} transition-colors`}>
            {project.name}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isPublic && (
                <div title="Публичный проект" className="flex items-center gap-1 text-xs text-gray-400 bg-gray-700/50 px-2 py-1 rounded-full">
                    <Globe className="h-3 w-3" />
                </div>
            )}
            {hasWarnings && canEdit && (
              <span title={t.warnings.title}>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </span>
            )}
          </div>
        </div>
        
        <div className="mb-4">
            {domainUrl ? (
                <a 
                    href={domainUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    // ⭐ stopPropagation важен, чтобы клик по ссылке работал даже если клик по карточке отключен
                    onClick={(e) => e.stopPropagation()}
                    className="font-mono text-sm text-cyan-400 hover:underline truncate block"
                >
                    {project.domain}
                </a>
            ) : (
                <span className="font-mono text-sm text-gray-600 block italic">
                    {language === 'ru' ? 'Здесь будет ссылка на ваш сайт...' : 'Your website link will appear here...'}
                </span>
            )}
        </div>
        
        <div className="mb-4 text-xs text-gray-400 flex items-center gap-2">
          <GithubIcon className="h-4 w-4 shrink-0" />
          <a 
            href={project.repoUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={(e) => e.stopPropagation()}
            className="hover:text-white transition-colors truncate"
          >
            {project.repoUrl.replace('https://github.com/', '')}
          </a>
        </div>
      </div>
      
      <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-800/50">
        <div 
          className={`flex items-center space-x-2 ${statusConfig.isError && canEdit ? 'cursor-pointer' : ''}`}
          // ⭐ Редеплой по клику на иконку только если есть права
          onClick={(statusConfig.isError && canEdit) ? handleRedeploy : undefined}
        >
           <div className={`flex items-center gap-1.5 ${statusConfig.color}`}>
            <StatusIcon 
              className={`h-4 w-4 ${statusConfig.animate || isRedeploying ? 'animate-spin' : ''}`} 
            />
            <span className="text-sm">
              {isRedeploying ? t.status.building : statusConfig.text}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3">
            {ownerLogin && !imageError ? (
              <a href={`https://github.com/${ownerLogin}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-300 transition-colors">
                <Image 
                  src={`https://github.com/${ownerLogin}.png`} 
                  alt={ownerLogin} 
                  width={20} 
                  height={20} 
                  className="rounded-full" 
                  onError={() => setImageError(true)}
                  unoptimized
                />
              </a>
            ) : ownerLogin ? (
                <a href={`https://github.com/${ownerLogin}`} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-400">
                   <UserIcon className="h-5 w-5" />
                </a>
             ) : null}
          <p className="text-sm text-gray-500">{project.lastDeployed}</p>
        </div>
      </div>
    </div>
  );
}