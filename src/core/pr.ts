import { readFile } from 'fs/promises';
import { GitHubError } from './errors';
import { HypersonicConfig, PRConfig, DEFAULT_CONFIG, DEFAULT_PR_CONFIG } from './config';
import { GitHubAPI } from './github';

export class Hypersonic {
  private config: HypersonicConfig;
  private github: GitHubAPI;

  constructor(config: HypersonicConfig | string) {
    if (typeof config === 'string') {
      this.config = { ...DEFAULT_CONFIG, githubToken: config };
    } else {
      this.config = { ...DEFAULT_CONFIG, ...config };
    }

    this.github = new GitHubAPI(this.config.githubToken, this.config.baseUrl);
  }

  private async preparePrConfig(
    prConfig?: Partial<PRConfig> | PRConfig,
    extraConfig: Partial<PRConfig> = {}
  ): Promise<PRConfig> {
    if (prConfig && Object.keys(extraConfig).length > 0) {
      throw new Error('Cannot provide both PRConfig and keyword arguments. Choose one approach.');
    }

    // If prConfig is provided, merge it with defaults
    if (prConfig) {
      return { ...DEFAULT_PR_CONFIG, ...prConfig };
    }

    // If extraConfig is provided, merge it with defaults
    if (Object.keys(extraConfig).length > 0) {
      return { ...DEFAULT_PR_CONFIG, ...extraConfig };
    }

    // Use default config
    return { ...this.config.defaultPrConfig };
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

    // Extract PR number from URL
    const match = prUrl.match(/\/pull\/(\d+)$/);
    if (!match) {
      throw new GitHubError('Invalid PR URL format');
    }
    const prNumber = parseInt(match[1], 10);

    // Add labels if specified
    if (prConfig.labels.length > 0) {
      await this.github.addLabels(repo, prNumber, prConfig.labels);
    }

    // Add reviewers if specified
    if (prConfig.reviewers.length > 0) {
      await this.github.addReviewers(repo, prNumber, prConfig.reviewers);
    }

    // Enable auto-merge if requested
    if (prConfig.autoMerge) {
      await this.github.enableAutoMerge(repo, prNumber, prConfig.mergeStrategy);
    }

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

      if (typeof contents === 'string') {
        // Branch name was passed directly
        return this.createPullRequest(repo, branchName, defaultBranch, config);
      }

      // Create branch and update files
      await this.github.createBranch(repo, branchName, defaultBranch);

      for (const [path, content] of Object.entries(contents)) {
        const message =
          config?.commitMessage ||
          (content === '' ? `Delete ${path}` : path in contents ? `Update ${path}` : `Add ${path}`);
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
    options?: Partial<PRConfig>
  ): Promise<string> {
    try {
      const branchName = `update-${path}-${Date.now()}`;
      const defaultBranch = await this.github.getDefaultBranch(repo);

      await this.github.createBranch(repo, branchName, defaultBranch);

      const message = options?.title || `Update ${path}`;
      await this.github.updateFile(repo, path, content, message, branchName);

      return await this.createPr(repo, branchName, options);
    } catch (error) {
      throw new Error(`Failed to create PR: ${error}`);
    }
  }

  async createPrFromMultipleContents(
    repo: string,
    contents: Record<string, string>,
    config?: Partial<PRConfig>
  ): Promise<string> {
    const prConfig = await this.preparePrConfig(config);
    const branch = `update-${Date.now()}`;

    try {
      await this.github.createBranch(repo, branch, prConfig.baseBranch);

      // Update each file
      for (const [path, content] of Object.entries(contents)) {
        const message =
          config?.commitMessage ||
          (content === '' ? `Delete ${path}` : path in contents ? `Update ${path}` : `Add ${path}`);

        await this.github.updateFile(repo, path, content, message, branch);
      }

      const prUrl = await this.github.createPullRequest(
        repo,
        prConfig.title,
        prConfig.description || '',
        branch,
        prConfig.baseBranch,
        prConfig.draft
      );

      // Extract PR number from URL
      const match = prUrl.match(/\/pull\/(\d+)$/);
      if (!match) {
        throw new GitHubError('Invalid PR URL format');
      }
      const prNumber = parseInt(match[1], 10);

      // Add labels if specified
      if (prConfig.labels.length > 0) {
        await this.github.addLabels(repo, prNumber, prConfig.labels);
      }

      // Add reviewers if specified
      if (prConfig.reviewers.length > 0) {
        await this.github.addReviewers(repo, prNumber, prConfig.reviewers);
      }

      // Enable auto-merge if requested
      if (prConfig.autoMerge) {
        await this.github.enableAutoMerge(repo, prNumber, prConfig.mergeStrategy);
      }

      return prUrl;
    } catch (error) {
      throw new GitHubError(`Failed to create PR: ${error}`);
    }
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
