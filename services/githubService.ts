import { GitHubRepo } from '../types';

const GITHUB_API_BASE = 'https://api.github.com';

export const fetchUserRepos = async (accessToken: string): Promise<GitHubRepo[]> => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/user/repos?type=owner&sort=updated&per_page=100`, {
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
    return repos;
  } catch (error: any) {
    console.error("Error fetching GitHub repositories:", error);
    throw error;
  }
};

export const fetchRepoContent = async (owner: string, repo: string, path: string, accessToken: string): Promise<string | null> => {
  try {
    const response = await fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/contents/${path}`, {
      headers: {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3.raw', // Request raw content
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // File not found is a valid scenario
      }
      throw new Error(`Failed to fetch repo content for ${owner}/${repo}/${path}: ${response.statusText}`);
    }

    const content = await response.text();
    return content;
  } catch (error: any) {
    console.error(`Error fetching content for ${owner}/${repo}/${path}:`, error);
    throw error;
  }
};
