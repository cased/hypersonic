import { readFile } from 'fs/promises';
import { GitHubError } from './errors';
import { HypersonicConfig, PRConfig, DEFAULT_CONFIG, DEFAULT_PR_CONFIG } from './config';
import { GitHubAPI } from './github';

export class Hypersonic {
  private config: HypersonicConfig;
  private github: GitHubAPI;

  constructor(config: HypersonicConfig | string) {
    if (typeof config === 'string') {
      if (!config) {
        throw new Error('GitHub token is required');
      }
      this.config = {
        ...DEFAULT_CONFIG,
        githubToken: config,
      };
    } else {
      if (!config.githubToken) {
        throw new Error('GitHub token is required');
      }
      this.config = {
        ...DEFAULT_CONFIG,
        ...config,
      };
    }

    this.github = new GitHubAPI(this.config.githubToken, this.config.baseUrl);
  }

  private async preparePrConfig(config: Partial<PRConfig> = {}): Promise<PRConfig> {
    // Explicitly type the merged config
    const mergedConfig: PRConfig = {
      ...DEFAULT_PR_CONFIG,
      ...this.config.defaultPrConfig,
      ...config,
    };

    return mergedConfig;
  }

  private async handlePrExtras(repo: string, prUrl: string, prConfig: PRConfig): Promise<void> {
    const match = prUrl.match(/\/pull\/(\d+)$/);
    if (!match) {
      throw new GitHubError('Invalid PR URL format');
    }
    const prNumber = parseInt(match[1], 10);

    // Add labels if specified and not empty
    if (prConfig.labels && prConfig.labels.length > 0) {
      await this.github.addLabels(repo, prNumber, prConfig.labels);
    }

    // Add reviewers if specified and not empty
    if (prConfig.reviewers && prConfig.reviewers.length > 0) {
      await this.github.addReviewers(repo, prNumber, prConfig.reviewers);
    }

    // Enable auto-merge if requested and merge strategy is specified
    if (prConfig.autoMerge && prConfig.mergeStrategy) {
      await this.github.enableAutoMerge(repo, prNumber, prConfig.mergeStrategy);
    }
  }

  private async createPullRequest(
    repo: string,
    head: string,
    base: string,
    config?: Partial<PRConfig>
  ): Promise<string> {
    const prConfig = await this.preparePrConfig(config);

    const prUrl = await this.github.createPullRequest(
      repo,
      prConfig.title,
      prConfig.description || '',
      head,
      base,
      prConfig.draft
    );

    await this.handlePrExtras(repo, prUrl, prConfig);
    return prUrl;
  }

  private async createPr(
    repo: string,
    contents: Record<string, string> | string,
    config?: Partial<PRConfig>
  ): Promise<string> {
    try {
      const branchName = typeof contents === 'string' ? contents : `update-${Date.now()}`;
      const defaultBranch = await this.github.getDefaultBranch(repo);
      const prConfig = await this.preparePrConfig(config);

      if (typeof contents === 'string') {
        return this.createPullRequest(repo, branchName, defaultBranch, config);
      }

      // Create branch and update files
      await this.github.createBranch(repo, branchName, defaultBranch);

      for (const [path, content] of Object.entries(contents)) {
        const message =
          prConfig.commitMessage || (content === '' ? `Delete ${path}` : `Update ${path}`);
        await this.github.updateFile(repo, path, content, message, branchName);
      }

      return this.createPullRequest(repo, branchName, defaultBranch, config);
    } catch (error) {
      throw new GitHubError(`Failed to create PR: ${error}`);
    }
  }

  async createPrFromFile(
    repo: string,
    localFilePath: string,
    upstreamPath: string,
    config?: Partial<PRConfig>
  ): Promise<string> {
    try {
      const content = await readFile(localFilePath, 'utf8');
      return this.createPr(repo, { [upstreamPath]: content }, config);
    } catch (error) {
      throw new GitHubError(`Failed to update file: ${error}`);
    }
  }

  async createPrFromContent(
    repo: string,
    content: string,
    path: string,
    config?: Partial<PRConfig>
  ): Promise<string> {
    return this.createPr(repo, { [path]: content }, config);
  }

  async createPrFromMultipleContents(
    repo: string,
    contents: Record<string, string>,
    config?: Partial<PRConfig>
  ): Promise<string> {
    if (!contents || Object.keys(contents).length === 0) {
      throw new GitHubError('No files provided');
    }
    return this.createPr(repo, contents, config);
  }

  async createPrFromFiles(
    repo: string,
    files: Record<string, string>,
    config?: Partial<PRConfig>
  ): Promise<string> {
    if (!files || Object.keys(files).length === 0) {
      throw new GitHubError('No files provided');
    }

    try {
      const contents: Record<string, string> = {};
      for (const [localPath, remotePath] of Object.entries(files)) {
        contents[remotePath] = await readFile(localPath, 'utf8');
      }
      return this.createPr(repo, contents, config);
    } catch (error) {
      throw new GitHubError(`Failed to create PR from files: ${error}`);
    }
  }
}
