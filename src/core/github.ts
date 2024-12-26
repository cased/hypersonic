import { Octokit } from '@octokit/rest';
import { GitHubError } from './errors';
import { MergeStrategy } from './config';

export class GitHubAPI {
  private octokit: Octokit;

  constructor(token: string, baseUrl?: string) {
    this.octokit = new Octokit({
      auth: token,
      ...(baseUrl ? { baseUrl } : {}),
    });
  }

  async createBranch(repo: string, branch: string, baseBranch: string): Promise<void> {
    try {
      const [owner, repoName] = repo.split('/');

      // Get base branch SHA
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

  async getFileContent(repo: string, path: string, ref?: string): Promise<string> {
    try {
      const [owner, repoName] = repo.split('/');

      const { data } = await this.octokit.repos.getContent({
        owner,
        repo: repoName,
        path,
        ref,
      });

      if ('content' in data) {
        return Buffer.from(data.content, 'base64').toString();
      }
      throw new Error('Not a file');
    } catch (error) {
      throw new GitHubError(`Failed to get file content: ${error}`);
    }
  }

  async updateFile(
    repo: string,
    path: string,
    content: string,
    sha: string,
    branch: string
  ): Promise<void> {
    try {
      const [owner, repoName] = repo.split('/');

      await this.octokit.repos.createOrUpdateFileContents({
        owner,
        repo: repoName,
        path,
        message: `Update ${path}`,
        content: Buffer.from(content).toString('base64'),
        sha,
        branch,
      });
    } catch (error) {
      throw new GitHubError(`Failed to update file: ${error}`);
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
    mergeMethod: MergeStrategy = MergeStrategy.SQUASH
  ): Promise<void> {
    try {
      const [owner, repoName] = repo.split('/');

      await this.octokit.pulls.updateBranch({
        owner,
        repo: repoName,
        pull_number: prNumber,
        merge_method: mergeMethod,
      });
    } catch (error) {
      throw new GitHubError(`Failed to enable auto-merge: ${error}`);
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
    } catch (error) {
      throw new GitHubError(`Failed to get default branch: ${error}`);
    }
  }
}
