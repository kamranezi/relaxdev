'use client';

import { Project } from '@/types';
import { getTranslation, Language } from '@/lib/i18n';
import { CheckCircle2, Loader2, XCircle, ExternalLink } from 'lucide-react';

interface ProjectCardProps {
  project: Project;
  language: Language;
}

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
        >
          <ExternalLink className="h-4 w-4" />
        </a>
      </div>
      
      <p className="text-gray-400 mb-4 font-mono text-sm">{project.domain}</p>
      
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

