import { Hypersonic } from '../core/pr';
import { GitHubAPI } from '../core/github';
import { DEFAULT_PR_CONFIG, DEFAULT_CONFIG, HypersonicConfig } from '../core/config';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

// Mock GitHubAPI and fs promises
jest.mock('../core/github');
jest.mock('fs/promises');

describe('Hypersonic', () => {
  let hypersonic: Hypersonic;
  let mockGitHub: jest.Mocked<GitHubAPI>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create a properly typed mock
    mockGitHub = {
      createBranch: jest.fn(),
      updateFile: jest.fn(),
      createPullRequest: jest.fn(),
      addLabels: jest.fn(),
      addReviewers: jest.fn(),
      enableAutoMerge: jest.fn(),
      getDefaultBranch: jest.fn(),
      applyDiff: jest.fn(),
      getLocalDiff: jest.fn(),
      // Add required properties
      octokit: {} as any,
      token: 'test-token',
      baseUrl: 'https://api.github.com',
      git: {} as any,
    } as unknown as jest.Mocked<GitHubAPI>;

    (GitHubAPI as jest.MockedClass<typeof GitHubAPI>).mockImplementation(() => mockGitHub);

    // Create instance with all required config
    const config: HypersonicConfig = {
      githubToken: 'test-token',
      baseUrl: 'https://api.github.com',
      defaultPrConfig: DEFAULT_PR_CONFIG,
    };
    hypersonic = new Hypersonic(config);

    // Mock PR URL with correct format
    mockGitHub.createPullRequest.mockResolvedValue('https://github.com/user/repo/pull/123');
  });

  describe('constructor', () => {
    test('initializes with token string', () => {
      const instance = new Hypersonic('test-token');
      expect(instance).toBeInstanceOf(Hypersonic);
    });

    test('initializes with full config', () => {
      const config: HypersonicConfig = {
        githubToken: 'test-token',
        baseUrl: 'https://custom.github.com',
        defaultPrConfig: DEFAULT_PR_CONFIG,
      };
      const instance = new Hypersonic(config);
      expect(instance).toBeInstanceOf(Hypersonic);
    });

    test('throws on invalid token', () => {
      expect(() => new Hypersonic('')).toThrow();
    });

    test('uses default baseUrl when initialized with token string', () => {
      const instance = new Hypersonic('test-token');
      expect(GitHubAPI).toHaveBeenCalledWith('test-token', DEFAULT_CONFIG.baseUrl);
    });

    test('requires baseUrl when initialized with config object', () => {
      expect(
        () =>
          new Hypersonic({
            githubToken: 'test-token',
            defaultPrConfig: DEFAULT_PR_CONFIG,
            // missing baseUrl
          } as any)
      ).toThrow();
    });
  });

  describe('createPrFromContent', () => {
    beforeEach(() => {
      mockGitHub.getDefaultBranch.mockResolvedValue('main');
      mockGitHub.createPullRequest.mockResolvedValue('https://github.com/user/repo/pull/1');
    });

    test('creates PR with minimal config', async () => {
      await hypersonic.createPrFromContent('user/repo', 'test content', 'test.txt');

      expect(mockGitHub.createBranch).toHaveBeenCalled();
      expect(mockGitHub.updateFile).toHaveBeenCalledWith(
        'user/repo',
        'test.txt',
        'test content',
        expect.any(String),
        expect.any(String)
      );
      expect(mockGitHub.createPullRequest).toHaveBeenCalled();
    });

    test('creates PR with full config', async () => {
      await hypersonic.createPrFromContent('user/repo', 'content', 'file.txt', {
        title: 'Test PR',
        description: 'Test description',
        labels: ['test'],
        reviewers: ['reviewer'],
        draft: true,
        commitMessage: 'custom commit',
      });

      expect(mockGitHub.updateFile).toHaveBeenCalledWith(
        'user/repo',
        'file.txt',
        'content',
        'custom commit',
        expect.any(String)
      );
      expect(mockGitHub.addLabels).toHaveBeenCalledWith('user/repo', 1, ['test']);
      expect(mockGitHub.addReviewers).toHaveBeenCalledWith('user/repo', 1, ['reviewer']);
    });

    test('handles API errors gracefully', async () => {
      mockGitHub.getDefaultBranch.mockRejectedValue(new Error('API error'));
      await expect(
        hypersonic.createPrFromContent('user/repo', 'content', 'file.txt')
      ).rejects.toThrow();
    });

    test('uses default branch from config', async () => {
      mockGitHub.getDefaultBranch.mockResolvedValue('develop');

      const customHypersonic = new Hypersonic({
        githubToken: 'token',
        baseUrl: 'https://api.github.com',
        defaultPrConfig: {
          ...DEFAULT_PR_CONFIG,
          baseBranch: 'develop',
        },
      });

      await customHypersonic.createPrFromContent('user/repo', 'content', 'file.txt');

      expect(mockGitHub.createBranch).toHaveBeenCalledWith(
        'user/repo',
        expect.any(String),
        'develop'
      );
    });
  });

  describe('createPrFromMultipleContents', () => {
    beforeEach(() => {
      mockGitHub.getDefaultBranch.mockResolvedValue('main');
      mockGitHub.createPullRequest.mockResolvedValue('https://github.com/user/repo/pull/1');
    });

    test('creates PR with multiple files', async () => {
      const contents = {
        'file1.txt': 'content1',
        'file2.txt': 'content2',
      };

      await hypersonic.createPrFromMultipleContents('user/repo', contents);

      expect(mockGitHub.updateFile).toHaveBeenCalledTimes(2);
      expect(mockGitHub.createBranch).toHaveBeenCalledTimes(1);
      expect(mockGitHub.createPullRequest).toHaveBeenCalledTimes(1);
    });

    test('handles empty files object', async () => {
      await expect(hypersonic.createPrFromMultipleContents('user/repo', {})).rejects.toThrow();
    });

    test('uses custom commit messages', async () => {
      await hypersonic.createPrFromMultipleContents(
        'user/repo',
        { 'file.txt': '' },
        { commitMessage: 'custom message' }
      );

      expect(mockGitHub.updateFile).toHaveBeenCalledWith(
        'user/repo',
        'file.txt',
        '',
        'custom message',
        expect.any(String)
      );
    });
  });

  describe('createPrFromFile', () => {
    beforeEach(() => {
      (writeFile as jest.Mock).mockResolvedValue(undefined);
      (mkdir as jest.Mock).mockResolvedValue(undefined);
      mockGitHub.getDefaultBranch.mockResolvedValue('main');
      mockGitHub.createPullRequest.mockResolvedValue('https://github.com/user/repo/pull/1');
    });

    test('reads and uploads local file', async () => {
      const mockContent = 'file content';
      (require('fs/promises').readFile as jest.Mock).mockResolvedValue(mockContent);

      await hypersonic.createPrFromFile('user/repo', 'local/file.txt', 'remote/file.txt');

      expect(mockGitHub.updateFile).toHaveBeenCalledWith(
        'user/repo',
        'remote/file.txt',
        mockContent,
        expect.any(String),
        expect.any(String)
      );
    });

    test('handles file read errors', async () => {
      (require('fs/promises').readFile as jest.Mock).mockRejectedValue(new Error('File not found'));

      await expect(
        hypersonic.createPrFromFile('user/repo', 'nonexistent.txt', 'remote.txt')
      ).rejects.toThrow();
    });
  });

  describe('createPrFromFiles', () => {
    test('handles multiple local files', async () => {
      const mockFiles = {
        'local1.txt': 'remote1.txt',
        'local2.txt': 'remote2.txt',
      };
      (require('fs/promises').readFile as jest.Mock).mockResolvedValue('content');

      await hypersonic.createPrFromFiles('user/repo', mockFiles);

      expect(mockGitHub.updateFile).toHaveBeenCalledTimes(2);
    });

    test('rejects empty files object', async () => {
      await expect(hypersonic.createPrFromFiles('user/repo', {})).rejects.toThrow(
        'No files provided'
      );
    });
  });

  describe('config handling', () => {
    test('uses custom base URL', () => {
      const config: HypersonicConfig = {
        githubToken: 'test-token',
        baseUrl: 'https://custom.github.com',
        defaultPrConfig: DEFAULT_PR_CONFIG,
      };
      const instance = new Hypersonic(config);
      expect(GitHubAPI).toHaveBeenCalledWith('test-token', 'https://custom.github.com');
    });

    test('uses default base URL with token string', () => {
      const instance = new Hypersonic('test-token');
      expect(GitHubAPI).toHaveBeenCalledWith('test-token', DEFAULT_CONFIG.baseUrl);
    });

    test('merges PR config correctly', async () => {
      const config: HypersonicConfig = {
        githubToken: 'test-token',
        baseUrl: 'https://api.github.com',
        defaultPrConfig: {
          ...DEFAULT_PR_CONFIG,
          labels: ['default-label'],
        },
      };
      const instance = new Hypersonic(config);

      await instance.createPrFromContent('user/repo', 'content', 'file.txt', {
        labels: ['custom-label'],
      });

      expect(mockGitHub.addLabels).toHaveBeenCalledWith(
        'user/repo',
        expect.any(Number),
        ['custom-label'] // Should use provided labels, not defaults
      );
    });
  });
});
