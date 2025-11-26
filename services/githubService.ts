import { GitHubRepo } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

// GitHub API caching with TTL (Time To Live)
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  data: any;
  timestamp: number;
}

const githubCache = new Map<string, CacheEntry>();

const getCacheKey = (url: string, token?: string) => `${url}:${token ? 'authenticated' : 'public'}`;

const getCachedData = (key: string) => {
  const entry = githubCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  githubCache.delete(key);
  return null;
};

const setCachedData = (key: string, data: any) => {
  githubCache.set(key, { data, timestamp: Date.now() });
};

export const fetchUserRepos = async (accessToken: string): Promise<GitHubRepo[]> => {
  const url = `${GITHUB_API_BASE}/user/repos?type=owner&sort=updated&per_page=100`;
  const cacheKey = getCacheKey(url, accessToken);

  // Check cache first
  const cachedData = getCachedData(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${accessToken}`,
      },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('GitHub authentication failed. Please re-link your GitHub account.');
      }
      throw new Error(`Failed to fetch GitHub repositories: ${response.statusText}`);
    }

    const repos: GitHubRepo[] = await response.json();

    // Cache the result
    setCachedData(cacheKey, repos);

    return repos;
  } catch (error: any) {
    console.error("Error fetching GitHub repositories:", error);
    throw error;
  }
};

export const fetchRepoContent = async (owner: string, repo: string, path: string, accessToken: string): Promise<string | null> => {
  const url = `${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`;
  const cacheKey = getCacheKey(url, accessToken);

  // Check cache first
  const cachedData = getCachedData(cacheKey);
  if (cachedData !== null) { // Note: null means file not found, which is valid
    return cachedData;
  }

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3.raw', // Request raw content
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        setCachedData(cacheKey, null); // Cache the "not found" result
        return null; // File not found is a valid scenario
      }
      throw new Error(`Failed to fetch repo content for ${owner}/${repo}/${path}: ${response.statusText}`);
    }

    const content = await response.text();

    // Cache the result
    setCachedData(cacheKey, content);

    return content;
  } catch (error: any) {
    console.error(`Error fetching content for ${owner}/${repo}/${path}:`, error);
    throw error;
  }
};
