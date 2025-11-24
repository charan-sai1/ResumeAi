
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

export interface UserSettings {
  geminiApiKey?: string;
  themePref?: 'dark' | 'light';
  githubAccessToken?: string; // GitHub personal access token or OAuth token
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
  githubProjects: AnalyzedProject[]; // Analyzed GitHub projects
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

export interface GitHubRepo {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description: string | null;
  fork: boolean;
  url: string;
  forks_url: string;
  keys_url: string;
  collaborators_url: string;
  teams_url: string;
  hooks_url: string;
  issue_events_url: string;
  events_url: string;
  assignees_url: string;
  branches_url: string;
  tags_url: string;
  blobs_url: string;
  git_tags_url: string;
  git_refs_url: string;
  trees_url: string;
  statuses_url: string;
  languages_url: string;
  stargazers_url: string;
  contributors_url: string;
  subscribers_url: string;
  subscription_url: string;
  commits_url: string;
  git_commits_url: string;
  comments_url: string;
  issue_comment_url: string;
  contents_url: string;
  compare_url: string;
  merges_url: string;
  archive_url: string;
  downloads_url: string;
  issues_url: string;
  pulls_url: string;
  milestones_url: string;
  notifications_url: string;
  labels_url: string;
  releases_url: string;
  deployments_url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  git_url: string;
  ssh_url: string;
  clone_url: string;
  svn_url: string;
  homepage: string | null;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language: string | null;
  has_issues: boolean;
  has_projects: boolean;
  has_downloads: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_discussions: boolean;
  forks_count: number;
  mirror_url: string | null;
  archived: boolean;
  disabled: boolean;
  open_issues_count: number;
  license: {
    key: string;
    name: string;
    spdx_id: string;
    url: string;
    node_id: string;
  } | null;
  allow_forking: boolean;
  is_template: boolean;
  web_commit_signoff_required: boolean;
  topics: string[];
  visibility: string;
  forks: number;
  open_issues: number;
  watchers: number;
  default_branch: string;
  permissions?: {
    admin: boolean;
    maintain: boolean;
    push: boolean;
    triage: boolean;
    pull: boolean;
  };
}

export interface AnalyzedProject {
  id: string; // Using GitHubRepo.full_name as id for uniqueness
  repoName: string;
  description: string;
  htmlUrl: string;
  language: string | null;
  lastActivity: string; // ISO date string or similar
  completenessScore: number; // 0-100
  workingStatus: 'unknown' | 'working' | 'not working';
  advancedTechUsed: string[];
  activityLevel: 'low' | 'medium' | 'high';
  majorProject: boolean;
  domainSpecific: string[]; // e.g., ['web development', 'machine learning']
  aiSummary: string; // AI-generated summary of the project
  relevanceScore?: number; // AI-generated relevance for a resume
  suggestedBulletPoints?: string[]; // AI-generated bullet points for resume
}
