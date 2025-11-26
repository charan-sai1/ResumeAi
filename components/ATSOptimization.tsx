import React, { useState } from 'react';
import { Card, Button, Input, TextArea } from './UIComponents';
import { analyzeSkillGaps, enhanceExperienceForATS, optimizeResumeKeywords, SkillGapAnalysis, handleAPIError } from '../services/geminiService';
import { Resume } from '../types';
import { BrainCircuit, Target, TrendingUp, BookOpen, CheckCircle, AlertTriangle, Lightbulb, AlertCircle } from 'lucide-react';

interface Props {
  resume: Resume;
  onUpdateResume: (resume: Resume) => void;
  onNotification?: (notification: { type: 'success' | 'error' | 'warning'; message: string; tips?: string[] }) => void;
}

const ATSOptimization: React.FC<Props> = ({ resume, onUpdateResume, onNotification }) => {
  const [jobDescription, setJobDescription] = useState('');
  const [skillAnalysis, setSkillAnalysis] = useState<SkillGapAnalysis | null>(null);
  const [keywordAnalysis, setKeywordAnalysis] = useState<{keywordMatches: string[], suggestions: string[]} | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [activeTab, setActiveTab] = useState<'gaps' | 'keywords' | 'enhance'>('gaps');

  const analyzeSkills = async () => {
    if (!jobDescription.trim()) return;

    setIsAnalyzing(true);
    try {
      const analysis = await analyzeSkillGaps(resume, jobDescription);
      setSkillAnalysis(analysis);

      // Also run keyword analysis
      const keywordResult = await optimizeResumeKeywords(resume, jobDescription);
      setKeywordAnalysis({
        keywordMatches: keywordResult.keywordMatches,
        suggestions: keywordResult.suggestions
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      const errorInfo = handleAPIError(error, 'analyze skills');
      if (onNotification) {
        onNotification(errorInfo);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const enhanceExperience = async (experienceIndex: number) => {
    if (!skillAnalysis?.missingSkills.length) return;

    setIsOptimizing(true);
    try {
      const experience = resume.experience[experienceIndex];
      const enhanced = await enhanceExperienceForATS(experience.description, skillAnalysis.missingSkills);

      const updatedExperience = [...resume.experience];
      updatedExperience[experienceIndex] = { ...experience, description: enhanced };

      const updatedResume = { ...resume, experience: updatedExperience };
      onUpdateResume(updatedResume);
    } catch (error) {
      console.error('Enhancement error:', error);
    } finally {
      setIsOptimizing(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Target className="w-6 h-6 text-blue-400" />
          Ethical ATS Optimization
        </h2>
        <p className="text-slate-400 mb-6">
          Analyze skill gaps and optimize your resume legitimately for better ATS performance.
          Focus on genuine qualifications and professional presentation.
        </p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Job Description
            </label>
            <TextArea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here to analyze skill requirements..."
              className="min-h-32"
            />
          </div>

          <Button
            onClick={analyzeSkills}
            loading={isAnalyzing}
            disabled={!jobDescription.trim()}
            className="w-full"
          >
            <BrainCircuit className="w-4 h-4 mr-2" />
            Analyze Skills & Keywords
          </Button>
        </div>
      </Card>

      {skillAnalysis && (
        <div className="space-y-4">
          {/* Tab Navigation */}
          <div className="flex space-x-1 bg-slate-800 p-1 rounded-lg">
            {[
              { id: 'gaps', label: 'Skill Gaps', icon: AlertTriangle },
              { id: 'keywords', label: 'Keywords', icon: Target },
              { id: 'enhance', label: 'Enhance', icon: TrendingUp }
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === id
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>

          {/* Skill Gaps Tab */}
          {activeTab === 'gaps' && (
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Skill Gap Analysis</h3>
                <div className="flex items-center gap-2">
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    skillAnalysis.confidence >= 80 ? 'bg-green-900 text-green-300' :
                    skillAnalysis.confidence >= 60 ? 'bg-yellow-900 text-yellow-300' :
                    'bg-red-900 text-red-300'
                  }`}>
                    {skillAnalysis.confidence}% Match
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {skillAnalysis.missingSkills.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-red-400 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Missing Skills
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {skillAnalysis.missingSkills.map((skill, index) => (
                        <span key={index} className="px-3 py-1 bg-red-900/30 text-red-300 rounded-full text-sm">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {skillAnalysis.transferableSkills.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-green-400 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Transferable Skills
                    </h4>
                    <div className="space-y-3">
                      {skillAnalysis.transferableSkills.map((transfer, index) => (
                        <div key={index} className="p-3 bg-green-900/10 border border-green-800/30 rounded-lg">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-green-300 font-medium">{transfer.userSkill}</span>
                            <span className="text-slate-400">→</span>
                            <span className="text-green-400 font-medium">{transfer.targetSkill}</span>
                          </div>
                          <p className="text-sm text-slate-300">{transfer.explanation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {skillAnalysis.recommendedActions.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-blue-400 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Recommended Actions
                    </h4>
                    <div className="space-y-2">
                      {skillAnalysis.recommendedActions.map((action, index) => (
                        <div key={index} className="flex items-start gap-3 p-3 bg-blue-900/10 border border-blue-800/30 rounded-lg">
                          <BookOpen className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                          <p className="text-sm text-slate-300">{action}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Keywords Tab */}
          {activeTab === 'keywords' && keywordAnalysis && (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Keyword Analysis</h3>

              <div className="space-y-6">
                {keywordAnalysis.keywordMatches.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-green-400 mb-3 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Keywords Found in Resume ({keywordAnalysis.keywordMatches.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {keywordAnalysis.keywordMatches.map((keyword, index) => (
                        <span key={index} className="px-3 py-1 bg-green-900/30 text-green-300 rounded-full text-sm">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {keywordAnalysis.suggestions.length > 0 && (
                  <div>
                    <h4 className="text-md font-medium text-blue-400 mb-3 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" />
                      Keyword Integration Suggestions
                    </h4>
                    <div className="space-y-3">
                      {keywordAnalysis.suggestions.map((suggestion, index) => (
                        <div key={index} className="p-3 bg-blue-900/10 border border-blue-800/30 rounded-lg">
                          <p className="text-sm text-slate-300">{suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {keywordAnalysis.keywordMatches.length === 0 && keywordAnalysis.suggestions.length === 0 && (
                  <div className="text-center py-8">
                    <Target className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No keyword analysis available. Make sure you have a Gemini API key configured.</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Enhance Tab */}
          {activeTab === 'enhance' && (
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">Enhance Experience</h3>
                <p className="text-slate-400 mb-6">
                  Use AI to enhance your experience descriptions to better highlight transferable skills and relevant competencies.
                </p>

                <div className="space-y-4">
                  {resume.experience.map((exp, index) => (
                    <div key={exp.id} className="p-4 border border-slate-700 rounded-lg">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h4 className="font-medium text-white">{exp.role}</h4>
                          <p className="text-sm text-slate-400">{exp.company}</p>
                        </div>
                        <Button
                          onClick={() => enhanceExperience(index)}
                          loading={isOptimizing}
                          size="sm"
                          variant="secondary"
                        >
                          <TrendingUp className="w-4 h-4 mr-1" />
                          Enhance
                        </Button>
                      </div>
                      <p className="text-sm text-slate-300 whitespace-pre-line">{exp.description}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="p-6">
                <h3 className="text-lg font-semibold text-white mb-4">ATS Formatting Guidelines</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-md font-medium text-green-400 mb-3">✅ Do's</h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li>• Use standard section headers (Experience, Education, Skills)</li>
                      <li>• Include quantifiable achievements (% increase, $ saved, users impacted)</li>
                      <li>• Use industry-standard terminology and keywords</li>
                      <li>• Keep formatting simple and consistent</li>
                      <li>• Use reverse chronological order</li>
                      <li>• Save as PDF with clean structure</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-red-400 mb-3">❌ Don'ts</h4>
                    <ul className="space-y-2 text-sm text-slate-300">
                      <li>• Complex formatting (tables, columns, graphics)</li>
                      <li>• Non-standard fonts or colors</li>
                      <li>• Abbreviations without full terms first</li>
                      <li>• Missing contact information</li>
                      <li>• Keyword stuffing (unnatural repetition)</li>
                      <li>• Images or logos that confuse parsing</li>
                    </ul>
                  </div>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ATSOptimization;