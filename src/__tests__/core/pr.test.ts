import { Hypersonic } from '../../core/pr';
import { GitHubAPI } from '../../core/github';
import { MergeStrategy } from '../../core/config';
import { GitHubError } from '../../core/errors';
import { HypersonicConfig } from '../../core/config';
import { readFile } from 'fs/promises';

jest.mock('../../core/github');
jest.mock('fs/promises');

describe('Hypersonic', () => {
  let hypersonic: Hypersonic;
  let mockGitHubAPI: jest.Mocked<GitHubAPI>;

  beforeEach(() => {
    mockGitHubAPI = {
      createBranch: jest.fn(),
      updateFile: jest.fn(),
      createPullRequest: jest.fn(),
      addLabels: jest.fn(),
      addReviewers: jest.fn(),
      enableAutoMerge: jest.fn(),
      getDefaultBranch: jest.fn().mockResolvedValue('main'),
    } as unknown as jest.Mocked<GitHubAPI>;

    (GitHubAPI as jest.MockedClass<typeof GitHubAPI>).mockImplementation(() => mockGitHubAPI);

    hypersonic = new Hypersonic('test-token');
  });

  describe('constructor', () => {
    test('initializes with token string', () => {
      const instance = new Hypersonic('test-token');
      expect(instance).toBeInstanceOf(Hypersonic);
    });

    test('initializes with config object', () => {
      const config: HypersonicConfig = {
        githubToken: 'test-token',
        baseUrl: 'https://api.example.com',
        appName: 'test-app',
        defaultPrConfig: {
          title: 'Test PR',
          baseBranch: 'main',
          draft: false,
          labels: [],
          reviewers: [],
          teamReviewers: [],
          mergeStrategy: MergeStrategy.SQUASH,
          deleteBranchOnMerge: true,
          autoMerge: false,
        },
      };

      const instance = new Hypersonic(config);
      expect(instance).toBeInstanceOf(Hypersonic);
    });
  });

  describe('createPr', () => {
    test('creates PR with single file change', async () => {
      const timestamp = Math.floor(Date.now() / 1000);
      jest.spyOn(Date, 'now').mockReturnValue(timestamp * 1000);

      mockGitHubAPI.createPullRequest.mockResolvedValueOnce('https://github.com/owner/repo/pull/1');
      mockGitHubAPI.getDefaultBranch.mockResolvedValueOnce('main');

      const url = await hypersonic.createPrFromMultipleContents(
        'owner/repo',
        { 'test.txt': 'content' },
        { title: 'Test PR' }
      );

      expect(mockGitHubAPI.createBranch).toHaveBeenCalledWith(
        'owner/repo',
        `update-${timestamp * 1000}`,
        'main'
      );

      expect(mockGitHubAPI.updateFile).toHaveBeenCalledWith(
        'owner/repo',
        'test.txt',
        'content',
        'Update test.txt',
        expect.any(String)
      );

      expect(mockGitHubAPI.createPullRequest).toHaveBeenCalledWith(
        'owner/repo',
        'Test PR',
        '',
        `update-${timestamp * 1000}`,
        'main',
        false
      );

      expect(url).toBe('https://github.com/owner/repo/pull/1');
    });

    test('creates PR with multiple file changes', async () => {
      mockGitHubAPI.createPullRequest.mockResolvedValueOnce('https://github.com/owner/repo/pull/1');

      await hypersonic.createPrFromMultipleContents(
        'owner/repo',
        {
          'file1.txt': 'content1',
          'file2.txt': 'content2',
        },
        { title: 'Multiple Files' }
      );

      expect(mockGitHubAPI.updateFile).toHaveBeenCalledTimes(2);
    });

    test('handles file deletion', async () => {
      mockGitHubAPI.createPullRequest.mockResolvedValueOnce('https://github.com/owner/repo/pull/1');

      await hypersonic.createPrFromMultipleContents(
        'owner/repo',
        { 'delete.txt': '' },
        { title: 'Delete File' }
      );

      expect(mockGitHubAPI.updateFile).toHaveBeenCalledWith(
        'owner/repo',
        'delete.txt',
        '',
        'Delete delete.txt',
        expect.any(String)
      );
    });

    test('adds labels when specified', async () => {
      mockGitHubAPI.createPullRequest.mockResolvedValueOnce('https://github.com/owner/repo/pull/1');

      await hypersonic.createPrFromMultipleContents(
        'owner/repo',
        { 'test.txt': 'content' },
        { title: 'Test PR', labels: ['bug', 'enhancement'] }
      );

      expect(mockGitHubAPI.addLabels).toHaveBeenCalledWith('owner/repo', 1, ['bug', 'enhancement']);
    });

    test('adds reviewers when specified', async () => {
      mockGitHubAPI.createPullRequest.mockResolvedValueOnce('https://github.com/owner/repo/pull/1');

      await hypersonic.createPrFromMultipleContents(
        'owner/repo',
        { 'test.txt': 'content' },
        { title: 'Test PR', reviewers: ['user1', 'user2'] }
      );

      expect(mockGitHubAPI.addReviewers).toHaveBeenCalledWith('owner/repo', 1, ['user1', 'user2']);
    });

    test('enables auto-merge when specified', async () => {
      mockGitHubAPI.createPullRequest.mockResolvedValueOnce('https://github.com/owner/repo/pull/1');

      await hypersonic.createPrFromMultipleContents(
        'owner/repo',
        { 'test.txt': 'content' },
        { title: 'Test PR', autoMerge: true, mergeStrategy: MergeStrategy.SQUASH }
      );

      expect(mockGitHubAPI.enableAutoMerge).toHaveBeenCalledWith(
        'owner/repo',
        1,
        MergeStrategy.SQUASH
      );
    });
  });

  describe('createPrFromFile', () => {
    test('creates PR from local file', async () => {
      (readFile as jest.Mock).mockResolvedValueOnce('file content');
      mockGitHubAPI.createPullRequest.mockResolvedValueOnce('https://github.com/owner/repo/pull/1');

      const url = await hypersonic.createPrFromFile('owner/repo', 'local.txt', 'remote.txt', {
        title: 'File PR',
      });

      expect(readFile).toHaveBeenCalledWith('local.txt', 'utf8');
      expect(mockGitHubAPI.updateFile).toHaveBeenCalledWith(
        'owner/repo',
        'remote.txt',
        'file content',
        expect.any(String),
        expect.any(String)
      );
      expect(url).toBe('https://github.com/owner/repo/pull/1');
    });
  });

  describe('createPrFromContent', () => {
    test('creates PR from content string', async () => {
      mockGitHubAPI.createPullRequest.mockResolvedValueOnce('https://github.com/owner/repo/pull/1');

      const url = await hypersonic.createPrFromContent('owner/repo', 'content', 'file.txt', {
        title: 'Content PR',
      });

      expect(mockGitHubAPI.updateFile).toHaveBeenCalledWith(
        'owner/repo',
        'file.txt',
        'content',
        expect.any(String),
        expect.any(String)
      );
      expect(url).toBe('https://github.com/owner/repo/pull/1');
    });
  });

  describe('error handling', () => {
    test('handles GitHub API errors', async () => {
      mockGitHubAPI.createBranch.mockRejectedValueOnce(new Error('API error'));

      await expect(
        hypersonic.createPrFromMultipleContents('owner/repo', { 'test.txt': 'content' })
      ).rejects.toThrow(GitHubError);
    });

    test('handles file read errors', async () => {
      (readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));

      await expect(
        hypersonic.createPrFromFile('owner/repo', 'nonexistent.txt', 'remote.txt')
      ).rejects.toThrow(GitHubError);
    });

    test('throws error when providing both config and kwargs', async () => {
      await expect(
        hypersonic['preparePrConfig']({ title: 'Test' }, { baseBranch: 'main' })
      ).rejects.toThrow('Cannot provide both PRConfig and keyword arguments');
    });

    test('handles missing PR number in URL', async () => {
      mockGitHubAPI.createPullRequest.mockResolvedValueOnce(
        'https://github.com/owner/repo/pull/invalid'
      );

      await expect(
        hypersonic.createPrFromMultipleContents('owner/repo', { 'test.txt': 'content' })
      ).rejects.toThrow('Invalid PR URL format');
    });

    test('handles file read errors in createPrFromFiles', async () => {
      mockGitHubAPI.createPullRequest.mockResolvedValueOnce('https://github.com/owner/repo/pull/1');
      (readFile as jest.Mock).mockRejectedValueOnce(new Error('File not found'));
      await expect(
        hypersonic.createPrFromFiles('owner/repo', {
          'nonexistent.txt': 'remote.txt',
        })
      ).rejects.toThrow(GitHubError);
    });

    test('handles invalid file mapping in createPrFromFiles', async () => {
      mockGitHubAPI.createPullRequest.mockResolvedValueOnce('https://github.com/owner/repo/pull/1');
      await expect(
        hypersonic.createPrFromFiles(
          'owner/repo',
          {} // Empty mapping
        )
      ).rejects.toThrow('No files provided');
    });

    test('handles file read errors in batch', async () => {
      (readFile as jest.Mock)
        .mockResolvedValueOnce('content1')
        .mockRejectedValueOnce(new Error('File not found'));

      await expect(
        hypersonic.createPrFromFiles('owner/repo', {
          'file1.txt': 'remote1.txt',
          'file2.txt': 'remote2.txt',
        })
      ).rejects.toThrow(GitHubError);
    });
  });
});
