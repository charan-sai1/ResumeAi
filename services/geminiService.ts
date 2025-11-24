
import { GoogleGenAI, Type } from "@google/genai";
import { Resume, ATSAnalysis, UserProfileMemory, QnAItem, LeadershipActivity, GroundingChunk } from "../types";

// --- Configuration ---
// REMOVED PROCESS.ENV default key to enforce BYOK
let userCustomApiKey: string | null = null;

const MODEL_FAST = 'gemini-2.5-flash';

// --- Dynamic Client Management ---
export const setUserApiKey = (key: string | null) => {
  userCustomApiKey = key;
};

// Helper to check API Key availability
export const hasApiKey = () => !!userCustomApiKey;

// Helper to get the correct client (User's key takes priority)
const getAIClient = () => {
  const finalKey = userCustomApiKey;
  if (!finalKey) {
    console.warn("No API Key available. BYOK required.");
  }
  return new GoogleGenAI({ apiKey: finalKey || '' });
};

// ============================================================================
// 1. SANITIZATION HELPERS (Modular Data Cleaning)
// ============================================================================

const ensureString = (val: any): string => {
  if (!val) return '';
  let str = '';
  if (Array.isArray(val)) str = val.join('\n');
  else if (typeof val === 'string') str = val;
  else if (typeof val === 'number') str = String(val);
  else if (typeof val === 'object') str = JSON.stringify(val);
  return str.replace(/\[(x|X|y|Y|z|Z|date|Date|\d+)?\]%?/g, '').trim();
};

const ensureArray = (arr: any): any[] => Array.isArray(arr) ? arr : [];

const sanitizeExperienceItem = (exp: any) => ({
  id: exp.id || Math.random().toString(36).substr(2, 9),
  role: exp.role || exp.title || exp.position || 'Role',
  company: exp.company || exp.organization || 'Company',
  startDate: exp.startDate || exp.start_date || '',
  endDate: exp.endDate || exp.end_date || '',
  description: ensureString(exp.description || exp.summary || exp.responsibilities)
});

const sanitizeEducationItem = (edu: any) => ({
  id: edu.id || Math.random().toString(36).substr(2, 9),
  degree: edu.degree || edu.qualification || edu.major || edu.title || '',
  school: edu.school || edu.institution || edu.university || edu.college || '',
  year: String(edu.year || edu.date || edu.dates || '')
});

const sanitizeProjectItem = (proj: any) => ({
  id: proj.id || Math.random().toString(36).substr(2, 9),
  name: proj.name || proj.title || 'Project',
  description: ensureString(proj.description || proj.summary || proj.details || proj.content),
  link: proj.link || proj.url || '',
  repoLink: proj.repoLink || proj.github || proj.code || ''
});

const sanitizeLeadershipItem = (activity: any) => ({
  id: activity.id || Math.random().toString(36).substr(2, 9),
  name: activity.name || activity.title || '',
  description: ensureString(activity.description || activity.summary || activity.details || activity.contributions),
  dateRange: activity.dateRange || activity.dates || activity.year || '',
});

const sanitizeSkills = (skillsData: any): string[] => {
  return Array.from(new Set(ensureArray(skillsData).map((skill: any) => {
    let s = '';
    if (typeof skill === 'string') s = skill;
    else if (typeof skill === 'object' && skill !== null) {
      s = skill.name || skill.skill || skill.value || Object.values(skill)[0] || '';
    } else {
      s = String(skill);
    }
    return s.trim();
  }))).filter((s: string) => s.length > 0);
};

export const sanitizeResume = (data: any): Resume => {
  const rawExperience = [
    ...ensureArray(data.experience || data.work_experience),
    ...ensureArray(data.internships || [])
  ];

  return {
    id: data.id || Date.now().toString(),
    title: data.title || 'Professional Resume',
    lastModified: data.lastModified || Date.now(),
    atsScore: typeof data.atsScore === 'number' ? data.atsScore : 0,
    personalInfo: {
      fullName: data.personalInfo?.fullName || data.personalInfo?.name || '', 
      email: data.personalInfo?.email || '',
      phone: data.personalInfo?.phone || '',
      location: data.personalInfo?.location || data.personalInfo?.address || '',
      linkedin: data.personalInfo?.linkedin || '',
      website: data.personalInfo?.website || '',
      summary: ensureString(data.personalInfo?.summary || data.summary),
    },
    experience: rawExperience.map(sanitizeExperienceItem),
    education: ensureArray(data.education || data.educations).map(sanitizeEducationItem),
    projects: ensureArray(data.projects).map(sanitizeProjectItem),
    leadershipActivities: ensureArray(data.leadershipActivities || data.activities || data.leadership).map(sanitizeLeadershipItem),
    skills: sanitizeSkills(data.skills),
    researchContext: data.researchContext || undefined,
    hiddenKeywords: ensureArray(data.hiddenKeywords).map(String)
  };
};

export const sanitizeMemory = (data: any): UserProfileMemory => {
  const rawExperience = [
    ...ensureArray(data.experiences || data.experience),
    ...ensureArray(data.internships || [])
  ];

  return {
    lastUpdated: Date.now(),
    personalInfo: {
      fullName: data.personalInfo?.fullName || '',
      email: data.personalInfo?.email || '',
      phone: data.personalInfo?.phone || '',
      location: data.personalInfo?.location || '',
      linkedin: data.personalInfo?.linkedin || '',
      website: data.personalInfo?.website || '',
      summary: ensureString(data.personalInfo?.summary),
    },
    experiences: rawExperience.map(sanitizeExperienceItem),
    educations: ensureArray(data.educations || data.education).map(sanitizeEducationItem),
    projects: ensureArray(data.projects).map(sanitizeProjectItem),
    leadershipActivities: ensureArray(data.leadershipActivities || data.activities || data.leadership).map(sanitizeLeadershipItem),
    skills: sanitizeSkills(data.skills),
    rawSourceFiles: ensureArray(data.rawSourceFiles).map(String),
    qna: ensureArray(data.qna).map((q: any) => ({
      id: q.id || Math.random().toString(36).substr(2, 9),
      question: typeof q.question === 'string' ? q.question : 'Details needed.',
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      dateAdded: q.dateAdded || Date.now()
    }))
  };
};

// ============================================================================
// 2. PROMPT TEMPLATES (Modular AI Instructions)
// ============================================================================

const PROMPT_TEMPLATES = {

  enhance: (content: string, context: string) => `
  ROLE: You are a world-class Executive Resume Strategist and Fortune-500 Career Copywriter.
  OBJECTIVE: Transform the input into an elite, high-impact, recruiter-optimized resume section.

  CORE PRINCIPLES:
  1. Zero fluff. Every word must add measurable value.
  2. Recruiter scanning time: < 6 seconds.
  3. ATS + Human Optimized.

  TASK: Intensify and enhance the following content.
  Context: ${context}

  STRICT FORMAT RULES:
  - Each bullet MUST:
    • Start with "* "
    • Begin with a Power Verb (Led, Engineered, Accelerated, Optimized, Delivered, Orchestrated, Scaled, Built, Automated, Reduced, Increased, Revamped, Pioneered, Streamlined)
    • Follow this structure:
      Action + What + How + Impact

  IMPACT RULES (MANDATORY):
  - Include quantified metrics in **bold** (%, $, time, users, performance, scale, revenue, efficiency).
  - Use realistic, professional business metrics.
  - If none exist, intelligently infer based on context.

  READABILITY RULES:
  - 1-line bullets only
  - Ultra concise, executive tone
  - No passive voice

  Input Content:
  "${content}"

  OUTPUT FORMAT (JSON ONLY):
  {
    "refinedText": "...",
    "impactScore": number (0-100 based on strength + clarity + metrics),
    "changes": ["Specific change 1", "Specific change 2", ...]
  }
  `,


  generateFromMemory: (memory: UserProfileMemory, sectionType: string, contextString: string) => `
  ROLE: You are a Senior Resume Architect specializing in high-performance profiles.

  MEMORY DATA SOURCE:
  ${JSON.stringify(memory)}

  TASK: Generate a premium-quality "${sectionType}" section using ONLY the memory provided.

  CONTEXT:
  ${contextString}

  RULES:
  - Output bullet points only
  - Each bullet starts with "* "
  - Use Power Verbs
  - Include quantified metrics in **bold**
  - Focus on measurable achievements, not responsibilities
  - Maximum impact, minimal words
  - ATS-friendly skill keywords embedded naturally

  STRUCTURE PER BULLET:
  Action + Result + Metric + Tool/Method

  OUTPUT:
  Only the final bullet points. No explanations. No headers. No commentary.
  `,


  optimizeSkills: (skills: string[]) => `
  ROLE: You are an ATS Optimization Engine and Talent Intelligence System.

  INPUT SKILLS:
  ${JSON.stringify(skills)}

  OBJECTIVE: Deliver a recruiter-ready, ATS-dominant skill stack.

  REQUIREMENTS:
  - Remove duplicates & weak variations
  - Normalize naming to industry standards
  - Add missing but highly relevant modern skills
  - Prioritize by market demand & job relevance
  - Group logically (Technical, Tools, Frameworks, Soft Skills)

  OUTPUT FORMAT (JSON ONLY):
  {
    "skills": ["Optimized Skill 1", "Optimized Skill 2", ...]
  }
  `,


  analyzeATS: (resume: Resume) => `
  ROLE: Advanced ATS Analyzer + Hiring Manager Simulation System

  TARGET ROLE:
  ${resume.title}

  RESUME DATA:
  ${JSON.stringify(resume)}

  TASK:
  Perform a deep ATS scan and strategic evaluation.

  ANALYZE FOR:
  - Keyword density
  - Role alignment
  - Skill relevance
  - Impact clarity
  - Formatting structure

  RETURN JSON ONLY:
  {
    "score": number (0-100),
    "strengths": ["..."],
    "weaknesses": ["..."],
    "keywords_missing": ["..."],
    "recommendations": ["Actionable improvement suggestions"]
  }
  `,


  rewriteATS: (resume: Resume, analysis: ATSAnalysis) => `
  ROLE: Resume Reconstruction AI for ATS Domination

  ORIGINAL RESUME:
  ${JSON.stringify(resume)}

  IDENTIFIED WEAKNESSES:
  ${JSON.stringify(analysis.weaknesses)}

  TARGET ROLE:
  ${resume.title}

  OBJECTIVE:
  Rebuild the resume to maximize ATS performance and recruiter conversion.

  RULES:
  - Preserve professional integrity
  - Enhance clarity, impact, and keyword relevance
  - Strengthen bullet metrics

  OUTPUT:
  Full rewritten resume in structured JSON format.
  `,


  tailor: (resume: Resume, jobDescription: string, research: string) => `
  ROLE: Intelligent Resume Tailoring Engine

  TARGET JOB DESCRIPTION:
  ${jobDescription}

  RESEARCH INSIGHTS:
  ${research}

  CANDIDATE RESUME:
  ${JSON.stringify(resume)}

  OBJECTIVE:
  Create a hyper-targeted, role-specific resume optimized for interview shortlisting.

  RULES:
  - Mirror JD language strategically
  - Insert missing critical keywords naturally
  - Emphasize relevant achievements
  - Maintain professional voice and authenticity

  OUTPUT FORMAT:
  Full Resume JSON structured for immediate application use.
  `
};


// ============================================================================
// 3. EXPORTED SERVICE FUNCTIONS
// ============================================================================

export const validateApiKey = async (apiKey: string): Promise<boolean> => {
  if (!apiKey) return false;

  let timeoutId: NodeJS.Timeout;

  const timeoutPromise = new Promise<boolean>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error('API key validation timed out'));
    }, 10000); // 10 seconds
  });

  const validationPromise = (async () => {
    try {
      const tempAi = new GoogleGenAI({ apiKey });
      await tempAi.models.generateContent({
        model: MODEL_FAST,
        contents: "hello",
      });
      return true;
    } catch (error) {
      throw error; // Re-throw to be caught by the outer catch
    }
  })();

  try {
    const result = await Promise.race([validationPromise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId!);
    console.error("API Key Validation Error:", error.message);
    return false;
  }
};

export const enhanceContent = async (
  content: string, 
  context: string = "resume section"
): Promise<{ refinedText: string; impactScore: number; changes: string }> => {
  if (!hasApiKey()) return { refinedText: content, impactScore: 0, changes: "API Key missing. Please add it in Settings." };
  const ai = getAIClient();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: PROMPT_TEMPLATES.enhance(content, context),
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { refinedText: { type: Type.STRING }, impactScore: { type: Type.NUMBER }, changes: { type: Type.STRING } } } }
    });
    const result = JSON.parse(response.text || '{}');
    return { refinedText: result.refinedText || content, impactScore: result.impactScore || 5, changes: result.changes || "Optimized." };
  } catch (error) {
    console.error("Enhance Error", error);
    return { refinedText: content, impactScore: 0, changes: "Error connecting to AI" };
  }
};

export const generateContentFromMemory = async (
  memory: UserProfileMemory,
  sectionType: 'summary' | 'experience' | 'project' | 'leadershipActivity',
  contextString: string
): Promise<string> => {
  if (!hasApiKey()) return "Please add your Gemini API Key in Settings to use AI features.";
  const ai = getAIClient();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: PROMPT_TEMPLATES.generateFromMemory(memory, sectionType, contextString),
    });
    return response.text?.trim() || "";
  } catch (e) {
    console.error("Generate Memory Content Error", e);
    return "";
  }
};

export const optimizeSkills = async (currentSkills: string[]): Promise<string[]> => {
  if (!hasApiKey()) return currentSkills;
  const ai = getAIClient();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: PROMPT_TEMPLATES.optimizeSkills(currentSkills),
      config: { responseMimeType: "application/json", responseSchema: { type: Type.OBJECT, properties: { skills: { type: Type.ARRAY, items: { type: Type.STRING } } } } }
    });
    const result = JSON.parse(response.text || '{}');
    return Array.isArray(result.skills) ? result.skills : currentSkills;
  } catch (error) { return currentSkills; }
};

export const analyzeATS = async (resume: Resume): Promise<ATSAnalysis> => {
  if (!hasApiKey()) return { score: 0, strengths: [], weaknesses: ["API Key Missing. Go to Settings."], keywords_missing: [] };
  const ai = getAIClient();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: PROMPT_TEMPLATES.analyzeATS(resume),
      config: { responseMimeType: "application/json" }
    });
    const result = JSON.parse(response.text || '{}');
    return {
        score: typeof result.score === 'number' ? Math.round(result.score) : 0,
        strengths: Array.isArray(result.strengths) ? result.strengths : [],
        weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
        keywords_missing: Array.isArray(result.keywords_missing) ? result.keywords_missing : []
    };
  } catch (error) { return { score: 0, strengths: [], weaknesses: ["AI Error"], keywords_missing: [] }; }
};

export const rewriteResumeForATS = async (resume: Resume, analysis: ATSAnalysis): Promise<Resume> => {
  if (!hasApiKey()) return resume;
  const ai = getAIClient();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: PROMPT_TEMPLATES.rewriteATS(resume, analysis),
      config: { responseMimeType: "application/json" }
    });
    return { ...resume, ...sanitizeResume(JSON.parse(response.text || '{}')), id: resume.id };
  } catch (error) { return resume; }
}

const researchJobContext = async (query: string, context: string): Promise<{ text: string; chunks: GroundingChunk[] }> => {
  if (!hasApiKey()) return { text: "", chunks: [] };
  const ai = getAIClient();
  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Research: ${query}. Context: ${context}`,
      config: { tools: [{googleSearch: {}}] },
    });
    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const chunks = rawChunks.map((c: any) => c.web && c.web.uri ? { web: { uri: c.web.uri, title: c.web.title } } : undefined).filter(Boolean) as GroundingChunk[];
    return { text: response.text?.trim() || "", chunks };
  } catch (e) { return { text: "", chunks: [] }; }
}

export const tailorResumeToJob = async (resume: Resume, jobDescription: string): Promise<Resume> => {
  if (!hasApiKey()) return resume;
  const ai = getAIClient();

  try {
    const research = await researchJobContext("Company values & role reqs", jobDescription.substring(0, 1000));
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: PROMPT_TEMPLATES.tailor(resume, jobDescription, research.text),
      config: { responseMimeType: "application/json" }
    });
    return { ...resume, ...sanitizeResume(JSON.parse(response.text || '{}')), id: resume.id, researchContext: { summary: research.text, sources: research.chunks } };
  } catch (error) { return resume; }
};

export const parseResumeFromText = async (text: string): Promise<Partial<Resume>> => {
  if (!hasApiKey()) return {};
  const ai = getAIClient();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Extract JSON from: ${text.substring(0, 12000)}`,
      config: { responseMimeType: "application/json" }
    });
    return sanitizeResume(JSON.parse(response.text || '{}'));
  } catch (error) { return {}; }
};

export const mergeDataIntoMemory = async (currentMemory: UserProfileMemory, newTextData: string): Promise<UserProfileMemory> => {
  if (!hasApiKey()) throw new Error("API Key missing. Please configure in Settings.");
  const ai = getAIClient();

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Merge into Memory JSON: ${JSON.stringify(currentMemory)}. New Data: ${newTextData.substring(0, 20000)}`,
      config: { responseMimeType: "application/json" }
    });
    return { ...currentMemory, ...sanitizeMemory(JSON.parse(response.text || '{}')), lastUpdated: Date.now() };
  } catch (error) { throw new Error("Failed to merge data."); }
};

export const processAndMergeFilesIntoMemory = async (
  fileContents: string[],
  currentMemory: UserProfileMemory
): Promise<UserProfileMemory> => {
  if (!hasApiKey()) throw new Error("API Key missing. Please configure in Settings.");
  const ai = getAIClient();

  // Combine all file contents into a single string for the prompt
  const combinedText = fileContents.join('\n\n--- FILE BREAK ---\n\n');

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      // The prompt is carefully crafted to instruct the Gemini model
      // to extract and merge data from multiple file contents into the existing memory structure.
      contents: `Given the following user profile memory:
      ${JSON.stringify(currentMemory)}
      
      And the following new raw data from multiple files:
      ${combinedText}
      
      Extract and merge all relevant personal information, experiences, education, projects, leadership activities, and skills from the raw data into the user profile memory. Only include information that is explicitly present or clearly inferable. Do not hallucinate.

      Return the updated UserProfileMemory in JSON format.`,
      config: { responseMimeType: "application/json" }
    });
    
    const newMemoryData = JSON.parse(response.text || '{}');
    return { ...currentMemory, ...sanitizeMemory(newMemoryData), lastUpdated: Date.now() };

  } catch (error) {
    console.error("Error processing and merging files into memory:", error);
    throw new Error("Failed to process and merge file contents into memory.");
  }
};

export const generateMemoryQuestions = async (memory: UserProfileMemory): Promise<QnAItem[]> => {
  if (!hasApiKey()) return [];
  const ai = getAIClient();
  
  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Ask 3 clarifying questions for: ${JSON.stringify(memory)}`,
      config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } } } } } }
    });
    const result = JSON.parse(response.text || '[]');
    return (Array.isArray(result) ? result : []).map((q: any) => ({ id: Math.random().toString(36).substr(2, 9), question: q.question, options: q.options, dateAdded: Date.now() }));
  } catch (error) { return []; }
};

export const generateResumeFromMemory = async (memory: UserProfileMemory, jobDescription?: string): Promise<Resume> => {
  if (!hasApiKey()) throw new Error("API Key missing. Please configure in Settings.");
  const ai = getAIClient();

  try {
    let research = { text: "", chunks: [] as GroundingChunk[] };
    if (jobDescription) research = await researchJobContext("Job Research", jobDescription.substring(0, 500));
    else research = await researchJobContext("Role Research", memory.experiences[0]?.role || "General");

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Generate Resume JSON. Memory: ${JSON.stringify(memory)}. Research: ${research.text}`,
      config: { responseMimeType: "application/json" }
    });
    return { ...sanitizeResume(JSON.parse(response.text || '{}')), researchContext: { summary: research.text, sources: research.chunks } };
  } catch (error) { throw error; }
};

import { GitHubRepo, AnalyzedProject } from '../types';

export const analyzeGitHubRepo = async (repoData: GitHubRepo, readmeContent: string | null): Promise<AnalyzedProject> => {
  if (!hasApiKey()) throw new Error("API Key missing. Please configure in Settings.");
  const ai = getAIClient();

  const prompt = `
    Analyze the following GitHub repository for a resume.
    Repository Name: ${repoData.name}
    Full Name: ${repoData.full_name}
    Description: ${repoData.description || 'No description provided.'}
    URL: ${repoData.html_url}
    Language: ${repoData.language || 'Not specified.'}
    Stars: ${repoData.stargazers_count}
    Forks: ${repoData.forks_count}
    Last Pushed: ${repoData.pushed_at}
    Topics: ${repoData.topics.join(', ') || 'No topics.'}
    Has Issues: ${repoData.has_issues ? 'Yes' : 'No'}
    Has Homepage: ${repoData.homepage ? 'Yes' : 'No'}
    Archived: ${repoData.archived ? 'Yes' : 'No'}
    ${readmeContent ? `\nREADME Content:\n${readmeContent.substring(0, 2000)}` : ''}

    Based on the above data, provide a JSON analysis with the following properties:
    - completenessScore (number, 0-100: How complete and production-ready the project appears)
    - workingStatus (string: 'unknown' | 'working' | 'not working' - infer from README, homepage, issues)
    - advancedTechUsed (string[]: List of advanced technologies or algorithms used)
    - activityLevel (string: 'low' | 'medium' | 'high' - based on last pushed date, commits (if known), issues)
    - majorProject (boolean: Is this a significant, impactful project?)
    - domainSpecific (string[]: E.g., ['web development', 'machine learning', 'data science', 'mobile development'])
    - aiSummary (string: A concise, AI-generated summary suitable for a resume)
    - suggestedBulletPoints (string[]: 3-5 concise bullet points highlighting achievements and impact for a resume, quantified where possible.)

    Ensure the JSON is correctly formatted.
    `;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST, // Using the fast model for analysis
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const result = JSON.parse(response.text || '{}');

    // Sanitize and map to AnalyzedProject interface
    const analyzedProject: AnalyzedProject = {
      id: repoData.full_name,
      repoName: repoData.full_name,
      description: repoData.description || '',
      htmlUrl: repoData.html_url,
      language: repoData.language,
      lastActivity: repoData.pushed_at,
      completenessScore: result.completenessScore || 0,
      workingStatus: result.workingStatus || 'unknown',
      advancedTechUsed: result.advancedTechUsed || [],
      activityLevel: result.activityLevel || 'unknown', // Need to map to 'low'|'medium'|'high'
      majorProject: result.majorProject || false,
      domainSpecific: result.domainSpecific || [],
      aiSummary: result.aiSummary || 'AI summary unavailable.',
      suggestedBulletPoints: result.suggestedBulletPoints || [],
    };
    return analyzedProject;

  } catch (error) {
    console.error("Error analyzing GitHub repo:", error);
    // Return a default analyzed project on error
    return {
      id: repoData.full_name,
      repoName: repoData.full_name,
      description: repoData.description || '',
      htmlUrl: repoData.html_url,
      language: repoData.language,
      lastActivity: repoData.pushed_at,
      completenessScore: 0,
      workingStatus: 'unknown',
      advancedTechUsed: [],
      activityLevel: 'unknown',
      majorProject: false,
      domainSpecific: [],
      aiSummary: 'Analysis failed due to an AI error.',
      suggestedBulletPoints: [],
    };
  }
};
