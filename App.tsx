import React, { useState, useEffect, useCallback } from 'react';
import { Resume, ATSAnalysis, UserProfileMemory, GroundingChunk, UserSettings, AnalyzedProject } from './types';
import { analyzeATS, tailorResumeToJob, mergeDataIntoMemory, generateResumeFromMemory, sanitizeResume, sanitizeMemory, rewriteResumeForATS, setUserApiKey, hasApiKey, validateApiKey, analyzeGitHubRepo, processAndMergeFilesIntoMemory, scoreMultipleProjectsRelevance } from './services/geminiService';
import { extractTextFromFile } from './services/fileService';
import { fetchUserRepos, fetchRepoContent } from './services/githubService';
import { signInWithGoogle, signInWithLinkedIn, signInWithGithub, signOut, subscribeToAuth, saveResumeToDB, fetchResumesFromDB, saveMemoryToDB, fetchMemoryFromDB, deleteResumeFromDB, isConfigured, linkProvider, unlinkProvider, fetchUserSettingsFromDB, saveUserSettingsToDB } from './services/firebase';
import ResumeEditor from './components/ResumeEditor';
import ResumePreview from './components/ResumePreview';
import Dashboard from './components/Dashboard';
import JobRoleSelector from './components/JobRoleSelector';
import ProjectSelector from './components/ProjectSelector';
import GitHubConnect from './components/GitHubConnect';
import { Button, Modal, TextArea, Toast, LoadingOverlay, DragOverlay, Card, Input } from './components/UIComponents';
import { Download, Wand2, ArrowLeft, Gauge, AlertCircle, LogOut, LogIn, AlertTriangle, HelpCircle, ExternalLink, UserCircle, Copy, Settings, Linkedin, Zap, Eye, Edit, Search, Sparkles, Github, Check, Link as LinkIcon, Unlink, Key, Save } from 'lucide-react';

// --- Mock Data Initial State ---
const initialResume: Resume = {
  id: '1',
  title: 'Software Engineer',
  lastModified: Date.now(),
  atsScore: 0,
  personalInfo: { fullName: '', email: '', phone: '', location: '', linkedin: '', website: '', summary: '' },
  experience: [], education: [], skills: [], projects: [], leadershipActivities: []
};

const initialMemory: UserProfileMemory = {
  lastUpdated: Date.now(), personalInfo: {}, experiences: [], educations: [], projects: [], skills: [], rawSourceFiles: [], qna: [], leadershipActivities: [], githubProjects: []
};

const App = () => {
  // --- Auth State ---
  const [user, setUser] = useState<any>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'editor'>('dashboard');
  const [currentDomain, setCurrentDomain] = useState<string>('');
  
  // --- Mobile Layout State ---
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  // --- Data State ---
  const [currentResume, setCurrentResume] = useState<Resume>(initialResume);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [userMemory, setUserMemory] = useState<UserProfileMemory>(initialMemory);
  const [isDataLoading, setIsDataLoading] = useState(false);

  // --- Settings State ---
  const [userSettings, setUserSettings] = useState<UserSettings>({});
  const [customApiKeyInput, setCustomApiKeyInput] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // --- Modals & Analysis State ---
   const [isTailorModalOpen, setTailorModalOpen] = useState(false);
   const [isMemoryModalOpen, setIsMemoryModalOpen] = useState(false);
   const [jobDescription, setJobDescription] = useState('');
   const [selectedJobRole, setSelectedJobRole] = useState<{id: string, title: string, category: string, description: string} | null>(null);
   const [isTailoring, setIsTailoring] = useState(false);
   const [isGeneratingFromMemory, setIsGeneratingFromMemory] = useState(false);
   const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
   const [isScoringProjects, setIsScoringProjects] = useState(false);
   const [scoredProjects, setScoredProjects] = useState<AnalyzedProject[]>([]);
  const [atsAnalysis, setAtsAnalysis] = useState<ATSAnalysis | null>(null);
  const [isAnalyzingATS, setIsAnalyzingATS] = useState(false);
  const [isFixingATS, setIsFixingATS] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false); // Account Settings
  
  // Global UI States
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, filename: '' });
  const [isDragging, setIsDragging] = useState(false);
  const [notification, setNotification] = useState<{type: 'success'|'error', message: string, tips?: React.ReactNode} | null>(null);

  // --- GitHub Integration State ---
  const [githubAccessToken, setGithubAccessToken] = useState<string | null>(null);
  const [isAnalyzingGitHubProjects, setIsAnalyzingGitHubProjects] = useState(false);
  const [githubAnalysisProgress, setGithubAnalysisProgress] = useState({ current: 0, total: 0, repoName: '' });

  // --- Domain Detection ---
  useEffect(() => {
    const hostname = window.location.hostname;
    const origin = window.location.origin;
    const detected = hostname || origin || "localhost";
    setCurrentDomain(detected);
  }, []);

  // --- Auth & Initial Load ---
  useEffect(() => {
    const unsubscribe = subscribeToAuth(async (currentUser) => {
      // If already in guest mode, don't overwrite with Firebase auth details unless signing in.
      if (user?.isGuest && !currentUser) return;

      setUser(currentUser);
      setIsAuthLoading(false);

      if (currentUser) {
        setIsDataLoading(true);
        try {
          const [fetchedResumes, fetchedMemory, fetchedSettings] = await Promise.all([
            fetchResumesFromDB(currentUser.uid),
            fetchMemoryFromDB(currentUser.uid),
            fetchUserSettingsFromDB(currentUser.uid)
          ]);
          // Sanitize loaded resumes to prevent crashes
          const sanitizedResumes = fetchedResumes.map(sanitizeResume);
          setResumes(sanitizedResumes);
          if (fetchedMemory) setUserMemory(sanitizeMemory(fetchedMemory));

          // Load Settings (API Key and GitHub Token)
          if (fetchedSettings) {
            setUserSettings(fetchedSettings);
            if (fetchedSettings.geminiApiKey) {
              setCustomApiKeyInput(fetchedSettings.geminiApiKey);
              setUserApiKey(fetchedSettings.geminiApiKey);
            }
            if (fetchedSettings.githubAccessToken) {
              setGithubAccessToken(fetchedSettings.githubAccessToken);
            }
          }

          // Check if GitHub provider and capture token on initial login
          const isGitHubProvider = currentUser.providerData?.some((p: any) => p.providerId === 'github.com');
          if (isGitHubProvider && !fetchedSettings?.githubAccessToken) {
            // Prompt for API key first if not set
            if (!fetchedSettings?.geminiApiKey) {
              setIsProfileModalOpen(true);
              setNotification({ type: 'success', message: 'Welcome! Please add your API key to continue.' });
            }
          } else if (!fetchedSettings?.geminiApiKey) {
            // Always prompt for API key if not set
            setIsProfileModalOpen(true);
            setNotification({ type: 'success', message: 'Welcome! Please add your API key to continue.' });
          }

          setView('dashboard');

        } catch (error) {
          console.error("Data Load Error", error);
          setNotification({ type: 'error', message: 'Failed to load data from cloud.' });
        } finally {
          setIsDataLoading(false);
        }
      } else {
        // Only clear data if not explicitly in guest mode
        if (!user?.isGuest) {
          setResumes([]);
          setUserMemory(initialMemory);
          setCurrentResume(initialResume); // Clear current resume on sign-out
          setUserSettings({});
          setCustomApiKeyInput('');
          setUserApiKey(null);
          setGithubAccessToken(null);
        }
      }
    });
    return () => unsubscribe();
  }, [user?.isGuest]); // Depend on user.isGuest to allow switching between guest/firebase

  // --- Guest Mode Persistence ---
  useEffect(() => {
    if (user?.isGuest) {
      localStorage.setItem('guest_resumes', JSON.stringify(resumes));
    }
  }, [resumes, user]);

  useEffect(() => {
    if (user?.isGuest) {
      localStorage.setItem('guest_memory', JSON.stringify(userMemory));
    }
  }, [userMemory, user]);

  // --- Handlers ---

  const handleLogin = async () => {
    setNotification(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      handleAuthError(e);
    }
  };

  const handleGitHubLogin = async () => {
    setNotification(null);
    try {
      const result = await signInWithGithub();

      // Save GitHub token if available
      if (result.accessToken && result.user) {
        const currentSettings = await fetchUserSettingsFromDB(result.user.uid);
        const newSettings = { ...currentSettings, githubAccessToken: result.accessToken };
        await saveUserSettingsToDB(result.user.uid, newSettings);
        setGithubAccessToken(result.accessToken);
        setUserSettings(newSettings);
      }
    } catch (e: any) {
      handleAuthError(e, 'GitHub');
    }
  };

  const handleLinkedInLogin = async () => {
    setNotification(null);
    try {
      const user = await signInWithLinkedIn();
      if (user && user.displayName) {
        setNotification({ type: 'success', message: `Welcome back, ${user.displayName}!` });
      }
    } catch (e: any) {
      handleAuthError(e, 'LinkedIn');
    }
  }

  const handleLinkAccount = async (provider: 'google' | 'github' | 'linkedin') => {
    if (!user) return;
    try {
      const result = await linkProvider(user, provider);
      if (provider === 'github' && result.accessToken) {
        setGithubAccessToken(result.accessToken);
        // Save the GitHub Access Token to user settings
        const newSettings = { ...userSettings, githubAccessToken: result.accessToken };
        await saveUserSettingsToDB(user.uid, newSettings);
        setUserSettings(newSettings); // Update local state
        setNotification({ type: 'success', message: `GitHub linked successfully! Access token saved.` });
      } else {
        setNotification({ type: 'success', message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} linked successfully!` });
      }
    } catch (e: any) {
      console.error('Link account error:', e);
      setNotification({ type: 'error', message: e.message || `Failed to link ${provider}.` });
    }
  };

  const handleUnlinkAccount = async (providerId: string) => {
    if (!user) return;
    // Prevent unlinking the last provider
    if (user.providerData.length <= 1) {
      setNotification({ type: 'error', message: 'You cannot unlink your only sign-in method.' });
      return;
    }
    try {
      await unlinkProvider(user, providerId);
      setNotification({ type: 'success', message: 'Account unlinked.' });
    } catch (e: any) {
      setNotification({ type: 'error', message: 'Failed to unlink account.' });
    }
  };

  const handleSaveSettings = async () => {
    if (!user) {
      setNotification({ type: 'error', message: 'You must be logged in to save settings.' });
      return;
    }
    setIsSavingSettings(true);
    try {
      const isValid = await validateApiKey(customApiKeyInput);
      if (!isValid) {
        setNotification({ type: 'error', message: 'Invalid API Key. Please check the key and try again.' });
        setIsSavingSettings(false);
        return;
      }

      const newSettings: UserSettings = { ...userSettings, geminiApiKey: customApiKeyInput };
      await saveUserSettingsToDB(user.uid, newSettings);
      setUserSettings(newSettings);
      setUserApiKey(customApiKeyInput || null);
      setNotification({ type: 'success', message: 'API Key saved and validated successfully!' });
    } catch (e) {
      console.error("Failed to save settings:", e);
      setNotification({ type: 'error', message: 'Failed to save API Key. Please try again.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleAuthError = (e: any, providerName: string = 'Google') => {
    console.error("Login Exception:", e);
    let message = e.message || "Unknown error";
    let tips: React.ReactNode = "";

    if (e.code === 'auth/operation-not-allowed' || e.code === 'auth/configuration-not-found') {
      message = `${providerName} Sign-in not enabled.`;
      tips = (
        <>
          Enable {providerName} provider in Firebase Console &gt; Authentication.
        </>
      );
    } else if (e.code === 'auth/unauthorized-domain') {
      message = `Domain not authorized.`;
      tips = (
        <div>
          Add the following domain to Firebase Console &gt; Authentication &gt; Settings &gt; Authorized Domains:
          <br />
          <code className="bg-slate-700 text-indigo-300 px-2 py-1 rounded text-sm select-all break-all">{currentDomain}</code>
        </div>
      );
    }

    setNotification({ type: 'error', message: message, tips: tips });
  };

  const handleGuestLogin = () => {
    const guestUser = { uid: 'guest', email: 'guest@demo.local', displayName: 'Guest User', isGuest: true };
    setUser(guestUser);
    setIsAuthLoading(false);
    
    try {
      const savedResumes = localStorage.getItem('guest_resumes');
      const savedMemory = localStorage.getItem('guest_memory');
      // Sanitize loaded data
      if (savedResumes) {
        const parsed = JSON.parse(savedResumes);
        if (Array.isArray(parsed)) setResumes(parsed.map(sanitizeResume));
      }
      if (savedMemory) setUserMemory(sanitizeMemory(JSON.parse(savedMemory)));
    } catch(e) {
      console.error("Local storage error", e);
    }
    
    // Prompt guest for key too if not present in memory/session
    if (!hasApiKey()) {
      setIsProfileModalOpen(true);
      setNotification({ type: 'error', message: "Guest Mode: Please provide an API Key in Settings to use AI features." });
    }
  };

  const handleSignOut = async () => {
    if (user?.isGuest) {
      setUser(null);
      setResumes([]);
      setUserMemory(initialMemory);
      setUserApiKey(null);
      setView('dashboard');
    } else {
      await signOut();
      setUserApiKey(null);
    }
  };
  
  const handleUpdateMemory = useCallback(async (newMemory: UserProfileMemory) => {
    const safeMemory = sanitizeMemory(newMemory);
    console.log('Updating memory with:', {
      experiences: safeMemory.experiences.length,
      educations: safeMemory.educations.length,
      projects: safeMemory.projects.length,
      githubProjects: safeMemory.githubProjects?.length || 0
    });
    setUserMemory(safeMemory);

    if (user && !user.isGuest) {
      await saveMemoryToDB(user.uid, safeMemory);
      console.log('Memory saved to Firebase');
    } else if (user?.isGuest) {
      localStorage.setItem('guest_memory', JSON.stringify(safeMemory));
      console.log('Memory saved to localStorage');
    }
  }, [user]); // Depend on user

  const handleFilesDropped = useCallback(async (files: File[]) => {
    if (!user) {
      setNotification({ type: 'error', message: 'Please sign in to process files.' });
      return;
    }
    if (!hasApiKey()) {
      setNotification({ type: 'error', message: 'API Key required. Check Settings.' });
      setIsProfileModalOpen(true);
      return;
    }
    
    setIsProcessingFiles(true);
    setUploadProgress({ current: 0, total: files.length, filename: '' });
    
    let allFileTexts: string[] = [];
    let processedFileNames: string[] = [];
    
    try {
      for (let i = 0; i < files.length; i++) {
         const file = files[i];
         setUploadProgress({ current: i + 1, total: files.length, filename: file.name });
         try {
           await new Promise(r => setTimeout(r, 300)); 
           const text = await extractTextFromFile(file);
           if (text) {
             allFileTexts.push(text);
             processedFileNames.push(file.name);
           }
         } catch (e) { console.error("File error", e); }
      }

      if (allFileTexts.length > 0) {
        const updatedMemory = await processAndMergeFilesIntoMemory(allFileTexts, userMemory);
        updatedMemory.rawSourceFiles = Array.from(new Set([...userMemory.rawSourceFiles, ...processedFileNames])); // Merge new file names
        await handleUpdateMemory(updatedMemory);
        setNotification({ type: 'success', message: `Processed ${allFileTexts.length} files and updated memory.` });
      } else {
        setNotification({ type: 'error', message: 'No processable content found in files.' });
      }
    } catch (error: any) { // Catch potential custom error from processAndMergeFilesIntoMemory
      setNotification({ type: 'error', message: error.message || 'Processing failed.' });
    } finally {
      setIsProcessingFiles(false);
      setUploadProgress({ current: 0, total: 0, filename: '' });
    }
  }, [user, userMemory, handleUpdateMemory]);

  // --- Global Drag & Drop ---
  const handleDragEnter = useCallback((e: React.DragEvent | DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer?.types.some(t => t === 'Files')) setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent | DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.target === document.body) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent | DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent | DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const dataTransfer = e.dataTransfer;
    const files: File[] = dataTransfer?.files ? Array.from(dataTransfer.files) : [];
    
    if (files.length > 0) handleFilesDropped(files);
  }, [handleFilesDropped]);

  useEffect(() => {
    window.addEventListener('dragenter', handleDragEnter);
    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('dragleave', handleDragLeave);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('dragleave', handleDragLeave);
      window.removeEventListener('drop', handleDrop);
    };
  }, [handleDragEnter, handleDragLeave, handleDragOver, handleDrop]);


  // --- GitHub Integration Handlers ---
  const handleConnectGitHub = useCallback(async () => {
    if (!user) {
      setNotification({ type: 'error', message: 'Please sign in first.' });
      return;
    }

    // Check if already linked
    const isGitHubLinked = user.providerData?.some((p: any) => p.providerId === 'github.com');

    if (isGitHubLinked) {
      // Already linked, just check if we have the token
      if (githubAccessToken) {
        setNotification({ type: 'success', message: 'GitHub already connected! You can analyze your profile now.' });
      } else {
        setNotification({ type: 'error', message: 'GitHub linked but token missing. Please re-link in Profile Settings.' });
      }
      return;
    }

    // Not linked, trigger linking
    try {
      const result = await linkProvider(user, 'github');
      if (result.accessToken) {
        setGithubAccessToken(result.accessToken);
        // Save the GitHub Access Token to user settings
        const newSettings = { ...userSettings, githubAccessToken: result.accessToken };
        await saveUserSettingsToDB(user.uid, newSettings);
        setUserSettings(newSettings);
        setNotification({ type: 'success', message: 'GitHub connected successfully! Now click "Analyze GitHub Profile" to scan your repositories.' });
      } else {
        setNotification({ type: 'error', message: 'GitHub connected but access token not received. Please try again.' });
      }
    } catch (e: any) {
      console.error('Connect GitHub error:', e);
      setNotification({ type: 'error', message: e.message || 'Failed to connect GitHub.' });
    }
  }, [user, githubAccessToken, userSettings]);

  const handleFetchAndAnalyzeGitHubProjects = useCallback(async () => {
    if (!user) {
      setNotification({ type: 'error', message: 'You must be logged in to fetch GitHub projects.' });
      return;
    }
    if (!githubAccessToken) {
      setNotification({ type: 'error', message: 'GitHub account not linked or access token missing.' });
      return;
    }
    if (!hasApiKey()) {
      setNotification({ type: 'error', message: 'Gemini API Key required for AI analysis. Check Settings.' });
      setIsProfileModalOpen(true);
      return;
    }

    setIsAnalyzingGitHubProjects(true);
    setNotification(null);

    try {
      setNotification({ type: 'success', message: 'Fetching GitHub repositories...' });
      const repos = await fetchUserRepos(githubAccessToken);
      const publicRepos = repos.filter(repo => !repo.fork && !repo.private);

      setGithubAnalysisProgress({ current: 0, total: publicRepos.length, repoName: '' });
      const analyzedProjects: AnalyzedProject[] = [];

      for (let i = 0; i < publicRepos.length; i++) {
        const repo = publicRepos[i];
        setGithubAnalysisProgress({ current: i + 1, total: publicRepos.length, repoName: repo.name });

        let readmeContent: string | null = null;
        try {
          const owner = repo.full_name.split('/')[0];
          readmeContent = await fetchRepoContent(owner, repo.name, 'README.md', githubAccessToken);
        } catch (readMeError) {
          console.warn(`Could not fetch README for ${repo.full_name}:`, readMeError);
        }

        try {
          const analyzed = await analyzeGitHubRepo(repo, readmeContent);
          analyzedProjects.push(analyzed);
        } catch (analyzeError) {
          console.error(`Error analyzing ${repo.full_name}:`, analyzeError);
          analyzedProjects.push({
            id: repo.full_name,
            repoName: repo.full_name,
            description: repo.description || 'No description provided.',
            htmlUrl: repo.html_url,
            language: repo.language,
            lastActivity: repo.pushed_at,
            completenessScore: 0, workingStatus: 'unknown', advancedTechUsed: [],
            activityLevel: 'low', majorProject: false, domainSpecific: [],
            aiSummary: 'AI analysis failed for this project.',
            suggestedBulletPoints: [],
          });
        }
      }

      // Update user memory
      const newMemory = { ...userMemory, githubProjects: analyzedProjects, lastUpdated: Date.now() };
      console.log('Saving GitHub projects to memory:', analyzedProjects.length, 'projects');
      await handleUpdateMemory(newMemory);
      console.log('Memory updated successfully');
      setNotification({ type: 'success', message: `Successfully fetched and analyzed ${analyzedProjects.length} GitHub projects! Check "View Memory Details" to see them.` });

    } catch (error: any) {
      console.error("Error fetching/analyzing GitHub projects:", error);
      setNotification({ type: 'error', message: `Failed to process GitHub projects: ${error.message}` });
    } finally {
      setIsAnalyzingGitHubProjects(false);
      setGithubAnalysisProgress({ current: 0, total: 0, repoName: '' });
    }
  }, [user, githubAccessToken, userMemory, handleUpdateMemory]);

  // --- Handlers (continued) ---

  const handleCreateNew = () => {
    const newResume = { 
      ...initialResume, 
      id: Date.now().toString(), 
      lastModified: Date.now(),
      personalInfo: { ...initialResume.personalInfo, fullName: user?.displayName || '' } // Use user's display name
    };
    setCurrentResume(newResume);
    setView('editor');
    setMobileTab('editor');
  };

  const handleJobRoleSelect = async (role: {id: string, title: string, category: string, description: string} | null) => {
    setSelectedJobRole(role);

    // Score projects when role is selected
    if (role && userMemory.githubProjects && userMemory.githubProjects.length > 0) {
      setIsScoringProjects(true);
      try {
        const scored = await scoreMultipleProjectsRelevance(userMemory.githubProjects, role.title);
        setScoredProjects(scored);
        // Auto-select top 3 most relevant projects
        const topProjects = scored.slice(0, 3).map(p => p.id);
        setSelectedProjectIds(topProjects);
      } catch (error) {
        console.error('Error scoring projects:', error);
        setScoredProjects(userMemory.githubProjects);
      } finally {
        setIsScoringProjects(false);
      }
    } else {
      setScoredProjects(userMemory.githubProjects || []);
      setSelectedProjectIds([]);
    }
  };

  const handleToggleProject = (projectId: string) => {
    setSelectedProjectIds(prev =>
      prev.includes(projectId)
        ? prev.filter(id => id !== projectId)
        : [...prev, projectId]
    );
  };

  const handleCreateFromMemory = async () => {
    if (!hasApiKey()) {
       setNotification({ type: 'error', message: 'API Key required for AI generation.' });
       setIsProfileModalOpen(true);
       return;
    }
    if (!selectedJobRole) {
       setNotification({ type: 'error', message: 'Please select a job role first.' });
       return;
    }
    if (isGeneratingFromMemory) return;
    setIsGeneratingFromMemory(true);
    try {
      // Filter memory to include only selected projects
      const selectedProjects = userMemory.githubProjects
        ?.filter(p => selectedProjectIds.includes(p.id)) || [];

      const filteredMemory: UserProfileMemory = {
        ...userMemory,
        projects: [
          ...userMemory.projects,
          ...selectedProjects.map(p => ({
            id: p.id,
            name: p.repoName,
            description: p.aiSummary,
            link: p.htmlUrl,
            repoLink: p.htmlUrl
          }))
        ]
      };

      const combinedJobDescription = selectedJobRole ? `${selectedJobRole.title}: ${selectedJobRole.description}\n\n${jobDescription}`.trim() : jobDescription;
      const newResume = await generateResumeFromMemory(filteredMemory, combinedJobDescription);

      let title = selectedJobRole ? `${selectedJobRole.title} Resume` : "Professional Resume";
      if (newResume.title && !['Untitled Resume', 'Tailored Resume', 'Professional Resume'].includes(newResume.title)) {
        title = newResume.title;
      }
      else if (newResume.experience.length > 0) {
        title = newResume.experience[0].role;
      }

      newResume.title = title;

      if (!newResume.personalInfo.fullName && user?.displayName) {
        newResume.personalInfo.fullName = user.displayName;
      }

      setCurrentResume(newResume);
      if (user && !user.isGuest) await saveResumeToDB(user.uid, newResume);
      setResumes(prev => [newResume, ...prev]);

      setView('editor');
      setMobileTab('editor');
      setIsMemoryModalOpen(false);
      setSelectedJobRole(null);
      setJobDescription('');
      setSelectedProjectIds([]);
      setScoredProjects([]);
      setNotification({ type: 'success', message: `Resume generated for ${selectedJobRole.title} role with ${selectedProjectIds.length} projects!` });
    } catch (error) {
      setNotification({ type: 'error', message: 'Failed to generate resume. Please try again.' });
    } finally {
      setIsGeneratingFromMemory(false);
    }
  };

  const handleEdit = (resume: Resume) => {
    const safe = sanitizeResume(resume);
    if (user?.displayName && (!safe.personalInfo.fullName || safe.personalInfo.fullName === 'Guest User')) {
      safe.personalInfo.fullName = user.displayName;
    }
    setCurrentResume(safe);
    setView('editor');
    setMobileTab('editor');
  };

  const handleSave = useCallback(async () => {
    const updatedResume = { ...currentResume, lastModified: Date.now() };
    setResumes(prev => {
      const existingIndex = prev.findIndex(r => r.id === currentResume.id);
      if (existingIndex > -1) {
        return prev.map((r, i) => i === existingIndex ? updatedResume : r);
      } else {
        return [updatedResume, ...prev];
      }
    });
    if (user && !user.isGuest) {
      await saveResumeToDB(user.uid, updatedResume);
    }
  }, [currentResume, user]);

  useEffect(() => {
    if (view === 'editor') {
      const timer = setTimeout(handleSave, 2000);
      return () => clearTimeout(timer);
    }
  }, [currentResume, view, handleSave]);

  const handleDeleteResume = async (id: string) => {
    setResumes(prev => prev.filter(r => r.id !== id));
    if (user && !user.isGuest) await deleteResumeFromDB(user.uid, id);
    setNotification({ type: 'success', message: 'Resume deleted.' });
  };

  const handleUseProjectInResume = useCallback((project: AnalyzedProject) => {
    const newResume = {
      ...initialResume,
      id: Date.now().toString(),
      title: project.repoName,
      lastModified: Date.now(),
      personalInfo: { ...initialResume.personalInfo, fullName: user?.displayName || '' },
      projects: [{
        id: project.id,
        name: project.repoName,
        description: project.aiSummary, // Use AI summary as description
        link: project.htmlUrl, // Link to the GitHub repo
        repoLink: project.htmlUrl, // Assuming repoLink is also htmlUrl
      }],
      // Optionally add advancedTechUsed as skills
      skills: [...initialResume.skills, ...project.advancedTechUsed],
      // If you want to populate suggested bullet points directly
      // experience: [{ id: 'proj-bullets', role: project.repoName, company: 'Personal Projects', startDate: '', endDate: '', description: project.suggestedBulletPoints?.join('\n') || '' }]
    };
    setCurrentResume(newResume);
    setView('editor');
    setMobileTab('editor');
    setNotification({ type: 'success', message: `Created new resume with project: ${project.repoName}` });
  }, [user?.displayName, initialResume, setNotification]);

  const runATSAnalysis = async () => {
    if (!hasApiKey()) {
      setNotification({ type: 'error', message: 'API Key required for analysis.' });
      setIsProfileModalOpen(true);
      return;
    }
    setIsAnalyzingATS(true);
    const result = await analyzeATS(currentResume);
    setAtsAnalysis(result);
    const updated = { ...currentResume, atsScore: result.score };
    setCurrentResume(updated);
    setResumes(prev => prev.map(r => r.id === updated.id ? updated : r));
    if (user && !user.isGuest) saveResumeToDB(user.uid, updated);
    setIsAnalyzingATS(false);
  };

  const handleATSFix = async () => {
    if (!atsAnalysis || !hasApiKey()) return;
    setIsFixingATS(true);
    try {
      const fixedResume = await rewriteResumeForATS(currentResume, atsAnalysis);
      const updated = { ...fixedResume, atsScore: Math.min(atsAnalysis.score + 15, 95) };
      setCurrentResume(updated);
      setResumes(prev => prev.map(r => r.id === updated.id ? updated : r));
      if (user && !user.isGuest) saveResumeToDB(user.uid, updated);
      
      setAtsAnalysis(null);
      setNotification({ type: 'success', message: 'Resume optimized for ATS!' });
    } catch (e) {
      setNotification({ type: 'error', message: 'Failed to fix resume.' });
    } finally {
      setIsFixingATS(false);
    }
  };

  const handleTailor = async () => {
    if (!jobDescription) return;
    if (!hasApiKey()) {
       setNotification({ type: 'error', message: 'API Key required for tailoring.' });
       setIsProfileModalOpen(true);
       return;
    }
    setIsTailoring(true);
    
    // tailorResumeToJob now includes built-in AI research
    const newResume = await tailorResumeToJob(currentResume, jobDescription);
    
    const tailored = { ...newResume, title: newResume.title, id: Date.now().toString() };
    if (!tailored.personalInfo.fullName && user?.displayName) tailored.personalInfo.fullName = user.displayName;
    
    setCurrentResume(tailored);
    setResumes(prev => [tailored, ...prev]);
    if (user && !user.isGuest) saveResumeToDB(user.uid, tailored);
    
    setIsTailoring(false);
    setTailorModalOpen(false);
    setNotification({ type: 'success', message: 'Resume tailored with AI research insights!' });
  };

  const downloadPDF = async () => {
    const element = document.getElementById('resume-preview-container');
    if (!element || !window.html2canvas || !window.jspdf) return;
    try {
      const canvas = await window.html2canvas(element, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`${currentResume.personalInfo.fullName.replace(/\s+/g, '_') || 'Resume'}.pdf`);
      setNotification({ type: 'success', message: 'PDF Downloaded.' });
    } catch (err) { setNotification({ type: 'error', message: 'PDF Generation failed.' }); }
  };

  // Helper to check if a provider is already linked
  const isProviderLinked = (providerId: string) => {
    if (!user || !user.providerData) return false;
    return user.providerData.some((p: any) => p.providerId === providerId);
  };

  // Define common Header for Dashboard and Editor to include Profile button
  const TopBar = () => (
     <div className="flex items-center gap-4">
      {user?.isGuest && (
        <div className="hidden sm:flex px-3 py-1 bg-yellow-900/30 border border-yellow-900/50 rounded-full text-yellow-500 text-xs font-medium items-center gap-2">
          <AlertTriangle className="w-3 h-3" /> Guest
        </div>
      )}
      {!user?.isGuest && (
        <Button variant="ghost" onClick={() => setIsProfileModalOpen(true)} className="text-slate-400 hover:text-white text-sm h-8 px-2 flex items-center">
          <UserCircle className="w-5 h-5 sm:mr-2" /> <span className="hidden sm:inline">Profile</span>
        </Button>
      )}
      <Button variant="ghost" onClick={handleSignOut} className="text-slate-500 hover:text-red-400 text-sm h-8 px-2">
        <LogOut className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">{user?.isGuest ? 'Exit' : 'Sign Out'}</span>
      </Button>
    </div>
  );

  if (!user && !isAuthLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center p-8 border-indigo-500/30 shadow-2xl shadow-indigo-900/20 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500"></div>
          <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-1 ring-slate-800">
            <Wand2 className="w-10 h-10 text-indigo-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">AI Resume Architect</h1>
          <p className="text-slate-400 mb-8">Build your career memory, tailor resumes instantly, and outsmart ATS algorithms with AI.</p>
          {!isConfigured ? (
              <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 mb-6 text-left animate-pulse">
                <div className="flex items-center gap-2 text-red-400 font-bold mb-1"><AlertTriangle className="w-5 h-5" /> Config Missing</div>
                <p className="text-sm text-red-300">Update <code>services/firebase.ts</code> with your project keys.</p>
              </div>
           ) : (
            <div className="space-y-4">
              <div className="text-left mb-6">
                <h3 className="text-lg font-semibold text-white mb-2">Step 1: Choose Authentication</h3>
                <p className="text-sm text-slate-400">Select how you'd like to access your account</p>
              </div>

              <Button variant="primary" onClick={handleLogin} className="w-full py-3 text-base bg-white hover:bg-gray-100 text-slate-900 font-medium">
                  Sign In with Google
              </Button>
              <Button variant="primary" onClick={handleGitHubLogin} className="w-full py-3 text-base bg-[#333] hover:bg-[#222] text-white font-medium">
                  <Github className="w-5 h-5 mr-2" fill="currentColor" />
                  Sign In with GitHub
              </Button>
              <div className="relative flex py-2 items-center my-2">
                <div className="flex-grow border-t border-slate-800"></div>
                <span className="flex-shrink-0 mx-4 text-slate-600 text-xs uppercase">Or</span>
                <div className="flex-grow border-t border-slate-800"></div>
              </div>
              <Button variant="secondary" onClick={handleGuestLogin} className="w-full py-2 text-sm text-slate-400 hover:text-white">Continue as Guest (Local)</Button>

              <div className="mt-6 p-4 bg-indigo-900/10 border border-indigo-500/20 rounded-lg text-left">
                <div className="flex items-center gap-2 text-indigo-400 font-bold mb-2">
                  <Key className="w-4 h-4" />
                  Next Steps
                </div>
                <p className="text-sm text-indigo-300 leading-relaxed">
                  After signing in, you'll need to add your Gemini API key and optionally connect GitHub to analyze your projects.
                </p>
              </div>
            </div>
          )}
          {notification && (
            <div className="mt-6 p-4 bg-red-900/10 border border-red-900/30 rounded-lg text-left animate-in slide-in-from-bottom-2">
              <div className="flex gap-2 text-red-400 font-bold text-sm mb-1"><AlertCircle className="w-4 h-4" /> Login Failed</div>
              <p className="text-sm text-red-300 leading-relaxed">{notification.message}</p>
              {notification.tips && <div className="mt-2 pt-2 border-t border-red-900/30 text-xs text-red-300"><strong>Fix:</strong> {notification.tips}</div>}
            </div>
          )}
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] bg-slate-950 text-slate-200 overflow-hidden">
      {isProcessingFiles && <LoadingOverlay message={`Analyzing ${uploadProgress.filename}...`} progress={uploadProgress.total > 0 ? uploadProgress : undefined} />}
      {isFixingATS && <LoadingOverlay message="Auto-Optimizing for ATS..." />}
      
      <DragOverlay isDragging={isDragging} />
      {notification && <Toast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      
      {/* Fixed Top Header */}
       <div className="h-14 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-4 flex-shrink-0 z-30">
          <div className="flex items-center gap-3">
            {view === 'editor' && (
              <button onClick={() => setView('dashboard')} className="text-slate-400 hover:text-white flex items-center gap-2 text-sm font-medium">
                <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Dashboard</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
             {/* Mobile Preview Action: Download */}
             {view === 'editor' && mobileTab === 'preview' && (
                <Button variant="primary" onClick={downloadPDF} className="lg:hidden h-8 text-xs px-3 bg-indigo-600 hover:bg-indigo-500">
                  <Download className="w-3 h-3 mr-1" /> PDF
                </Button>
             )}
             
             {/* Desktop Download - Hidden on Mobile */}
             {view === 'editor' && (
               <Button variant="primary" onClick={downloadPDF} className="hidden lg:flex h-9 text-sm">
                   <Download className="w-4 h-4 mr-2" /> Download PDF
               </Button>
             )}

             {/* Desktop Profile/SignOut */}
             <div className="hidden lg:flex">
               <TopBar />
             </div>
             {/* Mobile Menu/Profile Trigger */}
             <div className="lg:hidden">
                <TopBar /> 
             </div>
          </div>
       </div>
      
      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {view === 'dashboard' ? (
          <div className="w-full overflow-y-auto">
            <Dashboard
              resumes={resumes}
              memory={userMemory}
              onEdit={handleEdit}
              onNew={handleCreateNew}
              onNewFromMemory={() => setIsMemoryModalOpen(true)}
              onDelete={handleDeleteResume}
              onFilesDropped={handleFilesDropped}
              isProcessingFiles={isProcessingFiles}
              user={user}
              onSignOut={handleSignOut}
              onUpdateMemory={handleUpdateMemory}
              onUseProject={handleUseProjectInResume}
              onConnectGitHub={handleConnectGitHub}
              onAnalyzeGitHub={handleFetchAndAnalyzeGitHubProjects}
              isAnalyzingGitHub={isAnalyzingGitHubProjects}
              githubAnalysisProgress={githubAnalysisProgress}
            />
          </div>
        ) : (
          <>
            {/* Editor Panel (Responsive) */}
            <div className={`flex-1 lg:flex-none lg:w-[480px] flex-shrink-0 flex flex-col border-r border-slate-800 bg-slate-950 transition-all ${mobileTab === 'editor' ? 'flex' : 'hidden lg:flex'}`}>
               {/* Desktop Toolbar (Hidden on Mobile, actions moved to bottom bar) */}
               <div className="hidden lg:flex p-3 border-b border-slate-800 bg-slate-900/50 gap-2 flex-shrink-0">
                   <Button variant="secondary" onClick={runATSAnalysis} loading={isAnalyzingATS} className="flex-1 text-xs h-9">
                     <Gauge className="w-4 h-4 mr-2" /> ATS Check
                   </Button>
                   <Button variant="ai" onClick={() => setTailorModalOpen(true)} className="flex-1 text-xs h-9">
                     <Wand2 className="w-4 h-4 mr-2" /> Tailor
                   </Button>
               </div>
               
               {/* Editor Content (Scrollable) */}
               <div className="flex-1 relative overflow-hidden flex flex-col">
                  <ResumeEditor resume={currentResume} setResume={setCurrentResume} memory={userMemory} />
                  
                  {/* ATS Overlay */}
                  {atsAnalysis && (
                    <div className="absolute bottom-4 left-4 right-4 bg-slate-900/95 backdrop-blur p-5 rounded-xl border border-slate-700 shadow-2xl animate-in slide-in-from-bottom-4 z-50">
                      <div className="flex justify-between items-center mb-3">
                         <h4 className="font-bold text-white flex items-center gap-2"><Gauge className="w-4 h-4" /> ATS Score</h4>
                         <span className={`text-xl font-black ${atsAnalysis.score >= 80 ? 'text-green-400' : atsAnalysis.score >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{atsAnalysis.score}/100</span>
                      </div>
                      <div className="text-xs text-slate-300 space-y-2 mb-4">
                        {atsAnalysis.weaknesses.length > 0 && (
                          <div className="space-y-1">
                             <strong className="text-red-300 block mb-1">Issues Detected:</strong>
                             {atsAnalysis.weaknesses.slice(0, 2).map((w, i) => (
                               <div key={i} className="flex items-start gap-1.5 text-slate-400"><AlertCircle className="w-3 h-3 mt-0.5 text-red-400 flex-shrink-0" /> {w}</div>
                             ))}
                          </div>
                        )}
                      </div>
                      
                      {atsAnalysis.score < 80 && (
                        <Button variant="ai" onClick={handleATSFix} className="w-full text-xs mb-2">
                           <Zap className="w-3 h-3 mr-2" fill="currentColor" /> Auto-Fix with AI
                        </Button>
                      )}
                      
                      <button onClick={() => setAtsAnalysis(null)} className="absolute top-2 right-2 text-slate-500 hover:text-white p-1 rounded-full hover:bg-slate-800 transition-colors">&times;</button>
                    </div>
                  )}
               </div>
            </div>
            
            {/* Preview Panel (Responsive) */}
            <div className={`flex-1 bg-slate-900 flex flex-col transition-all relative ${mobileTab === 'preview' ? 'flex' : 'hidden lg:flex'}`}>
              {/* Preview Canvas Container */}
              <div className="flex-1 overflow-auto p-4 flex justify-center items-start bg-slate-900/50">
                 <ResumePreview resume={currentResume} id="resume-preview-container" />
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Mobile Bottom Navigation Bar */}
       {view === 'editor' && (
         <div className="lg:hidden h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-between px-6 flex-shrink-0 pb-safe z-40">
            {/* Editor Tab */}
            <button 
              onClick={() => setMobileTab('editor')}
              className={`flex flex-col items-center gap-1 transition-colors ${mobileTab === 'editor' ? 'text-indigo-400' : 'text-slate-500'}`}
            >
               <Edit className="w-5 h-5" />
               <span className="text-[10px] font-medium">Editor</span>
            </button>

            {/* Actions Group */}
            <button 
              onClick={() => setTailorModalOpen(true)}
              className="flex flex-col items-center gap-1 text-slate-500 hover:text-indigo-300 active:scale-95 transition-transform"
            >
               <Wand2 className="w-5 h-5" />
               <span className="text-[10px] font-medium">Tailor</span>
            </button>

             <button 
               onClick={runATSAnalysis}
               className={`flex flex-col items-center gap-1 active:scale-95 transition-transform ${isAnalyzingATS ? 'text-indigo-400 animate-pulse' : 'text-slate-500 hover:text-indigo-300'}`}
             >
               <Gauge className="w-5 h-5" />
               <span className="text-[10px] font-medium">ATS</span>
            </button>

            {/* Preview Tab */}
            <button 
              onClick={() => setMobileTab('preview')}
              className={`flex flex-col items-center gap-1 transition-colors ${mobileTab === 'preview' ? 'text-indigo-400' : 'text-slate-500'}`}
            >
               <Eye className="w-5 h-5" />
               <span className="text-[10px] font-medium">Preview</span>
            </button>
         </div>
       )}
      
      {/* All Modals */}
      <Modal isOpen={isTailorModalOpen} onClose={() => setTailorModalOpen(false)} title="Tailor Resume to Job">
        <div className="space-y-4">
          <p className="text-slate-400 text-sm">Paste the job description below.</p>
          <div className="bg-indigo-900/20 p-3 rounded border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
               <Sparkles className="w-3 h-3" />
               AI Research enabled: We'll analyze this JD and search for company culture & values.
             </div>
          <TextArea label="Job Description" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="h-48" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setTailorModalOpen(false)}>Cancel</Button>
            <Button variant="ai" onClick={handleTailor} loading={isTailoring}>Tailor Resume</Button>
          </div>
        </div>
      </Modal>

         <Modal isOpen={isMemoryModalOpen} onClose={() => {
           setIsMemoryModalOpen(false);
           setSelectedJobRole(null);
           setJobDescription('');
           setSelectedProjectIds([]);
           setScoredProjects([]);
         }} title="Generate Resume from Memory">
           <div className="space-y-6">
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 text-sm text-slate-300 flex gap-3">
                <HelpCircle className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                <p>AI will build a new resume using <strong className="text-white">{userMemory.experiences.length} experiences</strong>, <strong className="text-white">{userMemory.educations.length} education</strong>, <strong className="text-white">{userMemory.projects.length} projects</strong>, and <strong className="text-white">{userMemory.leadershipActivities.length} activities</strong>.</p>
              </div>

              <JobRoleSelector
                selectedRole={selectedJobRole}
                onRoleSelect={handleJobRoleSelect}
                onCustomRole={(title) => handleJobRoleSelect({ id: 'custom', title, category: 'Custom', description: 'Custom job role' })}
              />

              {selectedJobRole && (scoredProjects.length > 0 || userMemory.githubProjects?.length > 0) && (
                <div className="border-t border-slate-800 pt-6">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <Github className="w-5 h-5 text-indigo-400" />
                    Select Relevant Projects
                  </h4>
                  <ProjectSelector
                    projects={scoredProjects.length > 0 ? scoredProjects : userMemory.githubProjects || []}
                    selectedProjects={selectedProjectIds}
                    onToggleProject={handleToggleProject}
                    jobRole={selectedJobRole?.title}
                    loading={isScoringProjects}
                  />
                </div>
              )}

              <div className="bg-indigo-900/20 p-3 rounded border border-indigo-500/20 text-xs text-indigo-300 flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                AI Research enabled: We'll scan for 2025 industry trends relevant to your role.
              </div>

              <TextArea label="Target Job Description (Optional)" value={jobDescription} onChange={(e) => setJobDescription(e.target.value)} className="h-32" placeholder="Paste job details..." />

               <div className="flex justify-end gap-2">
                 <Button variant="secondary" onClick={() => {
                   setIsMemoryModalOpen(false);
                   setSelectedJobRole(null);
                   setJobDescription('');
                   setSelectedProjectIds([]);
                   setScoredProjects([]);
                 }}>Cancel</Button>
                 <Button variant="ai" onClick={handleCreateFromMemory} loading={isGeneratingFromMemory} disabled={!selectedJobRole}><Wand2 className="w-4 h-4 mr-2" /> Generate Resume</Button>
               </div>
           </div>
         </Modal>

        {/* Profile Settings Modal */}
        <Modal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} title="Account Settings">
          <div className="space-y-6">
            <div className="flex items-center gap-4 mb-6">
               <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-xl">
                 {user?.displayName?.charAt(0) || 'U'}
               </div>
               <div>
                 <h3 className="font-bold text-white">{user?.displayName || 'Guest'}</h3>
                 <p className="text-sm text-slate-500">{user?.email}</p>
               </div>
            </div>
            
            {/* API Configuration Section */}
            <div className="p-4 bg-slate-800 rounded-xl border border-indigo-500/20 mb-6">
               <div className="flex items-center gap-2 mb-3">
                 <Key className="w-4 h-4 text-indigo-400" />
                 <h4 className="text-sm font-bold text-white uppercase tracking-wide">Bring Your Own Key (Required)</h4>
               </div>
               <p className="text-xs text-slate-400 mb-4 leading-relaxed">
                 Enter your own Google Gemini API Key. Required for AI features.
               </p>
               <div className="flex gap-2">
                 <input 
                   type="password" 
                   value={customApiKeyInput}
                   onChange={(e) => setCustomApiKeyInput(e.target.value)}
                   placeholder="AIzaSy..."
                   className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                 />
                 <Button onClick={handleSaveSettings} loading={isSavingSettings} className="h-full py-2 px-4 text-xs">
                   <Save className="w-4 h-4 mr-1" /> Save
                 </Button>
               </div>
            </div>

            {!user?.isGuest && (
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-2">Linked Accounts</h4>
              
              {/* Google */}
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                   <span className="text-slate-200 font-medium">Google</span>
                </div>
                {isProviderLinked('google.com') ? (
                   <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-900/20 text-green-400 text-xs font-medium border border-green-900/30">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                      <button onClick={() => handleUnlinkAccount('google.com')} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-900/10 rounded transition-colors" title="Disconnect">
                        <Unlink className="w-3 h-3" /> Unlink
                      </button>
                   </div>
                ) : (
                   <Button variant="secondary" onClick={() => handleLinkAccount('google')} className="h-8 text-xs px-3"><LinkIcon className="w-3 h-3 mr-1" /> Connect</Button>
                )}
              </div>

              {/* GitHub */}
              <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg border border-slate-700">
                <div className="flex items-center gap-3">
                   <span className="text-slate-200 font-medium">GitHub</span>
                </div>
                {isProviderLinked('github.com') ? (
                   <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-green-900/20 text-green-400 text-xs font-medium border border-green-900/30">
                        <Check className="w-3 h-3" /> Connected
                      </span>
                      <button onClick={() => handleUnlinkAccount('github.com')} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-900/10 rounded transition-colors" title="Disconnect">
                        <Unlink className="w-3 h-3" /> Unlink
                      </button>
                   </div>
                ) : (
                   <Button variant="secondary" onClick={() => handleLinkAccount('github')} className="h-8 text-xs px-3"><LinkIcon className="w-3 h-3 mr-1" /> Connect</Button>
                )}
              </div>

              {isProviderLinked('github.com') && githubAccessToken && (
                <div className="pt-4 border-t border-slate-800 mt-4">
                  <Button 
                    variant="ai" 
                    onClick={handleFetchAndAnalyzeGitHubProjects} 
                    loading={isAnalyzingGitHubProjects}
                    className="w-full text-sm"
                  >
                    <Zap className="w-4 h-4 mr-2" /> Fetch & Analyze GitHub Projects
                  </Button>
                </div>
              )}
            </div>
            )}
            <div className="flex justify-end pt-4">
               <Button variant="ghost" onClick={() => setIsProfileModalOpen(false)}>Close</Button>
            </div>
          </div>
        </Modal>

    </div>
  );
};
export default App;