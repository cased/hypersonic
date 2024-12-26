import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit } from 'simple-git';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { GitError } from '../core/errors';

export class GitHandler {
  private octokit: Octokit;
  private token: string;
  private baseUrl: string;
  private git: SimpleGit;

  constructor(token: string, baseUrl = 'https://github.com') {
    this.token = token;
    this.baseUrl = baseUrl;
    this.git = simpleGit();
    this.octokit = new Octokit({
      auth: token,
      baseUrl: this.baseUrl,
    });
  }

  async createBranch(repo: string, branch: string, base: string): Promise<void> {
    try {
      const [owner, repoName] = repo.split('/');
      const { data: baseRef } = await this.octokit.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${base}`,
      });

      // Checkout the base commit
      await this.git.checkout(baseRef.object.sha);

      // Create and checkout the new branch
      await this.git.checkoutLocalBranch(branch);
    } catch (error) {
      throw new GitError(`Failed to create branch: ${error}`);
    }
  }

  async updateFile(
    repo: string,
    path: string,
    content: string,
    commitMessage: string,
    branch: string
  ): Promise<void> {
    try {
      const [owner, repoName] = repo.split('/');
      await this.octokit.repos.get({ owner, repo: repoName });

      try {
        // Try to get existing file
        const { data: fileData } = await this.octokit.repos.getContent({
          owner,
          repo: repoName,
          path,
          ref: branch,
        });

        if (Array.isArray(fileData)) {
          throw new GitError(`Path '${path}' points to a directory`);
        }

        await this.octokit.repos.createOrUpdateFileContents({
          owner,
          repo: repoName,
          path,
          message: `Update ${path}`,
          content: Buffer.from(content).toString('base64'),
          sha: fileData.sha,
          branch,
        });
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'status' in error && error.status === 404) {
          // File doesn't exist, create it
          await this.octokit.repos.createOrUpdateFileContents({
            owner,
            repo: repoName,
            path,
            message: `Add ${path}`,
            content: Buffer.from(content).toString('base64'),
            branch,
          });
        } else {
          throw error;
        }
      }
    } catch (error: unknown) {
      throw new GitError(`Failed to update file: ${error}`);
    }
  }

  async getLocalDiff(path: string, files?: string[]): Promise<string> {
    try {
      const git: SimpleGit = simpleGit(path);
      if (files && files.length > 0) {
        return await git.diff(['HEAD', '--', ...files]);
      }
      return await git.diff(['HEAD']);
    } catch (error: unknown) {
      throw new GitError(`Failed to get local diff: ${error}`);
    }
  }

  async applyDiff(repo: string, branch: string, diffContent: string): Promise<void> {
    try {
      // Create temporary directory
      const tempDir = join(tmpdir(), `hypersonic-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });

      // Clone repository
      const [owner, repoName] = repo.split('/');
      const cloneUrl = `https://${this.token}@${this.baseUrl.replace(
        'https://',
        ''
      )}/${owner}/${repoName}.git`;

      const git: SimpleGit = simpleGit(tempDir);
      await git.clone(cloneUrl, tempDir);

      // Checkout branch
      try {
        await git.checkout(branch);
      } catch {
        // Branch doesn't exist, create it
        await git.checkoutLocalBranch(branch);
      }

      // Apply diff
      const diffPath = join(tempDir, 'changes.diff');
      await writeFile(diffPath, diffContent);

      try {
        await git.raw(['apply', diffPath]);
      } catch (error) {
        throw new GitError(`Failed to apply diff: ${error}`);
      }

      // Commit and push changes
      await git.add('.');
      await git.commit('Apply changes');
      await git.push('origin', branch);
    } catch (error: unknown) {
      throw new GitError(`Failed to apply diff: ${error}`);
    }
  }

  async getDiff(branch1: string, branch2: string): Promise<string> {
    try {
      return await this.git.diff([branch1, branch2]);
    } catch (error: unknown) {
      throw new Error(`Failed to get diff: ${error}`);
    }
  }

  async commit(message: string): Promise<void> {
    try {
      await this.git.add('.');
      await this.git.commit(message);
      await this.git.push();
    } catch (error: unknown) {
      throw new Error(`Failed to commit: ${error}`);
    }
  }
}
