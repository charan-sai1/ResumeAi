
import React, { useState } from 'react';
import { Resume, UserProfileMemory } from '../types';
import { Card, Button, Input, TextArea } from './UIComponents';
import { FileText, Search, Plus, Trash, UploadCloud, BrainCircuit, FileUp, AlertCircle, LogOut, AlertTriangle, MessageSquare, Send, ChevronRight, ArrowRight, Github, ExternalLink, Zap } from 'lucide-react';
import { generateMemoryQuestions, mergeDataIntoMemory } from '../services/geminiService';
import { AnalyzedProject } from '../types';

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
  onUseProject}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('');
  
  // QnA State
  const [qnaAnswer, setQnaAnswer] = useState('');
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);

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

      {/* Memory, Upload & QnA Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ... existing memory, upload, QnA cards ... */}
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

      {/* Resumes List */}
      <div>
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
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
            className="bg-slate-900 border border-slate-800 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value="developer">Developer</option>
            <option value="designer">Designer</option>
            <option value="manager">Manager</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(resume => (
            <Card key={resume.id} className="group hover:border-indigo-500/50 transition-all cursor-pointer relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
              
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center text-indigo-400 group-hover:bg-indigo-500/10 group-hover:text-indigo-300 transition-colors">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(resume.id); }}
                    className="p-2 text-slate-600 hover:text-red-400 transition-colors rounded-full hover:bg-slate-800"
                  >
                    <Trash className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-white mb-1">{resume.title || "Untitled Resume"}</h3>
              <p className="text-sm text-slate-500 mb-4">Last edited: {new Date(resume.lastModified).toLocaleDateString()}</p>
              
              <div className="flex items-center justify-between text-xs text-slate-400 mb-6">
                <span className={`px-2 py-1 rounded bg-slate-800 ${resume.atsScore > 70 ? 'text-green-400' : 'text-yellow-400'}`}>
                  ATS Score: {resume.atsScore}
                </span>
              </div>

              <Button variant="secondary" className="w-full" onClick={() => onEdit(resume)}>
                Open Editor
              </Button>
            </Card>
          ))}
          
          {filtered.length === 0 && (
            <div className="col-span-full py-20 text-center border-2 border-dashed border-slate-800 rounded-xl">
              <AlertCircle className="w-10 h-10 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-500">No resumes found. Create one or generate from memory.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
