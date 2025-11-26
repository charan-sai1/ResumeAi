import React, { useState, useMemo } from 'react';
import { Resume, ExperienceItem, EducationItem, ProjectItem, UserProfileMemory, LeadershipActivity } from '../types';
import { Input, TextArea, Button, AIEnhanceButton, Card } from './UIComponents';
import { Plus } from 'lucide-react';
import { Trash2 } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { ChevronUp } from 'lucide-react';
import { X } from 'lucide-react';
import { ExternalLink } from 'lucide-react';
import { Github } from 'lucide-react';
import { BrainCircuit } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { BookOpen } from 'lucide-react';
import { EyeOff } from 'lucide-react';
import { enhanceContent, optimizeSkills, generateContentFromMemory } from '../services/geminiService';

interface Props {
  resume: Resume;
  setResume: (r: Resume) => void;
  memory: UserProfileMemory;
}

const ResumeEditor: React.FC<Props> = React.memo(({ resume, setResume, memory }) => {
  const [loadingField, setLoadingField] = useState<string | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('personal');
  const [newSkill, setNewSkill] = useState('');

  // Memoize existing skills for performance
  const existingSkillsSet = useMemo(() => {
    return new Set(resume.skills.map(s => s.toLowerCase()));
  }, [resume.skills]);

  // Helper to ensure value is always a string for Inputs
  const safeStr = (val: any) => {
    if (Array.isArray(val)) return val.join('\n');
    if (val === null || val === undefined) return '';
    return String(val);
  };

  // Helper to render simple markdown (bolding) from AI response
  const renderMarkdown = (text: string) => {
    if (!text) return null;
    return text.split(/(\*\*.*?\*\*)/g).map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="text-indigo-300 font-semibold">{part.slice(2, -2)}</strong>;
      }
      return <span key={index}>{part}</span>;
    });
  };

  const handleEnhance = async (text: string, fieldId: string, context: string, updater: (text: string, score: number) => void) => {
    if (!text) return;
    setLoadingField(fieldId);
    const result = await enhanceContent(text, context);
    updater(result.refinedText, result.impactScore);
    setLoadingField(null);
  };

  const handleGenerateFromMemory = async (type: 'summary' | 'experience' | 'project' | 'leadershipActivity', context: string, updater: (val: string) => void, fieldId: string) => {
    setLoadingField(fieldId);
    const content = await generateContentFromMemory(memory, type, context);
    if (content) updater(content);
    setLoadingField(null);
  };

  const handleOptimizeSkills = async () => {
    if (resume.skills.length === 0) return;
    setLoadingField('skills');
    const optimized = await optimizeSkills(resume.skills);
    setResume({ ...resume, skills: optimized });
    setLoadingField(null);
  };
  
  const handleAddSkillsFromMemory = () => {
    const newSkillsFromMemory = memory.skills.filter(s => !existingSkillsSet.has(s.toLowerCase()));
    
    if (newSkillsFromMemory.length > 0) {
      setResume({ ...resume, skills: [...resume.skills, ...newSkillsFromMemory] });
    }
  };

  const updatePersonalInfo = (field: keyof typeof resume.personalInfo, value: string) => {
    setResume({ ...resume, personalInfo: { ...resume.personalInfo, [field]: value } });
  };

  // --- Experience Handlers ---
  const addExperience = () => {
    const newExp: ExperienceItem = {
      id: Date.now().toString(),
      role: 'Job Title',
      company: 'Company Name',
      startDate: '',
      endDate: '',
      description: ''
    };
    setResume({ ...resume, experience: [...resume.experience, newExp] });
  };

  const updateExperience = (id: string, field: keyof ExperienceItem, value: string) => {
    setResume({
      ...resume,
      experience: resume.experience.map(e => e.id === id ? { ...e, [field]: value } : e)
    });
  };

  const removeExperience = (id: string) => {
    setResume({ ...resume, experience: resume.experience.filter(e => e.id !== id) });
  };

  // --- Education Handlers ---
  const addEducation = () => {
    const newEdu: EducationItem = {
      id: Date.now().toString(),
      degree: 'Degree',
      school: 'University/School',
      year: 'Year'
    };
    setResume({ ...resume, education: [...resume.education, newEdu] });
  };

  const updateEducation = (id: string, field: keyof EducationItem, value: string) => {
    setResume({
      ...resume,
      education: resume.education.map(e => e.id === id ? { ...e, [field]: value } : e)
    });
  };

  const removeEducation = (id: string) => {
    setResume({ ...resume, education: resume.education.filter(e => e.id !== id) });
  };

  // --- Project Handlers ---
  const addProject = () => {
    const newProj: ProjectItem = {
      id: Date.now().toString(),
      name: 'Project Name',
      description: '',
      link: '',
      repoLink: ''
    };
    setResume({ ...resume, projects: [...resume.projects, newProj] });
  };

  const updateProject = (id: string, field: keyof ProjectItem, value: string) => {
    setResume({
      ...resume,
      projects: resume.projects.map(p => p.id === id ? { ...p, [field]: value } : p)
    });
  };

  const removeProject = (id: string) => {
    setResume({ ...resume, projects: resume.projects.filter(p => p.id !== id) });
  };

  // --- Leadership Activities Handlers ---
  const addLeadershipActivity = () => {
    const newActivity: LeadershipActivity = {
      id: Date.now().toString(),
      name: 'Activity Name',
      description: '',
      dateRange: '',
    };
    setResume({ ...resume, leadershipActivities: [...resume.leadershipActivities, newActivity] });
  };

  const updateLeadershipActivity = (id: string, field: keyof LeadershipActivity, value: string) => {
    setResume({
      ...resume,
      leadershipActivities: resume.leadershipActivities.map(activity => activity.id === id ? { ...activity, [field]: value } : activity)
    });
  };

  const removeLeadershipActivity = (id: string) => {
    setResume({ ...resume, leadershipActivities: resume.leadershipActivities.filter(activity => activity.id !== id) });
  };

  // --- Skills Handler ---
  const addSkill = () => {
    if (newSkill.trim()) {
      setResume({ ...resume, skills: [...resume.skills, newSkill.trim()] });
      setNewSkill('');
    }
  };

  const removeSkill = (index: number) => {
    const newSkills = [...resume.skills];
    newSkills.splice(index, 1);
    setResume({ ...resume, skills: newSkills });
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addSkill();
    }
  };

  const SectionHeader = ({ title, id, isOpen, onClick }: any) => (
    <div 
      className="flex justify-between items-center p-4 bg-slate-900 border-b border-slate-800 cursor-pointer hover:bg-slate-850 transition-colors"
      onClick={onClick}
    >
      <h3 className="font-semibold text-slate-200">{title}</h3>
      {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
    </div>
  );

  const MemoryButton = ({ onClick, loading, label }: any) => (
    <button 
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-[10px] font-medium text-purple-400 hover:text-purple-300 transition-colors mt-1 mb-2 bg-purple-900/10 hover:bg-purple-900/20 px-2 py-1 rounded border border-purple-500/20"
      title="Generate content based on your uploaded files and career memory"
    >
      <BrainCircuit className={`w-3 h-3 ${loading ? 'animate-pulse' : ''}`} />
      {loading ? 'Generating...' : label || 'Auto-Fill from Memory'}
    </button>
  );

  return (
    <div className="h-full overflow-y-auto custom-scrollbar bg-slate-950 pb-8">
      
      {/* Personal Info */}
      <div className="border-b border-slate-800">
        <SectionHeader 
          title="Personal Details" 
          isOpen={expandedSection === 'personal'} 
          onClick={() => setExpandedSection(expandedSection === 'personal' ? '' : 'personal')}
        />
        {expandedSection === 'personal' && (
          <div className="p-6 space-y-4 animate-in slide-in-from-top-2 duration-200">
            <Input 
              label="Full Name" 
              value={safeStr(resume.personalInfo.fullName)} 
              onChange={(e) => updatePersonalInfo('fullName', e.target.value)} 
            />
            <Input 
              label="Title (e.g. Senior Product Designer)" 
              value={safeStr(resume.title)} 
              onChange={(e) => setResume({...resume, title: e.target.value})} 
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Email" value={safeStr(resume.personalInfo.email)} onChange={(e) => updatePersonalInfo('email', e.target.value)} />
              <Input label="Phone" value={safeStr(resume.personalInfo.phone)} onChange={(e) => updatePersonalInfo('phone', e.target.value)} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="Location" value={safeStr(resume.personalInfo.location)} onChange={(e) => updatePersonalInfo('location', e.target.value)} />
              <Input label="LinkedIn" value={safeStr(resume.personalInfo.linkedin)} onChange={(e) => updatePersonalInfo('linkedin', e.target.value)} />
            </div>
            <Input label="Website / Portfolio" value={safeStr(resume.personalInfo.website)} onChange={(e) => updatePersonalInfo('website', e.target.value)} />
            
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-1">Professional Summary</label>
              <div className="flex gap-2 items-center flex-wrap">
                <AIEnhanceButton 
                  loading={loadingField === 'summary'} 
                  onClick={() => handleEnhance(
                    safeStr(resume.personalInfo.summary), 
                    'summary', 
                    'Professional Resume Summary. Rewrite into strong, results-driven bullet points using power verbs. Quantify impact and be extremely concise (1-2 min read). Use **bolding** for key achievements.', 
                    (txt) => updatePersonalInfo('summary', txt)
                  )}
                />
                <MemoryButton 
                  loading={loadingField === 'mem-summary'}
                  onClick={() => handleGenerateFromMemory('summary', `Role: ${resume.title}`, (txt) => updatePersonalInfo('summary', txt), 'mem-summary')}
                  label="Generate from Memory"
                />
              </div>
              <TextArea 
                value={safeStr(resume.personalInfo.summary)} 
                onChange={(e) => updatePersonalInfo('summary', e.target.value)} 
                placeholder="Briefly describe your career highlights..."
              />
            </div>
          </div>
        )}
      </div>

      {/* Experience */}
      <div className="border-b border-slate-800">
        <SectionHeader 
          title="Experience" 
          isOpen={expandedSection === 'experience'} 
          onClick={() => setExpandedSection(expandedSection === 'experience' ? '' : 'experience')}
        />
        {expandedSection === 'experience' && (
          <div className="p-6 space-y-6 bg-slate-950/50">
            {resume.experience.map((exp, idx) => (
              <Card key={exp.id} className="relative group">
                <button 
                  onClick={() => removeExperience(exp.id)} 
                  className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Input label="Job Title" value={safeStr(exp.role)} onChange={(e) => updateExperience(exp.id, 'role', e.target.value)} />
                  <Input label="Company" value={safeStr(exp.company)} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Input label="Start Date" value={safeStr(exp.startDate)} onChange={(e) => updateExperience(exp.id, 'startDate', e.target.value)} />
                  <Input label="End Date" value={safeStr(exp.endDate)} onChange={(e) => updateExperience(exp.id, 'endDate', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Responsibilities & Achievements</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    <AIEnhanceButton 
                      loading={loadingField === `exp-${exp.id}`} 
                      onClick={() => handleEnhance(
                        safeStr(exp.description), 
                        `exp-${exp.id}`, 
                        'job description bullet points. Use power verbs (e.g. Spearheaded, Delivered). Quantify impact. Keep it ultra-concise. Use **bolding** for metrics.', 
                        (txt) => updateExperience(exp.id, 'description', txt)
                      )}
                    />
                    <MemoryButton 
                      loading={loadingField === `mem-exp-${exp.id}`}
                      onClick={() => handleGenerateFromMemory('experience', `Role: ${exp.role} at ${exp.company}`, (txt) => updateExperience(exp.id, 'description', txt), `mem-exp-${exp.id}`)}
                      label="Auto-Fill from Memory"
                    />
                  </div>
                  <TextArea 
                    value={safeStr(exp.description)} 
                    onChange={(e) => updateExperience(exp.id, 'description', e.target.value)} 
                    placeholder="- Led a team of..."
                    className="min-h-[150px]"
                  />
                </div>
              </Card>
            ))}
            <Button variant="secondary" onClick={addExperience} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Position
            </Button>
          </div>
        )}
      </div>

      {/* Education */}
      <div className="border-b border-slate-800">
        <SectionHeader 
          title="Education" 
          isOpen={expandedSection === 'education'} 
          onClick={() => setExpandedSection(expandedSection === 'education' ? '' : 'education')}
        />
        {expandedSection === 'education' && (
          <div className="p-6 space-y-6 bg-slate-950/50">
            {resume.education.map((edu, idx) => (
              <Card key={edu.id} className="relative group">
                <button 
                  onClick={() => removeEducation(edu.id)} 
                  className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Input label="Degree / Qualification" value={safeStr(edu.degree)} onChange={(e) => updateEducation(edu.id, 'degree', e.target.value)} />
                  <Input label="School / University" value={safeStr(edu.school)} onChange={(e) => updateEducation(edu.id, 'school', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-0">
                  <Input label="Year / Dates" value={safeStr(edu.year)} onChange={(e) => updateEducation(edu.id, 'year', e.target.value)} />
                </div>
              </Card>
            ))}
            <Button variant="secondary" onClick={addEducation} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Education
            </Button>
          </div>
        )}
      </div>

      {/* Projects */}
      <div className="border-b border-slate-800">
        <SectionHeader 
          title="Projects" 
          isOpen={expandedSection === 'projects'} 
          onClick={() => setExpandedSection(expandedSection === 'projects' ? '' : 'projects')}
        />
        {expandedSection === 'projects' && (
          <div className="p-6 space-y-6 bg-slate-950/50">
            {resume.projects.map((proj, idx) => (
              <Card key={proj.id} className="relative group">
                <button 
                  onClick={() => removeProject(proj.id)} 
                  className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Input label="Project Name" value={safeStr(proj.name)} onChange={(e) => updateProject(proj.id, 'name', e.target.value)} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <div className="flex gap-2 items-center w-full">
                     <Input label="Demo Link" value={safeStr(proj.link)} onChange={(e) => updateProject(proj.id, 'link', e.target.value)} className="mb-0 flex-1" />
                     {proj.link && <a href={proj.link} target="_blank" rel="noreferrer" className="mt-6 text-slate-400 hover:text-indigo-400"><ExternalLink className="w-4 h-4" /></a>}
                  </div>
                  <div className="flex gap-2 items-center w-full">
                     <Input label="Repo Link" value={safeStr(proj.repoLink)} onChange={(e) => updateProject(proj.id, 'repoLink', e.target.value)} className="mb-0 flex-1" />
                     {proj.repoLink && <a href={proj.repoLink} target="_blank" rel="noreferrer" className="mt-6 text-slate-400 hover:text-indigo-400"><Github className="w-4 h-4" /></a>}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Description</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    <AIEnhanceButton 
                      loading={loadingField === `proj-${proj.id}`} 
                      onClick={() => handleEnhance(
                        safeStr(proj.description), 
                        `proj-${proj.id}`, 
                        'project description. Be extremely concise (1 minute read). Quantify results with power verbs. Use **bolding** for key tech.', 
                        (txt) => updateProject(proj.id, 'description', txt)
                      )}
                    />
                    <MemoryButton 
                      loading={loadingField === `mem-proj-${proj.id}`}
                      onClick={() => handleGenerateFromMemory('project', `Project Name: ${proj.name}`, (txt) => updateProject(proj.id, 'description', txt), `mem-proj-${proj.id}`)}
                      label="Auto-Fill from Memory"
                    />
                  </div>
                  <TextArea 
                    value={safeStr(proj.description)} 
                    onChange={(e) => updateProject(proj.id, 'description', e.target.value)} 
                    placeholder="Describe the project..."
                    className="min-h-[100px]"
                  />
                </div>
              </Card>
            ))}
            <Button variant="secondary" onClick={addProject} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Project
            </Button>
          </div>
        )}
      </div>

      {/* Leadership & Activities (New Section) */}
      <div className="border-b border-slate-800">
        <SectionHeader 
          title="Leadership & Activities" 
          isOpen={expandedSection === 'leadershipActivities'} 
          onClick={() => setExpandedSection(expandedSection === 'leadershipActivities' ? '' : 'leadershipActivities')}
        />
        {expandedSection === 'leadershipActivities' && (
          <div className="p-6 space-y-6 bg-slate-950/50">
            {resume.leadershipActivities.map((activity, idx) => (
              <Card key={activity.id} className="relative group">
                <button 
                  onClick={() => removeLeadershipActivity(activity.id)} 
                  className="absolute top-4 right-4 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                  <Input label="Activity Name / Role" value={safeStr(activity.name)} onChange={(e) => updateLeadershipActivity(activity.id, 'name', e.target.value)} />
                  <Input label="Date Range" value={safeStr(activity.dateRange)} onChange={(e) => updateLeadershipActivity(activity.id, 'dateRange', e.target.value)} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">Description / Contributions</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    <AIEnhanceButton 
                      loading={loadingField === `activity-${activity.id}`} 
                      onClick={() => handleEnhance(
                        safeStr(activity.description), 
                        `activity-${activity.id}`, 
                        'leadership/activity description. Use power verbs. Quantify impact. Keep it concise. Use **bolding** for key details.', 
                        (txt) => updateLeadershipActivity(activity.id, 'description', txt)
                      )}
                    />
                     <MemoryButton 
                      loading={loadingField === `mem-activity-${activity.id}`}
                      onClick={() => handleGenerateFromMemory('leadershipActivity', `Activity: ${activity.name}`, (txt) => updateLeadershipActivity(activity.id, 'description', txt), `mem-activity-${activity.id}`)}
                      label="Auto-Fill from Memory"
                    />
                  </div>
                  <TextArea 
                    value={safeStr(activity.description)} 
                    onChange={(e) => updateLeadershipActivity(activity.id, 'description', e.target.value)} 
                    placeholder="e.g., - Led a team of volunteers..."
                    className="min-h-[100px]"
                  />
                </div>
              </Card>
            ))}
            <Button variant="secondary" onClick={addLeadershipActivity} className="w-full">
              <Plus className="w-4 h-4 mr-2" /> Add Activity
            </Button>
          </div>
        )}
      </div>


      {/* Skills */}
      <div className="border-b border-slate-800">
        <SectionHeader 
          title="Skills" 
          isOpen={expandedSection === 'skills'} 
          onClick={() => setExpandedSection(expandedSection === 'skills' ? '' : 'skills')}
        />
        {expandedSection === 'skills' && (
          <div className="p-6">
             <div className="flex justify-between items-baseline mb-2">
                 <label className="block text-sm font-medium text-slate-400">Add Skills</label>
                 <div className="flex gap-2">
                    {memory.skills.length > 0 && (
                      <button 
                        onClick={handleAddSkillsFromMemory}
                        className="text-xs flex items-center gap-1 text-purple-400 hover:text-purple-300 transition-colors"
                        title={`Add ${memory.skills.length} skills from memory`}
                      >
                        <BrainCircuit className="w-3 h-3" /> From Memory
                      </button>
                    )}
                    {resume.skills.length > 0 && (
                      <AIEnhanceButton 
                        loading={loadingField === 'skills'} 
                        onClick={handleOptimizeSkills}
                      />
                    )}
                 </div>
             </div>
             <div className="flex gap-2 mb-4">
               <Input
                 value={newSkill}
                 onChange={(e) => setNewSkill(e.target.value)}
                 onKeyDown={handleSkillKeyDown}
                 placeholder="e.g. React, Project Management..."
                 className="mb-0 flex-1" 
               />
               <Button onClick={addSkill} variant="secondary" className="px-3">
                 <Plus className="w-4 h-4" />
               </Button>
             </div>
             
             <div className="flex flex-wrap gap-2">
               {resume.skills.map((skill, idx) => (
                 <span key={idx} className="group bg-slate-800 text-slate-200 px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 border border-slate-700 shadow-sm">
                   {skill}
                   <button onClick={() => removeSkill(idx)} className="text-slate-500 hover:text-red-400 transition-colors">
                     <X className="w-3.5 h-3.5" />
                   </button>
                 </span>
               ))}
               {resume.skills.length === 0 && <span className="text-slate-500 text-sm italic">No skills added yet.</span>}
             </div>
             
             {/* Invisible Keyword Indicator */}
             {resume.hiddenKeywords && resume.hiddenKeywords.length > 0 && (
               <div className="mt-4 p-2 bg-slate-900/50 border border-slate-800 rounded flex items-center gap-2 text-xs text-slate-500">
                 <EyeOff className="w-3 h-3" />
                 <span>Invisible ATS Strategy Active: {resume.hiddenKeywords.length} hidden keywords injected.</span>
               </div>
             )}
          </div>
        )}
      </div>

      {/* AI Research Context (Moved to Bottom) */}
      {resume.researchContext && (
        <div className="mx-4 mt-8 mb-4 p-5 bg-slate-900/80 border border-indigo-500/20 rounded-xl shadow-inner animate-in fade-in duration-300">
           <div className="flex items-start gap-3 mb-3">
             <div className="p-2 bg-indigo-500/10 rounded-lg">
               <Sparkles className="w-4 h-4 text-indigo-400" /> 
             </div>
             <div>
                <h4 className="text-sm font-bold text-indigo-100">Research Applied</h4>
                <p className="text-xs text-slate-500">Content grounded in industry trends & job requirements.</p>
             </div>
           </div>
           
           <div className="text-xs text-slate-300 leading-relaxed whitespace-pre-line pl-11 border-l-2 border-indigo-500/10 ml-3 mb-4">
             {renderMarkdown(resume.researchContext.summary)}
           </div>

           {resume.researchContext.sources.length > 0 && (
             <div className="pl-11 ml-3">
               <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider mb-2 block">Sources Referenced</span>
               <div className="flex flex-wrap gap-2">
                 {resume.researchContext.sources.map((source, idx) => source.web && (
                   <a 
                     key={idx} 
                     href={source.web.uri} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex items-center gap-1.5 text-[10px] px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-full border border-slate-700 transition-colors"
                   >
                     <BookOpen className="w-3 h-3 text-indigo-400" />
                     <span className="truncate max-w-[200px]">{source.web.title || "External Source"}</span>
                     <ExternalLink className="w-2 h-2 opacity-50" />
                   </a>
                 ))}
               </div>
             </div>
           )}
        </div>
      )}
    </div>
  );
});

ResumeEditor.displayName = 'ResumeEditor';

export default ResumeEditor;