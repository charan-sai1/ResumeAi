import React, { useState, useEffect } from 'react';
import { Card, Button } from './UIComponents';
import { Check } from 'lucide-react';
import { Loader } from 'lucide-react';
import { Star } from 'lucide-react';
import { Github } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import { Zap } from 'lucide-react';
import { AnalyzedProject } from '../types';

interface ProjectSelectorProps {
  projects: AnalyzedProject[];
  selectedProjects: string[];
  onToggleProject: (projectId: string) => void;
  jobRole?: string;
  loading?: boolean;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({
  projects,
  selectedProjects,
  onToggleProject,
  jobRole,
  loading = false
}) => {
  const [sortedProjects, setSortedProjects] = useState<AnalyzedProject[]>(projects);

  useEffect(() => {
    // Sort by relevance score if available, otherwise by completeness
    const sorted = [...projects].sort((a, b) => {
      if (a.relevanceScore !== undefined && b.relevanceScore !== undefined) {
        return b.relevanceScore - a.relevanceScore;
      }
      return b.completenessScore - a.completenessScore;
    });
    setSortedProjects(sorted);
  }, [projects]);

  const getRelevanceBadgeColor = (score?: number) => {
    if (!score) return 'bg-slate-800 text-slate-400';
    if (score >= 80) return 'bg-green-900/30 text-green-400 border-green-900/30';
    if (score >= 60) return 'bg-yellow-900/30 text-yellow-400 border-yellow-900/30';
    return 'bg-red-900/30 text-red-400 border-red-900/30';
  };

  const getRelevanceLabel = (score?: number) => {
    if (!score) return 'Not scored';
    if (score >= 80) return 'Highly Relevant';
    if (score >= 60) return 'Moderately Relevant';
    return 'Less Relevant';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader className="w-8 h-8 text-indigo-400 animate-spin" />
        <span className="ml-3 text-slate-400">Scoring project relevance...</span>
      </div>
    );
  }

  if (sortedProjects.length === 0) {
    return (
      <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
        <Github className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <p className="text-slate-500">No projects available. Connect GitHub and analyze your profile first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {jobRole && (
        <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Zap className="w-4 h-4" />
            <h4 className="font-semibold">AI Relevance Scoring Active</h4>
          </div>
          <p className="text-sm text-slate-400">
            Projects are ranked by relevance to <strong className="text-white">{jobRole}</strong> role
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {sortedProjects.map((project) => {
          const isSelected = selectedProjects.includes(project.id);

          return (
            <Card
              key={project.id}
              className={`cursor-pointer transition-all hover:border-indigo-500/50 ${
                isSelected ? 'border-indigo-500 bg-indigo-900/10' : ''
              }`}
              onClick={() => onToggleProject(project.id)}
            >
              <div className="flex items-start gap-4">
                {/* Selection Checkbox */}
                <div className={`w-6 h-6 flex-shrink-0 rounded border-2 flex items-center justify-center mt-1 transition-colors ${
                  isSelected
                    ? 'bg-indigo-500 border-indigo-500'
                    : 'border-slate-600 hover:border-indigo-400'
                }`}>
                  {isSelected && <Check className="w-4 h-4 text-white" />}
                </div>

                {/* Project Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-white truncate">
                        {project.repoName}
                      </h3>
                      {project.relevanceScore !== undefined && (
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${getRelevanceBadgeColor(project.relevanceScore)}`}>
                            <Star className="w-3 h-3" fill="currentColor" />
                            {project.relevanceScore}% - {getRelevanceLabel(project.relevanceScore)}
                          </span>
                        </div>
                      )}
                    </div>
                    <a
                      href={project.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-slate-500 hover:text-indigo-400 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>

                  <p className="text-sm text-slate-400 mb-3 line-clamp-2">
                    {project.aiSummary || project.description}
                  </p>

                  {/* Metrics */}
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mb-3">
                    <span className="px-2 py-1 rounded bg-slate-800">
                      Completeness: {project.completenessScore}%
                    </span>
                    <span className="px-2 py-1 rounded bg-slate-800 capitalize">
                      {project.activityLevel} Activity
                    </span>
                    {project.language && (
                      <span className="px-2 py-1 rounded bg-slate-800">
                        {project.language}
                      </span>
                    )}
                  </div>

                  {/* Technologies */}
                  {project.advancedTechUsed.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {project.advancedTechUsed.slice(0, 5).map((tech, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 rounded-full bg-indigo-900/30 text-indigo-300 text-xs"
                        >
                          {tech}
                        </span>
                      ))}
                      {project.advancedTechUsed.length > 5 && (
                        <span className="px-2 py-1 text-slate-500 text-xs">
                          +{project.advancedTechUsed.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-slate-900/50 border border-slate-800 rounded-lg">
        <p className="text-sm text-slate-400">
          <strong className="text-white">{selectedProjects.length}</strong> project{selectedProjects.length !== 1 ? 's' : ''} selected
        </p>
      </div>
    </div>
  );
};

export default ProjectSelector;
