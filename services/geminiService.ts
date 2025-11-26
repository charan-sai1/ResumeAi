
import { GoogleGenAI, Type } from "@google/genai";
import { Resume, ATSAnalysis, UserProfileMemory, QnAItem, LeadershipActivity, GroundingChunk } from "../types";

// Rate limiting and caching utilities
class RateLimiter {
  private requests: number[] = [];
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) { // 10 requests per minute
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  async waitForSlot(): Promise<void> {
    const now = Date.now();

    // Remove old requests outside the window
    this.requests = this.requests.filter(time => now - time < this.windowMs);

    if (this.requests.length >= this.maxRequests) {
      // Calculate wait time until oldest request expires
      const oldestRequest = Math.min(...this.requests);
      const waitTime = this.windowMs - (now - oldestRequest);

      if (waitTime > 0) {
        console.log(`Rate limit reached. Waiting ${waitTime}ms...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.waitForSlot(); // Recursively check again
      }
    }

    this.requests.push(now);
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter();

// Response cache
const responseCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

function getCacheKey(operation: string, params: any): string {
  return `${operation}:${JSON.stringify(params)}`;
}

function getCachedResponse(key: string): any | null {
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  responseCache.delete(key);
  return null;
}

function setCachedResponse(key: string, data: any, ttl: number = 300000): void { // 5 minutes default
  responseCache.set(key, { data, timestamp: Date.now(), ttl });
}

// Enhanced API call with rate limiting and caching
async function makeAPICall<T>(
  operation: string,
  params: any,
  apiCall: () => Promise<T>,
  cacheTTL: number = 300000,
  useCache: boolean = true
): Promise<T> {
  const cacheKey = getCacheKey(operation, params);

  // Check cache first
  if (useCache) {
    const cached = getCachedResponse(cacheKey);
    if (cached !== null) {
      console.log(`Using cached response for ${operation}`);
      return cached;
    }
  }

  // Wait for rate limit slot
  await rateLimiter.waitForSlot();

  try {
    console.log(`Making API call: ${operation}`);
    const result = await apiCall();
    rateLimiter.recordRequest();

    // Cache successful responses
    if (useCache) {
      setCachedResponse(cacheKey, result, cacheTTL);
    }

    return result;
  } catch (error: any) {
    console.error(`API call failed for ${operation}:`, error);

    // Handle rate limiting with exponential backoff
    if (error?.status === 429 || error?.code === 429) {
      const retryAfter = error?.headers?.['retry-after'] ||
                         error?.details?.[0]?.retryDelay ||
                         '60s';

      let waitTime = 60000; // Default 60 seconds
      if (typeof retryAfter === 'string') {
        const match = retryAfter.match(/(\d+)/);
        if (match) {
          waitTime = parseInt(match[1]) * 1000;
        }
      }

      console.log(`Rate limited. Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));

      // Retry once with fresh rate limit check
      return makeAPICall(operation, params, apiCall, cacheTTL, useCache);
    }

    throw error;
  }
}

// User-friendly error handling for API issues
export function handleAPIError(error: any, operation: string): { type: 'error' | 'warning'; message: string; tips?: string[] } {
  if (error?.status === 429 || error?.code === 429) {
    return {
      type: 'warning',
      message: 'API rate limit reached. Using cached results where available.',
      tips: [
        'Free tier allows 10 requests per minute',
        'Consider upgrading to a paid plan for higher limits',
        'Results are cached to reduce future API calls'
      ]
    };
  }

  if (error?.status === 403 || error?.code === 403) {
    return {
      type: 'error',
      message: 'API access denied. Please check your API key.',
      tips: [
        'Verify your Gemini API key is correct',
        'Ensure your API key has the necessary permissions',
        'Check your billing status with Google AI Studio'
      ]
    };
  }

  if (error?.status >= 500) {
    return {
      type: 'warning',
      message: 'AI service temporarily unavailable. Using fallback methods.',
      tips: [
        'Try again in a few minutes',
        'Some features may work with cached data'
      ]
    };
  }

  return {
    type: 'error',
    message: `Failed to ${operation}. Please try again.`,
    tips: [
      'Check your internet connection',
      'Try refreshing the page',
      'Contact support if the issue persists'
    ]
  };
}

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
    lastUpdated: data.lastUpdated || Date.now(),
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
    })),
    githubProjects: ensureArray(data.githubProjects) // Keep githubProjects as-is
  };
};

// ============================================================================
// 2. PROMPT TEMPLATES (Modular AI Instructions)
// ============================================================================

const PROMPT_TEMPLATES = {

  enhance: (content: string, context: string) => `
  ROLE: You are an elite HR Director at a Fortune 100 company with 20+ years of experience in executive resume optimization and ATS systems.

  OBJECTIVE: Transform the input into maximum-impact, quantified achievements that pass 99% of ATS systems and impress hiring managers in <6 seconds.

  CORE PRINCIPLES (MANDATORY):
  1. QUANTIFY EVERYTHING - Every achievement must have numbers (%, $, time saved, users impacted, efficiency gains)
  2. DEDUPLICATE RUTHLESSLY - Remove all redundant information, merge similar points
  3. THINK LIKE AN HR EXECUTIVE - Focus on business impact, not technical tasks
  4. MAXIMUM BULLET POINTS - Generate 4-6 strong bullets per experience (not 2-3)

  TASK: Intensify and enhance the following content.
  Context: ${context}

  STRICT FORMAT RULES:
  - Each bullet MUST:
    • Start with "* "
    • Begin with a Power Verb (Led, Engineered, Accelerated, Optimized, Delivered, Orchestrated, Scaled, Built, Automated, Reduced, Increased, Revamped, Pioneered, Streamlined, Spearheaded, Architected, Transformed)
    • Follow: [Action Verb] + [What] + [How/Method] + [Quantified Impact]
    • Include AT LEAST 2 metrics per bullet

  QUANTIFICATION RULES (CRITICAL):
  - Always include: percentages (%), dollar amounts ($), time metrics (hours/days saved), scale (users/requests/records)
  - Examples: "**45% faster**", "**$2M revenue**", "**10,000+ users**", "**99.9% uptime**"
  - If exact numbers unknown, use reasonable professional estimates based on context
  - EVERY bullet must have measurable impact

  SENTENCE RULES:
  - Maximum 1.5 lines per bullet
  - Ultra-concise, executive tone
  - No passive voice, no fluff words
  - Start strong, end with impact

  DEDUPLICATION:
  - Merge overlapping achievements
  - Remove generic responsibilities
  - Consolidate similar technologies/tools

  Input Content:
  "${content}"

  OUTPUT FORMAT (JSON ONLY):
  {
    "refinedText": "...",
    "impactScore": number (0-100 based on quantification + clarity + business value),
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
  ROLE: You are a Senior ATS System Engineer and HR Technology Consultant with expertise in Workday, Greenhouse, Lever, and Taleo ATS platforms.

  TARGET ROLE:
  ${resume.title}

  RESUME DATA:
  ${JSON.stringify(resume)}

  OBJECTIVE: Perform STRICT multi-pattern ATS analysis with 99% accuracy requirement. Be HARSH - only scores above 85 should pass modern ATS systems.

  CRITICAL ANALYSIS PATTERNS (ALL REQUIRED):

  1. KEYWORD DENSITY ANALYSIS (Weight: 30%)
     - Check for role-specific keywords (minimum 15-20 required)
     - Technical skills must appear 2-3 times naturally
     - Industry buzzwords and certifications
     - Scan: job title variations, action verbs, tools/technologies

  2. QUANTIFICATION CHECK (Weight: 25%)
     - EVERY experience bullet must have metrics
     - Look for: %, $, numbers, time savings, scale indicators
     - Missing metrics = automatic 20-point deduction

  3. FORMATTING COMPLIANCE (Weight: 15%)
     - Bullet consistency (all start with *)
     - No special characters that break parsing
     - Clean section headers
     - Proper date formats

  4. IMPACT CLARITY (Weight: 20%)
     - Each bullet shows clear business value
     - No generic responsibilities
     - Action verb + method + result structure
     - Accomplishments > Duties

  5. ROLE ALIGNMENT (Weight: 10%)
     - Skills match job requirements
     - Experience progression makes sense
     - No significant gaps or red flags

  STRICT SCORING RUBRIC:
  - 90-100: Exceptional - Will pass 99% of ATS systems
  - 80-89: Strong - Likely to pass, minor improvements needed
  - 70-79: Moderate - Significant gaps, 50% pass rate
  - 60-69: Weak - Major issues, unlikely to pass
  - Below 60: Critical - Will be rejected by most ATS

  WEAKNESSES MUST BE SPECIFIC:
  ❌ Bad: "Needs more keywords"
  ✅ Good: "Missing key technologies: React, Node.js, AWS (found in 95% of similar roles)"

  RETURN JSON ONLY:
  {
    "score": number (0-100, be STRICT),
    "strengths": ["Specific strength with evidence"],
    "weaknesses": ["Actionable weakness with exact fix needed"],
    "keywords_missing": ["Critical keyword 1", "Critical keyword 2", ...],
    "recommendations": ["Priority 1: Fix X by doing Y", "Priority 2: ..."]
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

export const mergeBatchAnswersIntoMemory = async (
  currentMemory: UserProfileMemory,
  qnaPairs: Array<{ question: string; answer: string }>
): Promise<UserProfileMemory> => {
  if (!hasApiKey()) throw new Error("API Key missing. Please configure in Settings.");
  const ai = getAIClient();

  // Format all Q&A pairs for batch processing
  const formattedQnaData = qnaPairs.map((pair, index) =>
    `Q${index + 1}: ${pair.question}\nA${index + 1}: ${pair.answer}`
  ).join('\n\n');

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: `Given the following user profile memory:
${JSON.stringify(currentMemory)}

And the following Q&A responses to merge:
${formattedQnaData}

Extract and merge all relevant personal information, experiences, education, projects, leadership activities, and skills from the Q&A responses into the user profile memory. Only include information that is explicitly present or clearly inferable. Do not hallucinate.

Return the updated UserProfileMemory in JSON format.`,
      config: { responseMimeType: "application/json" }
    });

    const newMemoryData = JSON.parse(response.text || '{}');
    return { ...currentMemory, ...sanitizeMemory(newMemoryData), lastUpdated: Date.now() };
  } catch (error) {
    console.error("Error merging batch Q&A answers:", error);
    throw new Error("Failed to merge Q&A answers into memory.");
  }
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

export const scoreProjectRelevance = async (project: AnalyzedProject, jobRole: string): Promise<number> => {
  if (!hasApiKey()) throw new Error("API Key missing. Please configure in Settings.");
  const ai = getAIClient();

  try {
    const prompt = `
      Score how relevant this project is for a ${jobRole} position on a scale of 0-100.

      Project Details:
      - Name: ${project.repoName}
      - Description: ${project.description}
      - Technologies: ${project.advancedTechUsed.join(', ')}
      - Domains: ${project.domainSpecific.join(', ')}
      - Summary: ${project.aiSummary}

      Consider:
      - Technical skills match
      - Domain relevance
      - Project complexity and impact
      - Industry alignment

      Return only a JSON object with a single property "relevanceScore" (number 0-100).
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const result = JSON.parse(response.text || '{}');
    return Math.min(100, Math.max(0, result.relevanceScore || 0));
  } catch (error) {
    console.error("Error scoring project relevance:", error);
    return 50; // Default medium relevance on error
  }
};

export const scoreMultipleProjectsRelevance = async (
  projects: AnalyzedProject[],
  jobRole: string
): Promise<AnalyzedProject[]> => {
  if (!hasApiKey()) throw new Error("API Key missing. Please configure in Settings.");

  // Process projects sequentially to respect rate limits
  const scoredProjects: AnalyzedProject[] = [];

  for (const project of projects) {
    try {
      const relevanceScore = await makeAPICall(
        'scoreProjectRelevance',
        { project, jobRole },
        async () => scoreProjectRelevance(project, jobRole),
        1800000, // Cache for 30 minutes
        true
      );
      scoredProjects.push({ ...project, relevanceScore });
    } catch (error) {
      console.error(`Failed to score project ${project.repoName}:`, error);
      // Keep original project if scoring fails
      scoredProjects.push({ ...project, relevanceScore: 50 });
    }
  }

  return scoredProjects.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));
};

export const analyzeMultipleGitHubRepos = async (
  reposData: GitHubRepo[],
  readmeContents: (string | null)[]
): Promise<AnalyzedProject[]> => {
  if (!hasApiKey()) throw new Error("API Key missing. Please configure in Settings.");
  const ai = getAIClient();

  // Build batch analysis prompt
  const reposAnalysis = reposData.map((repo, index) => {
    const readme = readmeContents[index];
    return `
REPOSITORY ${index + 1}:
Name: ${repo.name}
Full Name: ${repo.full_name}
Description: ${repo.description || 'No description provided.'}
URL: ${repo.html_url}
Language: ${repo.language || 'Not specified.'}
Stars: ${repo.stargazers_count}
Forks: ${repo.forks_count}
Last Pushed: ${repo.pushed_at}
Topics: ${repo.topics.join(', ') || 'No topics.'}
Has Issues: ${repo.has_issues ? 'Yes' : 'No'}
Has Homepage: ${repo.homepage ? 'Yes' : 'No'}
Archived: ${repo.archived ? 'Yes' : 'No'}
${readme ? `README Content:\n${readme.substring(0, 1500)}` : 'No README available.'}
---`;
  }).join('\n\n');

  const prompt = `
Analyze the following ${reposData.length} GitHub repositories for resume purposes. Provide analysis for each repository.

${reposAnalysis}

For EACH repository, provide a JSON object with these properties:
- completenessScore (number, 0-100: How complete and production-ready the project appears)
- workingStatus (string: 'unknown' | 'working' | 'not working' - infer from README, homepage, issues)
- advancedTechUsed (string[]: List of advanced technologies or algorithms used)
- activityLevel (string: 'low' | 'medium' | 'high' - based on last pushed date, commits, issues)
- majorProject (boolean: Is this a significant, impactful project?)
- domainSpecific (string[]: E.g., ['web development', 'machine learning', 'data science', 'mobile development'])
- aiSummary (string: A concise, AI-generated summary suitable for a resume)
- suggestedBulletPoints (string[]: 3-5 concise bullet points highlighting achievements and impact for a resume, quantified where possible)

Return a JSON array where each element corresponds to the repositories in order (index 0 = first repo, etc.).
`;

  try {
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const results = JSON.parse(response.text || '[]');

    // Map results to AnalyzedProject array
    return reposData.map((repoData, index) => {
      const result = results[index] || {};

      return {
        id: repoData.full_name,
        repoName: repoData.full_name,
        description: repoData.description || '',
        htmlUrl: repoData.html_url,
        language: repoData.language,
        lastActivity: repoData.pushed_at,
        completenessScore: result.completenessScore || 0,
        workingStatus: result.workingStatus || 'unknown',
        advancedTechUsed: result.advancedTechUsed || [],
        activityLevel: result.activityLevel || 'low',
        majorProject: result.majorProject || false,
        domainSpecific: result.domainSpecific || [],
        aiSummary: result.aiSummary || 'AI summary unavailable.',
        suggestedBulletPoints: result.suggestedBulletPoints || [],
      };
    });

  } catch (error) {
    console.error("Error analyzing GitHub repos in batch:", error);
    // Return default analyzed projects on error
    return reposData.map(repo => ({
      id: repo.full_name,
      repoName: repo.full_name,
      description: repo.description || '',
      htmlUrl: repo.html_url,
      language: repo.language,
      lastActivity: repo.pushed_at,
      completenessScore: 0,
      workingStatus: 'unknown',
      advancedTechUsed: [],
      activityLevel: 'low',
      majorProject: false,
      domainSpecific: [],
      aiSummary: 'Batch analysis failed due to an AI error.',
      suggestedBulletPoints: [],
    }));
  }
};

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
      activityLevel: 'low',
      majorProject: false,
      domainSpecific: [],
      aiSummary: 'Analysis failed due to an AI error.',
      suggestedBulletPoints: [],
    };
  }
};

// Ethical ATS Optimization Functions
export interface SkillGapAnalysis {
  missingSkills: string[];
  transferableSkills: Array<{userSkill: string, targetSkill: string, explanation: string}>;
  recommendedActions: string[];
  confidence: number; // 0-100
}

export const analyzeSkillGaps = async (
  userResume: Resume,
  jobDescription: string
): Promise<SkillGapAnalysis> => {
  if (!hasApiKey()) {
    return {
      missingSkills: [],
      transferableSkills: [],
      recommendedActions: ["Add your Gemini API key to enable skill gap analysis"],
      confidence: 0
    };
  }

  return makeAPICall(
    'analyzeSkillGaps',
    { resume: userResume, jobDescription },
    async () => {
      const ai = getAIClient();

      const prompt = `
      Analyze the skill gaps between this candidate's resume and the job requirements.
      Provide ethical, actionable recommendations to address gaps legitimately.

      JOB DESCRIPTION:
      ${jobDescription}

      CANDIDATE RESUME:
      ${JSON.stringify(userResume)}

      Return a JSON analysis with:
      - missingSkills: Array of skills clearly missing from resume
      - transferableSkills: Array of objects with {userSkill, targetSkill, explanation} for skills that can transfer
      - recommendedActions: Specific, ethical steps to acquire missing skills (courses, projects, certifications)
      - confidence: Number 0-100 indicating how well the candidate matches overall

      Focus on LEGITIMATE skill development and experience reframing, not manipulation.
      `;

      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '{}');
      return {
        missingSkills: result.missingSkills || [],
        transferableSkills: result.transferableSkills || [],
        recommendedActions: result.recommendedActions || [],
        confidence: Math.min(100, Math.max(0, result.confidence || 0))
      };
    },
    600000, // Cache for 10 minutes
    true
  ).catch(error => {
    console.error("Skill gap analysis error:", error);
    return {
      missingSkills: [],
      transferableSkills: [],
      recommendedActions: ["Unable to analyze skills - check API key or rate limit"],
      confidence: 0
    };
  });
};

export const enhanceExperienceForATS = async (
  experience: string,
  targetSkills: string[]
): Promise<string> => {
  if (!hasApiKey()) return experience;

  return makeAPICall(
    'enhanceExperienceForATS',
    { experience, targetSkills },
    async () => {
      const ai = getAIClient();

      const prompt = `
      Enhance this work experience description to better highlight transferable skills and relevant competencies.
      Make it more ATS-friendly while remaining completely truthful and professional.

      ORIGINAL EXPERIENCE:
      ${experience}

      TARGET SKILLS TO EMPHASIZE:
      ${targetSkills.join(', ')}

      REQUIREMENTS:
      - Keep all information 100% truthful
      - Use industry-standard terminology
      - Highlight quantifiable achievements
      - Maintain professional tone
      - Make it more searchable for ATS systems

      Return only the enhanced experience description, no explanations.
      `;

      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt
      });

      return response.text?.trim() || experience;
    },
    1800000, // Cache for 30 minutes (experience enhancements are more stable)
    true
  ).catch(error => {
    console.error("Experience enhancement error:", error);
    return experience;
  });
};

export const optimizeResumeKeywords = async (
  resume: Resume,
  jobDescription: string
): Promise<{optimizedResume: Resume, keywordMatches: string[], suggestions: string[]}> => {
  if (!hasApiKey()) {
    return {
      optimizedResume: resume,
      keywordMatches: [],
      suggestions: ["Add Gemini API key for keyword optimization"]
    };
  }

  return makeAPICall(
    'optimizeResumeKeywords',
    { resume, jobDescription },
    async () => {
      const ai = getAIClient();

      const prompt = `
      Analyze this resume against the job description and provide keyword optimization suggestions.
      Focus on legitimate keyword integration, not stuffing or manipulation.

      JOB DESCRIPTION:
      ${jobDescription}

      RESUME:
      ${JSON.stringify(resume)}

      Return JSON with:
      - keywordMatches: Array of keywords from job description that appear in resume
      - suggestions: Array of specific suggestions for natural keyword integration
      - Do not modify the resume - just provide analysis and suggestions
      `;

      const response = await ai.models.generateContent({
        model: MODEL_FAST,
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });

      const result = JSON.parse(response.text || '{}');

      return {
        optimizedResume: resume, // Keep original for ethical reasons
        keywordMatches: result.keywordMatches || [],
        suggestions: result.suggestions || []
      };
    },
    600000, // Cache for 10 minutes
    true
  ).catch(error => {
    console.error("Keyword optimization error:", error);
    return {
      optimizedResume: resume,
      keywordMatches: [],
      suggestions: ["Unable to analyze keywords - check API key or rate limit"]
    };
  });
};
