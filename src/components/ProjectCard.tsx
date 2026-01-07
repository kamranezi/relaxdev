'use client';

import { Project } from '@/types';
import { Language, getTranslation } from '@/lib/i18n';
import { CheckCircle2, Loader2, XCircle, ExternalLink, AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { useState } from 'react';

interface ProjectCardProps {
  project: Project;
  language: Language;
  onRedeploy: () => Promise<void>;
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

export function ProjectCard({ project, language, onRedeploy }: ProjectCardProps) {
  const t = getTranslation(language);
  const { user } = useAuth();
  const [isRedeploying, setIsRedeploying] = useState(false);

  const handleRedeploy = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Остановить всплытие, чтобы не сработал клик по карточке
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
          // Передаем переменные окружения, если они есть
          envVars: project.envVars, 
        }),
      });

      if (!response.ok) {
        throw new Error('Redeployment failed');
      }
      // После успешного запроса на переразвертывание, вызываем коллбэк для обновления списка
      await onRedeploy(); 

    } catch (error) {
      console.error('Redeploy error:', error);
      // Здесь можно показать уведомление об ошибке
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
  const domainUrl = project.domain.startsWith('http') ? project.domain : `https://${project.domain}`;
  const hasWarnings = (project.buildErrors && project.buildErrors.length > 0) || 
                     (project.missingEnvVars && project.missingEnvVars.length > 0);

  return (
    <div 
      className="bg-[#1A1A1A] rounded-lg shadow-lg p-6 hover:shadow-cyan-500/20 hover:border-gray-800 transition-all duration-300 group flex flex-col justify-between h-full"
    >
      <div onClick={() => window.location.href = `/projects/${project.id}`} className="cursor-pointer">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors truncate">
            {project.name}
          </h3>
          <div className="flex items-center gap-2">
            {hasWarnings && (
              <span title={t.warnings.title}>
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </span>
            )}
            <a
              href={project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-gray-400 hover:text-white transition-colors"
              title="GitHub Repository"
            >
              <GithubIcon className="h-5 w-5" />
            </a>
          </div>
        </div>
        
        <div className="mb-4 flex items-center justify-between">
          <p className="text-gray-400 font-mono text-sm truncate">{project.domain}</p>
          <a 
            href={domainUrl} 
            target="_blank" 
            rel="noopener noreferrer" 
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-2 text-xs bg-gray-700/50 hover:bg-cyan-500/20 text-cyan-400 px-3 py-1 rounded-full transition-colors"
          >
              {t.visit}
              <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
        
        {hasWarnings && (
          <div className="mb-2 text-xs text-yellow-500 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            <span>
              {project.buildErrors && project.buildErrors.length > 0 && t.warnings.buildErrors}
              {project.buildErrors && project.buildErrors.length > 0 && project.missingEnvVars && project.missingEnvVars.length > 0 && ', '}
              {project.missingEnvVars && project.missingEnvVars.length > 0 && t.warnings.missingVars}
            </span>
          </div>
        )}
      </div>
      
      <div className="flex items-center justify-between mt-auto pt-4">
        <div 
          className={`flex items-center space-x-2 ${statusConfig.isError ? 'cursor-pointer' : ''}`}
          onClick={statusConfig.isError ? handleRedeploy : undefined}
        >
          <span className={`h-3 w-3 rounded-full ${statusConfig.dotColor}`}></span>
          <span className={`text-sm flex items-center gap-1.5 ${statusConfig.color}`}>
            <StatusIcon 
              className={`h-3.5 w-3.5 ${statusConfig.animate || isRedeploying ? 'animate-spin' : ''}`} 
            />
            {isRedeploying ? t.status.building : statusConfig.text}
          </span>
        </div>
        <p className="text-sm text-gray-500">{project.lastDeployed}</p>
      </div>
    </div>
  );
}
