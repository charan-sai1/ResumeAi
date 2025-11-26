import React, { useState } from 'react';
import { Card, Button } from './UIComponents';
import { Github } from 'lucide-react';
import { Check } from 'lucide-react';
import { Loader } from 'lucide-react';
import { AlertCircle } from 'lucide-react';
import { Zap } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import { UserProfileMemory } from '../types';

interface GitHubConnectProps {
  isConnected: boolean;
  onConnect: () => Promise<void>;
  onAnalyzeProfile: () => Promise<void>;
  isAnalyzing: boolean;
  memory: UserProfileMemory;
}

const GitHubConnect: React.FC<GitHubConnectProps> = ({
  isConnected,
  onConnect,
  onAnalyzeProfile,
  isAnalyzing,
  memory
}) => {
  const hasGitHubData = memory.githubProjects && memory.githubProjects.length > 0;

  // If we have data, don't show this component at all (it should be hidden by parent)
  if (hasGitHubData) {
    return null;
  }

  return (
    <Card className="p-6 border-slate-700">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg bg-slate-800 flex items-center justify-center">
            <Github className="w-7 h-7 text-slate-400" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">GitHub Profile</h3>
            <p className="text-sm text-slate-400">
              {isConnected ? 'Connected' : 'Not connected'}
            </p>
          </div>
        </div>
        {isConnected && (
          <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-900/20 text-green-400 text-sm font-medium border border-green-900/30">
            <Check className="w-4 h-4" /> Connected
          </span>
        )}
      </div>

      {!isConnected ? (
        <div className="space-y-4">
          <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2">Why Connect GitHub?</h4>
            <ul className="text-sm text-slate-400 space-y-2">
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Automatically analyze all your repositories</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>AI-powered project summaries and metrics</span>
              </li>
              <li className="flex items-start gap-2">
                <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                <span>Smart project selection for job applications</span>
              </li>
            </ul>
          </div>

          <Button
            variant="primary"
            onClick={onConnect}
            className="w-full bg-[#333] hover:bg-[#222] text-white"
          >
            <Github className="w-5 h-5 mr-2" />
            Connect GitHub Account
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {hasGitHubData ? (
            <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-white font-semibold">Profile Analyzed</h4>
                <span className="text-indigo-400 text-sm font-medium">
                  {memory.githubProjects.length} projects
                </span>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Your GitHub profile has been analyzed. Projects are ready to use in resumes.
              </p>
              <Button
                variant="secondary"
                onClick={onAnalyzeProfile}
                loading={isAnalyzing}
                className="w-full"
              >
                <Zap className="w-4 h-4 mr-2" />
                Re-analyze Profile
              </Button>
            </div>
          ) : (
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                <h4 className="text-white font-semibold">Ready to Analyze</h4>
              </div>
              <p className="text-sm text-slate-400 mb-4">
                Click below to analyze your GitHub profile and repositories. AI will extract key projects, technologies, and achievements.
              </p>
              <Button
                variant="ai"
                onClick={onAnalyzeProfile}
                loading={isAnalyzing}
                className="w-full"
              >
                <Zap className="w-4 h-4 mr-2" />
                {isAnalyzing ? 'Analyzing Profile...' : 'Analyze GitHub Profile'}
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default GitHubConnect;
