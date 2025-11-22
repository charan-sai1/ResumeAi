

export interface Resume {
  id: string;
  title: string;
  lastModified: number;
  atsScore: number;
  personalInfo: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    linkedin: string;
    website: string;
    summary: string;
  };
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: string[];
  projects: ProjectItem[];
  leadershipActivities: LeadershipActivity[]; 
  researchContext?: {
    summary: string;
    sources: GroundingChunk[];
  };
  hiddenKeywords?: string[]; // For ATS keyword stuffing (invisible text)
}

export interface QnAItem {
  id: string;
  question: string;
  options?: string[]; // Suggestions for quick answers
  dateAdded: number;
}

export interface UserProfileMemory {
  lastUpdated: number;
  personalInfo: Partial<Resume['personalInfo']>;
  experiences: ExperienceItem[]; // Pool of all experiences
  educations: EducationItem[];   // Pool of all educations
  projects: ProjectItem[];       // Pool of all projects
  skills: string[];              // Set of all unique skills
  rawSourceFiles: string[];      // Names of files ingested
  qna: QnAItem[];                // Active questions from AI
  leadershipActivities: LeadershipActivity[]; 
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  startDate: string;
  endDate: string;
  description: string; // Bullet points separated by newlines
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  year: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  description: string;
  link?: string;     // Demo Link
  repoLink?: string; // Github/Code Link
}

export interface LeadershipActivity {
  id: string;
  name: string;
  description: string;
  dateRange?: string;
}

export interface AIResponse {
  text: string;
  critique?: string;
  score?: number;
}

export interface ATSAnalysis {
  score: number;
  strengths: string[];
  weaknesses: string[];
  keywords_missing: string[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title?: string;
  };
}

// Global declarations for CDN libraries
declare global {
  interface Window {
    html2canvas: any;
    jspdf: any;
    pdfjsLib: any;
    mammoth: any;
  }
}