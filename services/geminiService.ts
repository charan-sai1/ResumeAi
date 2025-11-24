
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
    You are an expert executive resume writer. 
    Task: Enhance the following text.
    Context/Instructions: ${context}
    
    Requirements for "1-Minute Readability":
    - **Power Verbs Only**: Start every bullet with a strong action verb.
    - **Ultra-Concise**: Remove fluff.
    - **Quantify Impact**: MANDATORY. Use numbers/metrics.
    - **Formatting**: Start EACH bullet with an asterisk (*) followed by a space. Use **bold** for metrics.
    
    Input Text: "${content}"
    
    Return JSON: { refinedText, impactScore, changes }
  `,
  generateFromMemory: (memory: UserProfileMemory, sectionType: string, contextString: string) => `
    You are an expert Resume Writer.
    Memory: ${JSON.stringify(memory)}
    Task: Write "${sectionType}" content.
    Context: ${contextString}
    Rules: Use memory, Quantify impact, Bold metrics, Return bullets (*).
    Output: ONLY text.
  `,
  optimizeSkills: (skills: string[]) => `
    Optimize skills: ${JSON.stringify(skills)}
    Return JSON: { skills: string[] }
  `,
  analyzeATS: (resume: Resume) => `
    ATS Scan for "${resume.title}".
    Resume: ${JSON.stringify(resume)}
    Score 0-100. Return JSON: { score, strengths, weaknesses, keywords_missing }
  `,
  rewriteATS: (resume: Resume, analysis: ATSAnalysis) => `
    Rewrite to fix ATS issues.
    Weaknesses: ${JSON.stringify(analysis.weaknesses)}
    Target: "${resume.title}"
    Return JSON: Full Resume.
  `,
  tailor: (resume: Resume, jobDescription: string, research: string) => `
    Tailor resume for JD.
    JD: ${jobDescription}
    Research: ${research}
    Return JSON: Full Resume.
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
