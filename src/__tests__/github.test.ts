import { GitHubAPI } from '../core/github';
import { Octokit } from '@octokit/rest';
import { GitHubError } from '../core/errors';

jest.mock('@octokit/rest');

describe('GitHubAPI', () => {
  let github: GitHubAPI;
  let mockOctokit: Octokit;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create base mock Octokit instance
    mockOctokit = {
      git: {
        getRef: jest.fn(),
        createRef: jest.fn(),
      },
      repos: {
        getContent: jest.fn(),
        createOrUpdateFileContents: jest.fn(),
        get: jest.fn(),
      },
      pulls: {
        create: jest.fn(),
        requestReviewers: jest.fn(),
        updateBranch: jest.fn(),
      },
      issues: {
        addLabels: jest.fn(),
      },
    } as unknown as Octokit;

    (Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(() => mockOctokit);
    github = new GitHubAPI('test-token', 'https://api.github.com');
  });

  describe('createBranch', () => {
    test('creates branch from base', async () => {
      jest.spyOn(mockOctokit.git, 'getRef').mockResolvedValue({
        data: { object: { sha: 'test-sha' } },
      } as any);

      await github.createBranch('user/repo', 'new-branch', 'main');

      expect(mockOctokit.git.createRef).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        ref: 'refs/heads/new-branch',
        sha: 'test-sha',
      });
    });

    test('handles errors', async () => {
      jest.spyOn(mockOctokit.git, 'getRef').mockRejectedValue(new Error('API error'));

      await expect(github.createBranch('user/repo', 'branch', 'main')).rejects.toThrow(GitHubError);
    });
  });

  describe('updateFile', () => {
    test('updates existing file', async () => {
      jest.spyOn(mockOctokit.repos, 'getContent').mockResolvedValue({
        data: { sha: 'existing-sha' },
      } as any);

      await github.updateFile('user/repo', 'test.txt', 'content', 'update message', 'main');

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        path: 'test.txt',
        message: 'update message',
        content: expect.any(String),
        branch: 'main',
        sha: 'existing-sha',
      });
    });

    test('creates new file', async () => {
      jest.spyOn(mockOctokit.repos, 'getContent').mockRejectedValue({ status: 404 });

      await github.updateFile('user/repo', 'new.txt', 'content', 'create message', 'main');

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        path: 'new.txt',
        message: 'create message',
        content: expect.any(String),
        branch: 'main',
      });
    });
  });

  describe('createPullRequest', () => {
    test('creates PR successfully', async () => {
      jest.spyOn(mockOctokit.pulls, 'create').mockResolvedValue({
        data: { html_url: 'https://github.com/user/repo/pull/1' },
      } as any);

      const url = await github.createPullRequest(
        'user/repo',
        'Test PR',
        'Test description',
        'feature-branch',
        'main',
        false
      );

      expect(mockOctokit.pulls.create).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        title: 'Test PR',
        body: 'Test description',
        head: 'feature-branch',
        base: 'main',
        draft: false,
      });
      expect(url).toBe('https://github.com/user/repo/pull/1');
    });
  });

  describe('addReviewers', () => {
    test('adds reviewers to PR', async () => {
      await github.addReviewers('user/repo', 123, ['reviewer1', 'reviewer2']);

      expect(mockOctokit.pulls.requestReviewers).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        pull_number: 123,
        reviewers: ['reviewer1', 'reviewer2'],
      });
    });
  });

  describe('addLabels', () => {
    test('adds labels to PR', async () => {
      await github.addLabels('user/repo', 123, ['bug', 'enhancement']);

      expect(mockOctokit.issues.addLabels).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
        issue_number: 123,
        labels: ['bug', 'enhancement'],
      });
    });
  });

  describe('getDefaultBranch', () => {
    test('gets default branch', async () => {
      jest.spyOn(mockOctokit.repos, 'get').mockResolvedValue({
        data: { default_branch: 'main' },
      } as any);

      const branch = await github.getDefaultBranch('user/repo');

      expect(branch).toBe('main');
      expect(mockOctokit.repos.get).toHaveBeenCalledWith({
        owner: 'user',
        repo: 'repo',
      });
    });
  });

  describe('enableAutoMerge', () => {
    test('enables auto-merge with specified strategy', async () => {
      jest.spyOn(mockOctokit.pulls, 'updateBranch').mockResolvedValue({} as any);

      await github.enableAutoMerge('user/repo', 123, 'squash');

      // Note: This test might need adjustment based on actual implementation
      expect(mockOctokit.pulls.updateBranch).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('wraps API errors in GitHubError', async () => {
      jest.spyOn(mockOctokit.repos, 'get').mockRejectedValue(new Error('API Error'));

      await expect(github.getDefaultBranch('user/repo')).rejects.toThrow(GitHubError);
    });

    test('preserves 404 status in errors', async () => {
      jest.spyOn(mockOctokit.repos, 'get').mockRejectedValue({ status: 404 });

      await expect(github.getDefaultBranch('user/repo')).rejects.toMatchObject({
        status: 404,
      });
    });
  });
});
