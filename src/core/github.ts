import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit } from 'simple-git';
import { tmpdir } from 'os';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { GitHubError } from './errors';
import { MergeStrategy, MergeStrategyString } from './config';

export class GitHubAPI {
  private octokit: Octokit;
  private token: string;
  private baseUrl: string;
  private git: SimpleGit;

  constructor(token: string, baseUrl = 'https://api.github.com') {
    this.token = token;
    this.baseUrl = baseUrl;
    this.git = simpleGit();
    this.octokit = new Octokit({
      auth: token,
      baseUrl,
    });
  }

  async createBranch(repo: string, branch: string, baseBranch: string): Promise<void> {
    try {
      const [owner, repoName] = repo.split('/');
      const { data: ref } = await this.octokit.git.getRef({
        owner,
        repo: repoName,
        ref: `heads/${baseBranch}`,
      });

      // Create new branch
      await this.octokit.git.createRef({
        owner,
        repo: repoName,
        ref: `refs/heads/${branch}`,
        sha: ref.object.sha,
      });
    } catch (error) {
      throw new GitHubError(`Failed to create branch: ${error}`);
    }
  }

  async updateFile(
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string
  ): Promise<void> {
    try {
      const [owner, repoName] = repo.split('/');

      try {
        // Try to get existing file
        const { data: fileData } = await this.octokit.repos.getContent({
          owner,
          repo: repoName,
          path,
          ref: branch,
        });

        if (Array.isArray(fileData)) {
          throw new GitHubError(`Path '${path}' points to a directory`);
        }

        await this.octokit.repos.createOrUpdateFileContents({
          owner,
          repo: repoName,
          path,
          message,
          content: Buffer.from(content).toString('base64'),
          sha: fileData.sha,
          branch,
        });
      } catch (error: any) {
        if (error?.status === 404) {
          // File doesn't exist, create it
          await this.octokit.repos.createOrUpdateFileContents({
            owner,
            repo: repoName,
            path,
            message,
            content: Buffer.from(content).toString('base64'),
            branch,
          });
        } else {
          throw error;
        }
      }
    } catch (error: any) {
      throw new GitHubError(`Failed to update file: ${error}`, error?.status);
    }
  }

  async createPullRequest(
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string,
    draft = false
  ): Promise<string> {
    try {
      const [owner, repoName] = repo.split('/');

      const { data: pr } = await this.octokit.pulls.create({
        owner,
        repo: repoName,
        title,
        body,
        head,
        base,
        draft,
      });

      return pr.html_url;
    } catch (error) {
      throw new GitHubError(`Failed to create pull request: ${error}`);
    }
  }

  async addLabels(repo: string, prNumber: number, labels: string[]): Promise<void> {
    try {
      const [owner, repoName] = repo.split('/');

      await this.octokit.issues.addLabels({
        owner,
        repo: repoName,
        issue_number: prNumber,
        labels,
      });
    } catch (error) {
      throw new GitHubError(`Failed to add labels: ${error}`);
    }
  }

  async addReviewers(repo: string, prNumber: number, reviewers: string[]): Promise<void> {
    try {
      const [owner, repoName] = repo.split('/');

      await this.octokit.pulls.requestReviewers({
        owner,
        repo: repoName,
        pull_number: prNumber,
        reviewers,
      });
    } catch (error) {
      throw new GitHubError(`Failed to add reviewers: ${error}`);
    }
  }

  async enableAutoMerge(
    repo: string,
    prNumber: number,
    strategy: MergeStrategy | MergeStrategyString
  ): Promise<void> {
    try {
      const [owner, repoName] = repo.split('/');
      
      // Enable auto-merge and set merge method in one call
      await this.octokit.pulls.update({
        owner,
        repo: repoName,
        pull_number: prNumber,
        auto_merge: true,
        merge_method: strategy
      });
    } catch (error: any) {
      throw new GitHubError(
        `Failed to enable auto-merge: ${error}`,
        error?.status
      );
    }
  }

  async getDefaultBranch(repo: string): Promise<string> {
    try {
      const [owner, repoName] = repo.split('/');

      const { data: repository } = await this.octokit.repos.get({
        owner,
        repo: repoName,
      });

      return repository.default_branch;
    } catch (error: any) {
      throw new GitHubError(`Failed to get default branch: ${error}`, error?.status);
    }
  }

  // Local git operations
  async applyDiff(repo: string, branch: string, diffContent: string): Promise<void> {
    try {
      const tempDir = join(tmpdir(), `hypersonic-${Date.now()}`);
      await mkdir(tempDir, { recursive: true });

      const [owner, repoName] = repo.split('/');
      const cloneUrl = `https://${this.token}@${this.baseUrl.replace(
        'https://',
        ''
      )}/${owner}/${repoName}.git`;

      const git = simpleGit(tempDir);
      await git.clone(cloneUrl, tempDir);

      try {
        await git.checkout(branch);
      } catch {
        await git.checkoutLocalBranch(branch);
      }

      const diffPath = join(tempDir, 'changes.diff');
      await writeFile(diffPath, diffContent);

      try {
        await git.raw(['apply', diffPath]);
        await git.add('.');
        await git.commit('Apply changes');
        await git.push('origin', branch);
      } catch (error) {
        throw new GitHubError(`Failed to apply diff: ${error}`);
      }
    } catch (error) {
      throw new GitHubError(`Failed to apply diff: ${error}`);
    }
  }

  async getLocalDiff(path: string, files?: string[]): Promise<string> {
    try {
      const git = simpleGit(path);
      if (files?.length) {
        return await git.diff(['HEAD', '--', ...files]);
      }
      return await git.diff(['HEAD']);
    } catch (error) {
      throw new GitHubError(`Failed to get local diff: ${error}`);
    }
  }
}
