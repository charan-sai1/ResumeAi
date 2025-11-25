
import React, { useState } from 'react';
import { Resume, UserProfileMemory } from '../types';
import { Card, Button, Input, TextArea } from './UIComponents';
import { FileText, Search, Plus, Trash, UploadCloud, BrainCircuit, FileUp, AlertCircle, LogOut, AlertTriangle, MessageSquare, Send, ChevronRight, ArrowRight, Github, ExternalLink, Zap } from 'lucide-react';
import { generateMemoryQuestions, mergeDataIntoMemory } from '../services/geminiService';
import { AnalyzedProject } from '../types';
import GitHubConnect from './GitHubConnect';

interface Props {
  resumes: Resume[];
  memory: UserProfileMemory;
  onEdit: (r: Resume) => void;
  onNew: () => void;
  onNewFromMemory: () => void;
  onDelete: (id: string) => void;
  onFilesDropped: (files: File[]) => void;
  isProcessingFiles: boolean;
  user: any;
  onSignOut: () => void;
  onUpdateMemory: (memory: UserProfileMemory) => Promise<void>;
  onUseProject: (project: AnalyzedProject) => void;
  onConnectGitHub: () => Promise<void>;
  onAnalyzeGitHub: () => Promise<void>;
  isAnalyzingGitHub: boolean;
  githubAnalysisProgress: { current: number; total: number; repoName: string };
}

const Dashboard: React.FC<Props> = ({
  resumes,
  memory,
  onEdit,
  onNew,
  onNewFromMemory,
  onDelete,
  onFilesDropped,
  isProcessingFiles,
  user,
  onSignOut,
  onUpdateMemory,
  onUseProject,
  onConnectGitHub,
  onAnalyzeGitHub,
  isAnalyzingGitHub,
  githubAnalysisProgress }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [manualMemoryInput, setManualMemoryInput] = useState('');
  
  // QnA State
  const [qnaAnswer, setQnaAnswer] = useState('');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isSavingManualMemory, setIsSavingManualMemory] = useState(false);

  const filtered = resumes.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchTerm.toLowerCase()) || r.personalInfo.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole ? r.title.toLowerCase().includes(filterRole.toLowerCase()) : true;
    return matchesSearch && matchesRole;
  });

  // Manual file selection handler
  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onFilesDropped(Array.from(e.target.files));
    }
  };

  const handleGenerateQuestions = async () => {
    setIsGeneratingQuestions(true);
    try {
      const questions = await generateMemoryQuestions(memory);
      const newMemory = { ...memory, qna: [...(memory.qna || []), ...questions] };
      await onUpdateMemory(newMemory);
    } catch (e) {
      console.error(e);
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const handleSaveManualMemory = async () => {
    if (!manualMemoryInput.trim()) return;
    setIsSavingManualMemory(true);
    try {
      const updatedMemory = await mergeDataIntoMemory(memory, manualMemoryInput);
      await onUpdateMemory(updatedMemory);
      setManualMemoryInput(''); // Clear input after saving
    } catch (e) {
      console.error("Error saving manual memory:", e);
    } finally {
      setIsSavingManualMemory(false);
    }
  };

  const handleSubmitAnswer = async (overrideAnswer?: string) => {
    const activeQuestion = memory.qna?.[0]; // Always take the first one
    const answerText = overrideAnswer || qnaAnswer;

    if (!activeQuestion || !answerText.trim()) return;
    
    setIsSubmittingAnswer(true);
    try {
      const textToMerge = `Question: ${activeQuestion.question}\nAnswer: ${answerText}`;
      
      // 1. Merge answer into memory
      const updatedMemoryContent = await mergeDataIntoMemory(memory, textToMerge);
      
      // 2. Remove the answered question from list
      const updatedQnA = (memory.qna || []).slice(1); // Remove first item
      
      const finalMemory = {
        ...updatedMemoryContent,
        qna: updatedQnA,
        rawSourceFiles: memory.rawSourceFiles
      };

      await onUpdateMemory(finalMemory);
      
      setQnaAnswer('');
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const memoryCount = memory.experiences.length + memory.projects.length + memory.educations.length;
  const activeQuestions = memory.qna || [];
  const currentQuestion = activeQuestions[0]; // Get only the first question

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Resume Dashboard</h1>
          <p className="text-slate-400">Manage your profiles and build your AI career memory.</p>
        </div>
        
        <div className="flex flex-col items-end gap-4 w-full lg:w-auto">
          {/* Action Buttons */}
          <div className="flex gap-3 w-full sm:w-auto">
            <Button variant="secondary" onClick={onNewFromMemory} disabled={memoryCount === 0} title={memoryCount === 0 ? "Upload resumes first" : "Create using Memory"} className="flex-1 sm:flex-none">
              <BrainCircuit className="w-5 h-5 mr-2 text-purple-400" /> Generate from Memory
            </Button>
            <Button variant="ai" onClick={onNew} className="shadow-lg shadow-indigo-500/20 flex-1 sm:flex-none">
              <Plus className="w-5 h-5 mr-2" /> Create Empty
            </Button>
          </div>
        </div>
      </div>

      {/* File Upload Zone - Always at top */}
      <Card className="flex flex-col items-center justify-center p-6 border-dashed border-slate-700 bg-slate-900/50 mb-6">
        <UploadCloud className="w-16 h-16 text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-white mb-2">Drag & Drop Files</h3>
        <p className="text-slate-400 text-center mb-4">
          Upload your existing resumes (PDF, DOCX, TXT) to instantly build your memory.
        </p>
        <input
          type="file"
          multiple
          onChange={handleFileInput}
          className="hidden"
          id="file-upload-input"
          disabled={isProcessingFiles}
        />
        <Button
          variant="primary"
          onClick={() => document.getElementById('file-upload-input')?.click()}
          loading={isProcessingFiles}
        >
          <FileUp className="w-5 h-5 mr-2" /> Select Files
        </Button>
        {isProcessingFiles && (
          <div className="flex items-center text-slate-400 text-sm mt-3">
            <AlertTriangle className="w-4 h-4 mr-2" /> Processing files...
          </div>
        )}
      </Card>

      {/* GitHub Connect Section - Only show if not connected */}
      {!user?.providerData?.some((p: any) => p.providerId === 'github.com') && (!memory.githubProjects || memory.githubProjects.length === 0) && (
        <div className="mb-6">
          <GitHubConnect
            isConnected={false}
            onConnect={onConnectGitHub}
            onAnalyzeProfile={onAnalyzeGitHub}
            isAnalyzing={isAnalyzingGitHub}
            memory={memory}
          />
        </div>
      )}

      {/* Two Column Layout: Memory (Left) & GitHub (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Memory */}
        <Card className="p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <BrainCircuit className="w-6 h-6 text-purple-400" /> Your AI Career Memory
          </h2>
          <p className="text-slate-400 mb-4 text-sm">
            This is your personal career knowledge base. Files you upload and information you provide
            are distilled here, allowing AI to generate highly personalized resumes.
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm mb-6">
            <span className="bg-slate-800 text-purple-300 px-3 py-1 rounded-full">{memory.experiences.length} Experiences</span>
            <span className="bg-slate-800 text-purple-300 px-3 py-1 rounded-full">{memory.educations.length} Educations</span>
            <span className="bg-slate-800 text-purple-300 px-3 py-1 rounded-full">{memory.projects.length} Projects</span>
            <span className="bg-slate-800 text-purple-300 px-3 py-1 rounded-full">{memory.skills.length} Skills</span>
            <span className="bg-slate-800 text-purple-300 px-3 py-1 rounded-full">{memory.leadershipActivities.length} Activities</span>
            <span className="bg-slate-800 text-green-300 px-3 py-1 rounded-full">{memory.githubProjects?.length || 0} GitHub Projects</span>
          </div>

          {/* Memory Details Viewer */}
          <div className="mb-6 border border-slate-800 rounded-lg overflow-hidden">
            <details className="group">
              <summary className="cursor-pointer bg-slate-800/50 px-4 py-3 text-white font-semibold hover:bg-slate-800 transition-colors flex items-center justify-between">
                <span>View Memory Details</span>
                <span className="text-slate-500 group-open:rotate-180 transition-transform">▼</span>
              </summary>
              <div className="p-4 space-y-6 max-h-96 overflow-y-auto">
                {/* Personal Info */}
                {memory.personalInfo && Object.keys(memory.personalInfo).length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-indigo-400 mb-2">Personal Information</h4>
                    <div className="space-y-1 text-sm">
                      {memory.personalInfo.fullName && <p className="text-slate-300"><span className="text-slate-500">Name:</span> {memory.personalInfo.fullName}</p>}
                      {memory.personalInfo.email && <p className="text-slate-300"><span className="text-slate-500">Email:</span> {memory.personalInfo.email}</p>}
                      {memory.personalInfo.phone && <p className="text-slate-300"><span className="text-slate-500">Phone:</span> {memory.personalInfo.phone}</p>}
                      {memory.personalInfo.location && <p className="text-slate-300"><span className="text-slate-500">Location:</span> {memory.personalInfo.location}</p>}
                    </div>
                  </div>
                )}

                {/* Experiences */}
                {memory.experiences.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-indigo-400 mb-2">Experiences ({memory.experiences.length})</h4>
                    <div className="space-y-3">
                      {memory.experiences.map(exp => (
                        <div key={exp.id} className="bg-slate-900/50 p-3 rounded border border-slate-800">
                          <div className="font-semibold text-white text-sm">{exp.role}</div>
                          <div className="text-slate-400 text-xs mb-1">{exp.company} • {exp.startDate} - {exp.endDate || 'Present'}</div>
                          <div className="text-slate-500 text-xs line-clamp-2">{exp.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Education */}
                {memory.educations.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-indigo-400 mb-2">Education ({memory.educations.length})</h4>
                    <div className="space-y-2">
                      {memory.educations.map(edu => (
                        <div key={edu.id} className="bg-slate-900/50 p-3 rounded border border-slate-800">
                          <div className="font-semibold text-white text-sm">{edu.degree}</div>
                          <div className="text-slate-400 text-xs">{edu.school} • {edu.year}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Projects */}
                {memory.projects.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-indigo-400 mb-2">Projects ({memory.projects.length})</h4>
                    <div className="space-y-2">
                      {memory.projects.map(proj => (
                        <div key={proj.id} className="bg-slate-900/50 p-3 rounded border border-slate-800">
                          <div className="font-semibold text-white text-sm">{proj.name}</div>
                          <div className="text-slate-500 text-xs line-clamp-2">{proj.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* GitHub Projects */}
                {memory.githubProjects && memory.githubProjects.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-green-400 mb-2">GitHub Projects ({memory.githubProjects.length})</h4>
                    <div className="space-y-2">
                      {memory.githubProjects.map(proj => (
                        <div key={proj.id} className="bg-slate-900/50 p-3 rounded border border-slate-800">
                          <div className="flex items-start justify-between mb-1">
                            <div className="font-semibold text-white text-sm">{proj.repoName}</div>
                            <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400">{proj.completenessScore}%</span>
                          </div>
                          <div className="text-slate-500 text-xs line-clamp-2 mb-2">{proj.aiSummary}</div>
                          <div className="flex flex-wrap gap-1">
                            {proj.advancedTechUsed.slice(0, 3).map((tech, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded bg-indigo-900/30 text-indigo-300">{tech}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills */}
                {memory.skills.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-indigo-400 mb-2">Skills ({memory.skills.length})</h4>
                    <div className="flex flex-wrap gap-2">
                      {memory.skills.map((skill, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded bg-purple-900/30 text-purple-300">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Leadership Activities */}
                {memory.leadershipActivities.length > 0 && (
                  <div>
                    <h4 className="text-sm font-bold text-indigo-400 mb-2">Leadership Activities ({memory.leadershipActivities.length})</h4>
                    <div className="space-y-2">
                      {memory.leadershipActivities.map(activity => (
                        <div key={activity.id} className="bg-slate-900/50 p-3 rounded border border-slate-800">
                          <div className="font-semibold text-white text-sm">{activity.name}</div>
                          <div className="text-slate-500 text-xs">{activity.description}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {memoryCount === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    <p>No data in memory yet. Upload files or add information to get started.</p>
                  </div>
                )}
              </div>
            </details>
          </div>

          <div className="mb-6">
            <TextArea 
              label="Add/Edit Memory (AI will integrate this)"
              value={manualMemoryInput}
              onChange={(e) => setManualMemoryInput(e.target.value)}
              placeholder="Paste job descriptions, project details, achievements, or any career-related text here. AI will process it and add to your memory."
              className="h-32"
            />
            <Button 
              variant="ai" 
              onClick={handleSaveManualMemory} 
              loading={isSavingManualMemory}
              disabled={!manualMemoryInput.trim()}
              className="mt-3 w-full"
            >
              <Zap className="w-4 h-4 mr-2" /> Save to Memory
            </Button>
          </div>

          {memory.rawSourceFiles.length > 0 && (
            <div className="mb-4">
              <h4 className="text-sm font-semibold text-white mb-2">Source Files:</h4>
              <div className="flex flex-wrap gap-2">
                {memory.rawSourceFiles.map((fileName, index) => (
                  <span key={index} className="flex items-center gap-1 text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
                    <FileText className="w-3 h-3" /> {fileName}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 border-t border-slate-800 pt-6">
            <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2"><MessageSquare className="w-5 h-5 text-indigo-400" /> AI Clarification Questions</h3>
            {activeQuestions.length > 0 ? (
              <Card className="p-4 border border-indigo-500/30 bg-indigo-900/10">
                <p className="text-white font-medium mb-3">{currentQuestion.question}</p>
                {currentQuestion.options && currentQuestion.options.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {currentQuestion.options.map((option, index) => (
                      <Button key={index} variant="secondary" onClick={() => handleSubmitAnswer(option)} className="text-xs">
                        {option}
                      </Button>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <Input 
                    type="text"
                    value={qnaAnswer}
                    onChange={(e) => setQnaAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="flex-grow"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') handleSubmitAnswer();
                    }}
                  />
                  <Button onClick={() => handleSubmitAnswer()} loading={isSubmittingAnswer} disabled={!qnaAnswer.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ) : (
              <>
                <p className="text-slate-500 text-sm mb-4">
                  AI can ask clarifying questions to enrich your memory.
                </p>
                <Button 
                  variant="secondary" 
                  onClick={handleGenerateQuestions} 
                  loading={isGeneratingQuestions}
                  className="w-full"
                >
                  <MessageSquare className="w-4 h-4 mr-2" /> Generate Questions
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Right Column: GitHub Profile Analysis */}
        {user?.providerData?.some((p: any) => p.providerId === 'github.com') && (
          <Card className="p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Github className="w-6 h-6 text-green-400" /> GitHub Profile
            </h2>
            <p className="text-slate-400 mb-4 text-sm">
              Analyze your GitHub repositories to extract projects and skills automatically.
            </p>

            {(!memory.githubProjects || memory.githubProjects.length === 0) ? (
              <div className="space-y-4">
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
                    onClick={onAnalyzeGitHub}
                    loading={isAnalyzingGitHub}
                    disabled={isAnalyzingGitHub}
                    className="w-full"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    {isAnalyzingGitHub ? 'Analyzing...' : 'Analyze GitHub Profile'}
                  </Button>

                  {/* Progress Bar */}
                  {isAnalyzingGitHub && githubAnalysisProgress.total > 0 && (
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-xs text-slate-400">
                        <span>Analyzing: {githubAnalysisProgress.repoName}</span>
                        <span>{githubAnalysisProgress.current} / {githubAnalysisProgress.total}</span>
                      </div>
                      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 transition-all duration-300"
                          style={{ width: `${(githubAnalysisProgress.current / githubAnalysisProgress.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
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
                    onClick={onAnalyzeGitHub}
                    loading={isAnalyzingGitHub}
                    className="w-full"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Re-analyze Profile
                  </Button>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                    <div className="text-2xl font-bold text-green-400">{memory.githubProjects.length}</div>
                    <div className="text-xs text-slate-500">Repositories</div>
                  </div>
                  <div className="bg-slate-900/50 p-3 rounded border border-slate-800">
                    <div className="text-2xl font-bold text-indigo-400">
                      {memory.githubProjects.filter(p => p.majorProject).length}
                    </div>
                    <div className="text-xs text-slate-500">Major Projects</div>
                  </div>
                </div>

                {/* Top Technologies */}
                {memory.githubProjects.length > 0 && (
                  <div className="bg-slate-900/50 p-4 rounded border border-slate-800">
                    <h4 className="text-sm font-bold text-white mb-3">Top Technologies</h4>
                    <div className="flex flex-wrap gap-2">
                      {Array.from(new Set(
                        memory.githubProjects
                          .flatMap(p => p.advancedTechUsed)
                          .filter(Boolean)
                      ))
                        .slice(0, 8)
                        .map((tech, i) => (
                          <span key={i} className="text-xs px-2 py-1 rounded bg-indigo-900/30 text-indigo-300">
                            {tech}
                          </span>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Resumes List */}
      <div>
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative w-full sm:flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              placeholder="Search your resumes..."
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-10 pr-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            className="w-full sm:w-auto bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="developer">Developer</option>
            <option value="designer">Designer</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {filtered.map(resume => (
            <Card key={resume.id} className="group hover:border-indigo-500/50 transition-all cursor-pointer relative overflow-hidden p-4">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>

              <div className="flex justify-between items-start mb-3">
                <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-300 transition-colors">
                  <FileText className="w-5 h-5" />
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(resume.id); }}
                  className="p-1.5 text-slate-600 hover:text-red-400 transition-colors rounded-full hover:bg-slate-800"
                >
                  <Trash className="w-3.5 h-3.5" />
                </button>
              </div>

              <h3 className="text-sm font-semibold text-white mb-1 line-clamp-2">{resume.title || "Untitled Resume"}</h3>
              <p className="text-xs text-slate-500 mb-3">Last edited: {new Date(resume.lastModified).toLocaleDateString()}</p>

              <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                <span className={`px-2 py-1 rounded bg-slate-800 ${resume.atsScore > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                  ATS: {resume.atsScore}
                </span>
              </div>

              <Button variant="secondary" className="w-full text-xs py-1.5" onClick={() => onEdit(resume)}>
                Open
              </Button>
            </Card>
          ))}

          {filtered.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">No resumes found. Create one or generate from memory.</p>
            </div>
          )}
        </div>
      </div>

      {/* Analyzed GitHub Projects List */}
      {memory.githubProjects && memory.githubProjects.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold text-white">Analyzed GitHub Projects</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {memory.githubProjects.map(project => (
              <Card key={project.id} className="group hover:border-blue-500/50 transition-all cursor-pointer relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex justify-between items-start mb-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-blue-400 group-hover:bg-blue-500/10 group-hover:text-blue-300 transition-colors">
                    <Github className="w-6 h-6" />
                  </div>
                  <div className="flex gap-2">
                    {/* Optional: Add a link to GitHub repo */}
                    {project.htmlUrl && (
                      <a href={project.htmlUrl} target="_blank" rel="noopener noreferrer" className="p-2 text-slate-600 hover:text-blue-400 transition-colors rounded-full hover:bg-slate-800">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-white mb-1">{project.repoName}</h3>
                <p className="text-sm text-slate-500 mb-2">{project.aiSummary}</p>
                
                <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                  <span className="px-2 py-1 rounded bg-slate-800">
                    Completeness: {project.completenessScore}%
                  </span>
                  <span className="px-2 py-1 rounded bg-slate-800">
                    Activity: {project.activityLevel}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2 text-xs mb-4">
                    {project.advancedTechUsed.map((tech, i) => (
                      <span key={i} className="px-2 py-1 rounded-full bg-indigo-900/30 text-indigo-300">{tech}</span>
                    ))}
                    {project.domainSpecific.map((domain, i) => (
                      <span key={i} className="px-2 py-1 rounded-full bg-emerald-900/30 text-emerald-300">{domain}</span>
                    ))}
                </div>

                <Button variant="secondary" className="w-full" onClick={() => onUseProject(project)}>
                  <Zap className="w-4 h-4 mr-2" /> Use in Resume
                </Button>
              </Card>
            ))}
          </div>
          {memory.githubProjects.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-xl">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">No GitHub projects found or analyzed yet. Link your GitHub and fetch projects from Account Settings.</p>
            </div>
          )}
        </div>
      )}

    </div>
  );
};

export default Dashboard;
