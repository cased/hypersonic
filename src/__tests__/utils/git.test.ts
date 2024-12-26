import { GitHandler } from '../../utils/git';
import { createMockOctokit } from '../helpers/mocks';
import { Octokit } from '@octokit/rest';
import simpleGit, { SimpleGit, CommitResult, PushResult } from 'simple-git';

jest.mock('@octokit/rest');
jest.mock('simple-git');

describe('GitHandler', () => {
  let git: GitHandler;
  let mockOctokit: ReturnType<typeof createMockOctokit>;
  let mockSimpleGit: jest.Mocked<SimpleGit>;

  beforeEach(() => {
    mockOctokit = createMockOctokit();
    (Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(
      () => mockOctokit as unknown as Octokit
    );

    // Mock fetch
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ ref: 'refs/heads/new-branch' }),
    });

    mockSimpleGit = {
      clone: jest.fn(),
      checkout: jest.fn(),
      checkoutLocalBranch: jest.fn(),
      add: jest.fn(),
      commit: jest.fn(),
      push: jest.fn(),
      diff: jest.fn(),
      raw: jest.fn(),
    } as unknown as jest.Mocked<SimpleGit>;

    (simpleGit as jest.MockedFunction<typeof simpleGit>).mockReturnValue(mockSimpleGit);

    git = new GitHandler('test-token');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('clones repository', async () => {
    mockOctokit.git.getRef.mockResolvedValue({ data: { object: { sha: 'sha' } } });
    mockSimpleGit.clone.mockResolvedValue('');
    mockSimpleGit.checkout.mockResolvedValue('');
    mockSimpleGit.add.mockResolvedValue('');
    mockSimpleGit.commit.mockResolvedValue({} as CommitResult);
    mockSimpleGit.push.mockResolvedValue({} as PushResult);

    await git.applyDiff('owner/repo', 'branch', 'diff content');

    expect(mockSimpleGit.clone).toHaveBeenCalled();
  });

  test('handles clone error', async () => {
    mockSimpleGit.clone.mockRejectedValue(new Error('Clone failed'));
    await expect(git.applyDiff('owner/repo', 'branch', 'content')).rejects.toThrow();
  });

  test('applies diff and commits changes', async () => {
    mockOctokit.git.getRef.mockResolvedValue({ data: { object: { sha: 'sha' } } });
    mockSimpleGit.clone.mockResolvedValue('');
    mockSimpleGit.checkout.mockResolvedValue('');
    mockSimpleGit.add.mockResolvedValue('');
    mockSimpleGit.commit.mockResolvedValue({} as CommitResult);
    mockSimpleGit.push.mockResolvedValue({} as PushResult);

    await git.applyDiff('owner/repo', 'branch', 'diff content');

    expect(mockSimpleGit.add).toHaveBeenCalled();
    expect(mockSimpleGit.commit).toHaveBeenCalled();
    expect(mockSimpleGit.push).toHaveBeenCalled();
  });

  test('creates branch from base', async () => {
    mockOctokit.git.getRef.mockResolvedValue({ data: { object: { sha: 'sha' } } });
    mockSimpleGit.checkout.mockResolvedValue('');
    mockSimpleGit.checkoutLocalBranch.mockResolvedValue(undefined);

    await git.createBranch('owner/repo', 'new-branch', 'main');

    expect(mockSimpleGit.checkout).toHaveBeenCalledWith('sha');
    expect(mockSimpleGit.checkoutLocalBranch).toHaveBeenCalledWith('new-branch');
  });

  test('handles branch creation error', async () => {
    mockOctokit.git.getRef.mockRejectedValue(new Error('Not found'));
    await expect(git.createBranch('owner/repo', 'new-branch', 'main')).rejects.toThrow();
  });

  test('gets diff between branches', async () => {
    mockSimpleGit.diff.mockResolvedValue('diff content');
    const diff = await git.getDiff('branch1', 'branch2');
    expect(diff).toBe('diff content');
  });

  test('handles diff error', async () => {
    mockSimpleGit.diff.mockRejectedValue(new Error('Diff failed'));
    await expect(git.getDiff('branch1', 'branch2')).rejects.toThrow();
  });

  test('commits changes', async () => {
    mockSimpleGit.add.mockResolvedValue('');
    mockSimpleGit.commit.mockResolvedValue({} as CommitResult);
    mockSimpleGit.push.mockResolvedValue({} as PushResult);

    await git.commit('test commit');

    expect(mockSimpleGit.add).toHaveBeenCalledWith('.');
    expect(mockSimpleGit.commit).toHaveBeenCalledWith('test commit');
    expect(mockSimpleGit.push).toHaveBeenCalled();
  });

  describe('file operations', () => {
    test('updates existing file', async () => {
      mockOctokit.repos.get.mockResolvedValue({ data: { default_branch: 'main' } });
      mockOctokit.repos.getContent.mockResolvedValue({
        data: { sha: 'existing-sha' },
      });

      await git.updateFile('owner/repo', 'test.txt', 'content', 'Update', 'branch');

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.objectContaining({
          sha: 'existing-sha',
        })
      );
    });

    test('creates new file when not exists', async () => {
      mockOctokit.repos.get.mockResolvedValue({ data: { default_branch: 'main' } });
      mockOctokit.repos.getContent.mockRejectedValue({ status: 404 });

      await git.updateFile('owner/repo', 'test.txt', 'content', 'Create', 'branch');

      expect(mockOctokit.repos.createOrUpdateFileContents).toHaveBeenCalledWith(
        expect.not.objectContaining({
          sha: expect.any(String),
        })
      );
    });

    test('handles directory path error', async () => {
      mockOctokit.repos.get.mockResolvedValue({ data: { default_branch: 'main' } });
      mockOctokit.repos.getContent.mockResolvedValue({
        data: [], // Array indicates directory
      });

      await expect(
        git.updateFile('owner/repo', 'dir/', 'content', 'Update', 'branch')
      ).rejects.toThrow("Path 'dir/' points to a directory");
    });
  });

  describe('diff operations', () => {
    test('gets local diff for specific files', async () => {
      mockSimpleGit.diff.mockResolvedValue('diff content');
      const diff = await git.getLocalDiff('/path', ['file1.txt', 'file2.txt']);
      expect(mockSimpleGit.diff).toHaveBeenCalledWith(['HEAD', '--', 'file1.txt', 'file2.txt']);
      expect(diff).toBe('diff content');
    });

    test('handles diff apply error', async () => {
      mockSimpleGit.clone.mockResolvedValue('');
      mockSimpleGit.checkout.mockResolvedValue('');
      mockSimpleGit.raw.mockRejectedValue(new Error('Invalid diff'));

      await expect(git.applyDiff('owner/repo', 'branch', 'invalid diff')).rejects.toThrow(
        'Failed to apply diff'
      );
    });

    test('handles branch checkout error in applyDiff', async () => {
      mockSimpleGit.clone.mockResolvedValue('');
      mockSimpleGit.checkout.mockRejectedValue(new Error('Branch not found'));
      mockSimpleGit.checkoutLocalBranch.mockResolvedValue(undefined);

      await git.applyDiff('owner/repo', 'new-branch', 'diff content');

      expect(mockSimpleGit.checkoutLocalBranch).toHaveBeenCalled();
    });
  });
});
