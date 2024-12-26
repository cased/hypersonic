import { GitHubAPI } from '../../core/github';
import { createMockOctokit } from '../helpers/mocks';
import { Octokit } from '@octokit/rest';

jest.mock('@octokit/rest');

describe('GitHubAPI', () => {
  let github: GitHubAPI;
  let mockOctokit: ReturnType<typeof createMockOctokit>;

  beforeEach(() => {
    mockOctokit = createMockOctokit();
    (Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(
      () => mockOctokit as unknown as Octokit
    );
    github = new GitHubAPI('test-token');
  });

  describe('branch operations', () => {
    test('creates branch', async () => {
      mockOctokit.git.getRef.mockResolvedValue({ data: { object: { sha: 'sha' } } });
      await github.createBranch('owner/repo', 'new-branch', 'main');
      expect(mockOctokit.git.createRef).toHaveBeenCalled();
    });

    test('handles existing branch', async () => {
      mockOctokit.git.getRef.mockRejectedValue(new Error('Not found'));
      await expect(github.createBranch('owner/repo', 'new-branch', 'main')).rejects.toThrow();
    });
  });

  describe('file operations', () => {
    test('gets file content', async () => {
      mockOctokit.repos.getContent.mockResolvedValue({
        data: { content: Buffer.from('content').toString('base64') },
      });
      const content = await github.getFileContent('owner/repo', 'path');
      expect(content).toBe('content');
    });

    test('updates file content', async () => {
      const branch = 'main';
      await github.updateFile('owner/repo', 'path', 'content', 'sha', branch);
      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalled();
    });
  });

  describe('PR operations', () => {
    test('creates PR', async () => {
      mockOctokit.pulls.create.mockResolvedValue({
        data: { html_url: 'url' },
      });
      const url = await github.createPullRequest('owner/repo', 'title', 'PR body', 'head', 'base');
      expect(url).toBe('url');
    });

    test('adds reviewers', async () => {
      await github.addReviewers('owner/repo', 1, ['user']);
      expect(mockOctokit.pulls.requestReviewers).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    test('handles file not found', async () => {
      mockOctokit.repos.getContent.mockRejectedValue(new Error('Not found'));
      await expect(github.getFileContent('owner/repo', 'path')).rejects.toThrow();
    });

    test('handles PR creation failure', async () => {
      mockOctokit.pulls.create.mockRejectedValue(new Error('PR failed'));
      await expect(
        github.createPullRequest('owner/repo', 'title', 'PR body', 'head', 'base')
      ).rejects.toThrow();
    });
  });

  test('adds labels to PR', async () => {
    await github.addLabels('owner/repo', 1, ['bug']);
    expect(mockOctokit.issues.addLabels).toHaveBeenCalled();
  });

  test('enables auto merge', async () => {
    await github.enableAutoMerge('owner/repo', 1);
    expect(mockOctokit.pulls.updateBranch).toHaveBeenCalled();
  });

  test('gets default branch', async () => {
    mockOctokit.repos.get.mockResolvedValue({
      data: { default_branch: 'main' },
    });
    const branch = await github.getDefaultBranch('owner/repo');
    expect(branch).toBe('main');
  });
});
