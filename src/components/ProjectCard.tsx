'use client';

import { Project } from '@/types';
import { getTranslation, Language } from '@/lib/i18n';
import { CheckCircle2, Loader2, XCircle, ExternalLink } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  language: Language;
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

export function ProjectCard({ project, language }: ProjectCardProps) {
  const t = getTranslation(language);
  
  const getStatusConfig = () => {
    const isActive = project.status === 'Активен' || project.status === 'Live';
    const isBuilding = project.status === 'Сборка' || project.status === 'Building';
    const isError = project.status === 'Ошибка' || project.status === 'Error';
    
    if (isActive) {
      return {
        icon: CheckCircle2,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        dotColor: 'bg-green-500',
        text: language === 'ru' ? 'Активен' : 'Live',
      };
    }
    if (isBuilding) {
      return {
        icon: Loader2,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        dotColor: 'bg-yellow-500',
        text: language === 'ru' ? 'Сборка' : 'Building',
        animate: true,
      };
    }
    return {
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
      dotColor: 'bg-red-500',
      text: language === 'ru' ? 'Ошибка' : 'Error',
    };
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <div className="bg-[#1A1A1A] rounded-lg shadow-lg p-6 hover:shadow-cyan-500/20 hover:border border-gray-800 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white group-hover:text-gray-200 transition-colors">
          {project.name}
        </h3>
        <a
          href={project.repoUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
          title="GitHub Repository"
        >
          <GithubIcon className="h-5 w-5" />
        </a>
      </div>
      
      <a href={`https://${project.domain}`} target="_blank" rel="noopener noreferrer" className="text-gray-400 mb-4 font-mono text-sm hover:text-cyan-400 transition-colors flex items-center gap-2">
        {project.domain}
        <ExternalLink className="h-4 w-4" />
      </a>
      
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className={`h-3 w-3 rounded-full ${statusConfig.dotColor}`}></span>
          <span className={`text-sm flex items-center gap-1.5 ${statusConfig.color}`}>
            <StatusIcon 
              className={`h-3.5 w-3.5 ${statusConfig.animate ? 'animate-spin' : ''}`} 
            />
            {statusConfig.text}
          </span>
        </div>
        <p className="text-sm text-gray-500">{project.lastDeployed}</p>
      </div>
    </div>
  );
}
