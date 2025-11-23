import { GoogleGenAI, Type } from "@google/genai";
import { Resume, ATSAnalysis, UserProfileMemory, QnAItem, LeadershipActivity, GroundingChunk } from "../types";

// Initialize Gemini Client
const apiKey = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

const MODEL_FAST = 'gemini-2.5-flash';

// --- Helper: Sanitize AI JSON ---
// Ensures robust data types even if AI hallucinates a different structure (like arrays for descriptions)
export const sanitizeResume = (data: any): Resume => {
  const ensureString = (val: any) => {
    if (!val) return '';
    let str = '';
    if (Array.isArray(val)) str = val.join('\n');
    else if (typeof val === 'string') str = val;
    else if (typeof val === 'number') str = String(val);
    else if (typeof val === 'object') str = JSON.stringify(val); // Fallback
    
    // Remove common AI placeholders like [x], [Y]%, [Date]
    return str.replace(/\[(x|X|y|Y|z|Z|date|Date|\d+)?\]%?/g, '').trim();
  };

  const ensureArray = (arr: any) => Array.isArray(arr) ? arr : [];

  // Merge internships into experience if the AI separates them
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
    experience: rawExperience.map((exp: any) => ({
      id: exp.id || Math.random().toString(36).substr(2, 9),
      role: exp.role || exp.title || exp.position || 'Role',
      company: exp.company || exp.organization || 'Company',
      startDate: exp.startDate || exp.start_date || '',
      endDate: exp.endDate || exp.end_date || '',
      description: ensureString(exp.description || exp.summary || exp.responsibilities)
    })),
    // Fix: Check for both 'education' and 'educations' and extra synonyms
    education: ensureArray(data.education || data.educations).map((edu: any) => ({
      id: edu.id || Math.random().toString(36).substr(2, 9),
      degree: edu.degree || edu.qualification || edu.major || edu.title || '',
      school: edu.school || edu.institution || edu.university || edu.college || '',
      year: String(edu.year || edu.date || edu.dates || '')
    })),
    projects: ensureArray(data.projects).map((proj: any) => ({
      id: proj.id || Math.random().toString(36).substr(2, 9),
      name: proj.name || proj.title || 'Project',
      description: ensureString(proj.description || proj.summary || proj.details || proj.content),
      link: proj.link || proj.url || '',
      repoLink: proj.repoLink || proj.github || proj.code || ''
    })),
    leadershipActivities: ensureArray(data.leadershipActivities || data.activities || data.leadership).map((activity: any) => ({
      id: activity.id || Math.random().toString(36).substr(2, 9),
      name: activity.name || activity.title || '',
      description: ensureString(activity.description || activity.summary || activity.details || activity.contributions),
      dateRange: activity.dateRange || activity.dates || activity.year || '',
    })),
    // Deduplicate skills using Set and trim whitespace
    skills: Array.from(new Set(ensureArray(data.skills).map((skill: any) => {
      let s = '';
      if (typeof skill === 'string') s = skill;
      else if (typeof skill === 'object' && skill !== null) {
        s = skill.name || skill.skill || skill.value || Object.values(skill)[0] || '';
      } else {
        s = String(skill);
      }
      return s.trim();
    }))).filter((s: string) => s.length > 0),
    researchContext: data.researchContext || undefined,
    hiddenKeywords: ensureArray(data.hiddenKeywords).map(String)
  };
};

// --- Helper: Sanitize Memory ---
export const sanitizeMemory = (data: any): UserProfileMemory => {
  const ensureArray = (arr: any) => Array.isArray(arr) ? arr : [];
  const ensureString = (val: any) => (typeof val === 'string' ? val : (Array.isArray(val) ? val.join('\n') : ''));

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
    experiences: rawExperience.map((exp: any) => ({
      id: exp.id || Math.random().toString(36).substr(2, 9),
      role: exp.role || '',
      company: exp.company || '',
      startDate: exp.startDate || '',
      endDate: exp.endDate || '',
      description: ensureString(exp.description)
    })),
    educations: ensureArray(data.educations || data.education).map((edu: any) => ({
      id: edu.id || Math.random().toString(36).substr(2, 9),
      degree: edu.degree || edu.qualification || edu.major || '',
      school: edu.school || edu.institution || edu.university || '',
      year: String(edu.year || edu.date || '')
    })),
    projects: ensureArray(data.projects).map((proj: any) => ({
      id: proj.id || Math.random().toString(36).substr(2, 9),
      name: proj.name || '',
      description: ensureString(proj.description),
      link: proj.link || '',
      repoLink: proj.repoLink || ''
    })),
    leadershipActivities: ensureArray(data.leadershipActivities || data.activities || data.leadership).map((activity: any) => ({
      id: activity.id || Math.random().toString(36).substr(2, 9),
      name: activity.name || '',
      description: ensureString(activity.description),
      dateRange: activity.dateRange || '',
    })),
    skills: Array.from(new Set(ensureArray(data.skills).map((s: any) => {
      if (typeof s === 'string') return s.trim();
      if (typeof s === 'object' && s !== null) return (s.name || s.skill || Object.values(s)[0] || '').trim();
      return String(s).trim();
    }).filter((s: string) => s.length > 0))),
    rawSourceFiles: ensureArray(data.rawSourceFiles).map(String),
    qna: ensureArray(data.qna).map((q: any) => ({
      id: q.id || Math.random().toString(36).substr(2, 9),
      question: typeof q.question === 'string' ? q.question : 'Details needed.',
      options: Array.isArray(q.options) ? q.options.map(String) : [],
      dateAdded: q.dateAdded || Date.now()
    }))
  };
};

export const enhanceContent = async (
  content: string, 
  context: string = "resume section"
): Promise<{ refinedText: string; impactScore: number; changes: string }> => {
  if (!apiKey) return { refinedText: content, impactScore: 0, changes: "API Key missing" };

  try {
    const prompt = `
      You are an expert executive resume writer. 
      Task: Enhance the following text.
      Context/Instructions: ${context}
      
      Requirements for "1-Minute Readability":
      - **Power Verbs Only**: Start every bullet with a strong action verb (e.g., Spearheaded, Orchestrated, Engineered).
      - **Ultra-Concise**: Remove all fluff. No "Responsible for", "Helped with". Be direct.
      - **Quantify Impact**: MANDATORY. Use numbers, percentages, and metrics (e.g. "Reduced latency by 40%"). If exact numbers are unknown, estimate conservatively or use "significantly".
      - **Structure**: Return the result as a list of bullet points. **Start EACH bullet with an asterisk (*) followed by a space.**
      - **Formatting**: Use **bold** for key metrics or technologies (e.g. "Increased revenue by **20%**").
      - **NO PLACEHOLDERS**: Never use [x] or [number].
      
      Input Text: "${content}"
      
      Return JSON with:
      - refinedText: The rewritten version (string with newlines).
      - impactScore: A score from 0-10 based on impact (0 being weak, 10 being highly impactful and quantified).
      - changes: A brief explanation of improvements.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            refinedText: { type: Type.STRING },
            impactScore: { type: Type.NUMBER },
            changes: { type: Type.STRING },
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      refinedText: result.refinedText || content,
      impactScore: result.impactScore || 5,
      changes: result.changes || "Optimized wording."
    };
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
  if (!apiKey) return "";

  try {
    let specificGuidelines = "";
    
    if (sectionType === 'project') {
      specificGuidelines = `
      - **Project Structure**: Generate 3-4 concise bullet points.
      - **Content**: 
        1. First bullet: What was built and the core tech stack (e.g. **React**, **Python**).
        2. Second bullet: Key technical challenge solved or feature implemented.
        3. Third bullet: Quantifiable outcome or impact (e.g. **Reduced latency by 30%**).
      - **Style**: Use strong action verbs (Architected, Deployed, Engineered).
      `;
    } else if (sectionType === 'experience') {
      specificGuidelines = `
      - **Experience Structure**: Generate 3-5 bullet points using the STAR method.
      - **Content**: Focus on achievements over responsibilities.
      - **Quantify**: Ensure at least 2 bullets have metrics.
      `;
    }

    const prompt = `
      You are an expert Resume Writer and Career Strategist.
      
      User Career Memory: ${JSON.stringify(memory)}
      
      Task: Write high-quality content for a "${sectionType}" section based on the memory provided.
      Specific Context for this section: ${contextString}
      
      Rules:
      - **Source of Truth**: Use the Career Memory as the primary data source. If the exact project/role exists in memory, use those details.
      - **Format**: 
        - If 'summary', return a 2-3 sentence professional bio OR a list of 3-4 key highlight bullets.
        - If 'experience', 'project', or 'leadershipActivity', return bullet points.
        - **CRITICAL**: Start EVERY bullet point with an asterisk (*) followed by a space.
      - **Quantify**: MANDATORY. Include metrics (%, $, numbers) in every bullet point to prove impact.
      - **Bold Impact**: Use **markdown bold** to highlight numbers and key tech stacks (e.g. **React**, **$50k revenue**).
      - **Style**: Professional, direct, action-oriented. No "I" statements.
      
      ${specificGuidelines}
      
      - **Output**: Return ONLY the text content (no JSON, no markdown headers).
    `;
    
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
    });
    
    return response.text?.trim() || "";
  } catch (e) {
    console.error("Generate Memory Content Error", e);
    return "";
  }
};

export const optimizeSkills = async (currentSkills: string[]): Promise<string[]> => {
  if (!apiKey || currentSkills.length === 0) return currentSkills;

  try {
    const prompt = `
      You are an expert Technical Recruiter.
      Review this list of skills and optimize it.

      Input Skills: ${JSON.stringify(currentSkills)}

      Tasks:
      1. **Deduplicate**: Remove synonyms (e.g., "React" vs "React.js" -> keep "React").
      2. **Standardize**: Use standard capitalization (e.g., "javascript" -> "JavaScript").
      3. **Consolidate**: Remove redundant specificity if the general term covers it (unless specific version is critical).
      4. **Filter**: Remove weak or irrelevant skills (e.g., "MS Word", "Internet").
      5. **Sort**: Order by industry relevance and impact.

      Return a JSON object with a "skills" property containing the array of strings.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            skills: { type: Type.ARRAY, items: { type: Type.STRING } }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return Array.isArray(result.skills) ? result.skills : currentSkills;
  } catch (error) {
    console.error("Skill Optimize Error", error);
    return currentSkills;
  }
};

export const analyzeATS = async (resume: Resume): Promise<ATSAnalysis> => {
  if (!apiKey) return { score: 0, strengths: [], weaknesses: ["API Key Missing"], keywords_missing: [] };

  try {
    const prompt = `
      You are a RUTHLESS, ALGORITHMIC Application Tracking System (ATS) Scanner. 
      Your goal is to screen candidates with zero tolerance for fluff.
      
      Target Role: "${resume.title}" (If generic, infer role from experience)
      Resume Content: ${JSON.stringify(resume)}
      
      STRICT SCORING ALGORITHM (0-100 Points):
      
      1. **Hard Skills Compliance (40 Points)**
         - Define the top 20 industry-standard hard skills for this specific role.
         - Count exactly how many matches exist in the resume.
         - Formula: (Matches Found / 20) * 40.
      
      2. **Impact Quantification (30 Points)**
         - Scan all 'experience' and 'projects' bullet points.
         - Count how many bullet points contain specific metrics (%, $, +, X to Y).
         - Formula: (Bullets with Metrics / Total Bullets) * 30.
         - If 0 metrics found, this section score is 0.
      
      3. **Content Quality (15 Points)**
         - Deduct 5 points for every instance of passive voice (e.g. "was responsible for").
         - Deduct 5 points for every weak verb (e.g. "helped", "worked", "assisted").
         - Deduct 5 points if the Summary is missing or exceeds 50 words.
      
      4. **Completeness & Formatting (15 Points)**
         - Check for presence of: Email, Phone, Location, Summary, Experience, Skills.
         - Start at 15 points. Deduct 3 points for each missing element.

      OUTPUT MUST BE VALID JSON:
      {
        "score": number (Calculated exact integer),
        "strengths": ["List specific factors that added points"],
        "weaknesses": ["List specific factors that caused deductions"],
        "keywords_missing": ["List the top 5-8 missing high-value keywords"]
      }
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING } },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING } },
            keywords_missing: { type: Type.ARRAY, items: { type: Type.STRING } },
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
        score: typeof result.score === 'number' ? Math.round(result.score) : 0,
        strengths: Array.isArray(result.strengths) ? result.strengths : [],
        weaknesses: Array.isArray(result.weaknesses) ? result.weaknesses : [],
        keywords_missing: Array.isArray(result.keywords_missing) ? result.keywords_missing : []
    };
  } catch (error) {
    console.error("ATS Error", error);
    return { score: 0, strengths: [], weaknesses: ["AI Error"], keywords_missing: [] };
  }
};

export const rewriteResumeForATS = async (resume: Resume, analysis: ATSAnalysis): Promise<Resume> => {
  if (!apiKey) return resume;

  try {
    const prompt = `
      You are a World-Class Resume Strategist & ATS Optimization Engine.
      The user's resume scored ${analysis.score}/100.
      
      Identified Weaknesses: ${JSON.stringify(analysis.weaknesses)}
      Missing Keywords to Inject: ${JSON.stringify(analysis.keywords_missing)}
      Target Role: "${resume.title}"
      
      TASK: Completely rewrite the resume to achieve a 95+ ATS Score.
      
      OPTIMIZATION RULES:
      1. **Keyword Injection**: Naturally weave the "Missing Keywords" into the Professional Summary and Experience bullet points where contextually appropriate. 
      2. **Keyword Hacking (Invisible Strategy)**: If there are critical keywords (from the Missing Keywords list) that simply do NOT fit the user's actual experience (e.g. a specific certification they don't have), DO NOT lie in the visible text. Instead, place these keywords in the "hiddenKeywords" array. This allows us to inject them invisibly for ATS algorithms.
      3. **Quantify Impact (XYZ Formula)**: Transform qualitative statements into quantitative achievements using the formula: "Accomplished [X] as measured by [Y], by doing [Z]".
      4. **Power Verbs**: Replace ALL weak openers ("Helped", "Worked on") with high-impact verbs ("Orchestrated", "Engineered", "Spearheaded").
      5. **Bold Key Terms**: Use **markdown bolding** to highlight metrics and key technologies within the text.
      6. **Format**: Start ALL bullet points with an asterisk (*) followed by a space.
      7. **Structure**: Maintain strict reverse-chronological order.
      
      Input Resume: ${JSON.stringify(resume)}
      
      Return the fully optimized Resume JSON structure, including the "hiddenKeywords" field if used.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const newResume = JSON.parse(response.text || '{}');
    const sanitizedNew = sanitizeResume(newResume);
    
    return { ...resume, ...sanitizedNew, id: resume.id }; // Preserve ID
  } catch (error) {
    console.error("ATS Rewrite Error", error);
    return resume;
  }
}

// Helper to perform research before generation
const researchJobContext = async (query: string, context: string): Promise<{ text: string; chunks: GroundingChunk[] }> => {
  if (!apiKey) return { text: "", chunks: [] };
  try {
    const prompt = `
      You are an expert AI Career Researcher.
      User Query: "${query}"
      Context: ${context}
      
      Task:
      Use Google Search to find real-time, up-to-date information about:
      1. Company culture, values, and recent news (if a company is mentioned).
      2. Key skills, interview trends, and industry standards for the role (if a role is mentioned).
      
      Return a concise summary (max 200 words) of findings that can be used to tailor a resume.
    `;
    
    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        tools: [{googleSearch: {}}],
      },
    });

    return {
      text: response.text?.trim() || "",
      chunks: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (e) {
    console.error("Research Error", e);
    return { text: "", chunks: [] };
  }
}

export const tailorResumeToJob = async (resume: Resume, jobDescription: string): Promise<Resume> => {
  if (!apiKey) return resume;

  try {
    // Step 1: Research the JD
    const researchResult = await researchJobContext(
      "Analyze this job description for company values and key role requirements.", 
      `Job Description: ${jobDescription.substring(0, 1000)}`
    );

    // Step 2: Tailor with Research
    const prompt = `
      You are a career coach specializing in "1-Minute Skimmable Resumes". 
      Tailor this resume to match the Job Description provided, using the AI Research Insights for extra grounding.
      
      AI Research Insights: ${researchResult.text}
      Job Description: ${jobDescription}
      Resume JSON: ${JSON.stringify(resume)}

      Requirements:
      1. **Brevity & Impact**: Optimize the summary and bullets for a 60-second skim.
      2. **Keywords**: Naturally integrate JD keywords and Research insights into bullet points.
      3. **Bold Key Terms**: Use **markdown bolding** for critical skills matching the JD.
      4. **Format**: Start ALL bullet points with an asterisk (*) followed by a space.
      5. **Title**: Update the resume "title" field to match the Target Job Role EXACTLY.
      6. **Hidden Keywords**: If there are strict keyword requirements in the JD that the user lacks, add them to "hiddenKeywords" for ATS matching.
      
      Return the full updated Resume JSON structure.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: {
        responseMimeType: "application/json"
      }
    });

    const newResume = JSON.parse(response.text || '{}');
    const sanitizedNew = sanitizeResume(newResume);
    
    // Attach research context so the user knows what powered the change
    return { 
      ...resume, 
      ...sanitizedNew, 
      id: resume.id,
      researchContext: {
        summary: researchResult.text,
        sources: researchResult.chunks
      }
    }; 
  } catch (error) {
    console.error("Tailor Error", error);
    return resume;
  }
};

export const parseResumeFromText = async (text: string): Promise<Partial<Resume>> => {
  if (!apiKey) return {};

  try {
    const prompt = `
      Extract resume data from the following text into a structured JSON format.
      Text: "${text.substring(0, 12000)}" 
      
      Task:
      Map the text to this structure:
      - personalInfo: { fullName, email, phone, location, linkedin, website, summary }
      - experience: Array of { role, company, startDate, endDate, description }
      - education: Array of { degree, school, year }
      - skills: Array of strings
      - projects: Array of { name, description, link, repoLink }
      - leadershipActivities: Array of { name, description, dateRange } 

      CRITICAL INSTRUCTIONS: 
      1. **Internships**: IMPORTANT! Classify all internships as "experience".
      2. **Links**: Identify "Demo/Live" links vs "GitHub/Code" links.
      3. **Education**: Extract degree, school, and year.
      4. **Summary**: Extract or generate a brief professional summary.
      5. **Leadership**: Extract volunteering/leadership.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const parsed = JSON.parse(response.text || '{}');
    return sanitizeResume(parsed);
  } catch (error) {
    console.error("Parse Error", error);
    return {};
  }
};

// --- Memory Functions ---

export const mergeDataIntoMemory = async (currentMemory: UserProfileMemory, newTextData: string): Promise<UserProfileMemory> => {
  if (!apiKey) throw new Error("API Key missing for memory merge.");

  try {
    const prompt = `
      You are a Personal Career Data Archivist.
      
      Current User Memory JSON: ${JSON.stringify({ ...currentMemory, qna: [] })}
      New Data Source: "${newTextData.substring(0, 20000)}"
      
      Task: 
      1. Extract skills, experience, projects, education, personal info, AND leadership/activities.
      2. Merge into Memory.
      3. **Intelligent Deduplication**: Merge similar roles, projects, activities.
      4. **Internships**: Ensure ALL Internships are stored in the "experiences" array.
      5. **Education**: Ensure ALL Education is extracted (degree, school, year).
      
      CRITICAL JSON FORMATTING RULES:
      - Ensure the ENTIRE output is a single, perfectly valid JSON object.
      - ALL string values must be properly escaped for JSON.
      
      Return the FULL updated UserProfileMemory JSON (excluding qna field).
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    let updatedMemory: any;
    try {
      updatedMemory = JSON.parse(response.text || '{}');
    } catch (parseError) {
      console.error("JSON Parse Error in mergeDataIntoMemory:", parseError);
      throw new Error("AI returned malformed JSON during memory merge. Please try again or simplify your input.");
    }

    const sanitizedUpdate = sanitizeMemory(updatedMemory);

    return {
      ...currentMemory,
      ...sanitizedUpdate,
      qna: currentMemory.qna || [],
      rawSourceFiles: currentMemory.rawSourceFiles || [],
      lastUpdated: Date.now(),
    };

  } catch (error) {
    console.error("Memory Merge Error", error);
    if (error instanceof Error && error.message.includes("AI returned malformed JSON")) {
      throw error; 
    }
    throw new Error("Failed to merge data into memory. Please check your input and try again.");
  }
};

export const generateMemoryQuestions = async (memory: UserProfileMemory): Promise<QnAItem[]> => {
  if (!apiKey) return [];
  
  try {
    const prompt = `
      Analyze the following Career Memory to identify critical gaps.
      Memory: ${JSON.stringify(memory)}
      
      Task:
      Ask 3-4 specific questions to clarify missing metrics or outcomes.
      For each question, provide 3-4 "options" (suggested short answers).
      
      Return JSON array: { "question": "string", "options": ["string", "string"] }
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: { 
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              question: { type: Type.STRING },
              options: { type: Type.ARRAY, items: { type: Type.STRING } }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '[]');
    const safeResult = Array.isArray(result) ? result : [];
    
    return safeResult.map((q: any) => ({
      id: Math.random().toString(36).substr(2, 9),
      question: typeof q.question === 'string' ? q.question : 'Could you provide more details on your experience?',
      options: Array.isArray(q.options) ? q.options.filter((o: any) => typeof o === 'string') : [],
      dateAdded: Date.now()
    }));

  } catch (error) {
    console.error("Question Gen Error", error);
    return [];
  }
};

export const generateResumeFromMemory = async (memory: UserProfileMemory, jobDescription?: string): Promise<Resume> => {
  if (!apiKey) throw new Error("API Key missing");

  try {
    // Step 1: Research (If JD exists, research JD. If not, research the role from memory)
    let researchContext = { text: "", chunks: [] as GroundingChunk[] };
    let contextStr = "General professional resume.";
    
    if (jobDescription) {
       contextStr = `Job Description: ${jobDescription.substring(0, 500)}...`;
       researchContext = await researchJobContext("Research this job description for company values and role focus.", contextStr);
    } else {
       // Infer role from memory (most recent experience)
       const recentRole = memory.experiences[0]?.role || "Software Engineer";
       contextStr = `Target Role: ${recentRole}`;
       researchContext = await researchJobContext(`What are the top resume keywords and skills for a ${recentRole} in 2025?`, contextStr);
    }

    const prompt = `
      You are an expert Executive Resume Architect.
      
      Source Material: ${JSON.stringify(memory)}
      Target Context: ${contextStr}
      AI Research Insights: ${researchContext.text}
      
      Task:
      Create a tailored resume JSON.
      
      CRITICAL RULES:
      1. **Incorporate Research**: Use the "AI Research Insights" to prioritize skills and keywords.
      2. **Summary**: Generate a strong 2-3 sentence bio OR a set of bullet points.
      3. **Structure**: Experience -> Education -> Projects -> LeadershipActivities.
      4. **Bold Key Terms**: Use **markdown bolding** to highlight key skills, metrics, and achievements.
      5. **Projects**: Provide punchy bullet points (3-4 per project) starting with power verbs and quantifying impact.
      6. **Formatting**: Start ALL bullet points with an asterisk (*) followed by a space.
      7. **Title**: Generate a SPECIFIC professional title.
      
      Return ONLY the JSON structure matching the Resume interface.
    `;

    const response = await ai.models.generateContent({
      model: MODEL_FAST,
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const generatedResume = JSON.parse(response.text || '{}');
    const sanitized = sanitizeResume(generatedResume);
    
    return {
      ...sanitized,
      researchContext: {
        summary: researchContext.text,
        sources: researchContext.chunks
      }
    };

  } catch (error) {
    console.error("Generate from Memory Error", error);
    throw error;
  }
};