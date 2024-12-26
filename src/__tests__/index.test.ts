import { Hypersonic, HypersonicConfig, PRConfig, MergeStrategy, GitHubError } from '../index';

describe('index exports', () => {
  test('exports Hypersonic class', () => {
    const hypersonic = new Hypersonic('test-token');
    expect(hypersonic).toBeInstanceOf(Hypersonic);
  });

  test('exports MergeStrategy enum', () => {
    expect(MergeStrategy.MERGE).toBe('merge');
    expect(MergeStrategy.SQUASH).toBe('squash');
    expect(MergeStrategy.REBASE).toBe('rebase');
  });

  test('exports GitHubError', () => {
    const error = new GitHubError('test error');
    expect(error).toBeInstanceOf(GitHubError);
    expect(error.message).toBe('test error');
  });

  test('accepts HypersonicConfig', () => {
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

    const hypersonic = new Hypersonic(config);
    expect(hypersonic).toBeInstanceOf(Hypersonic);
  });

  test('accepts PRConfig', () => {
    const prConfig: PRConfig = {
      title: 'Test PR',
      baseBranch: 'main',
      draft: false,
      labels: ['test'],
      reviewers: ['user1'],
      teamReviewers: ['team1'],
      mergeStrategy: MergeStrategy.MERGE,
      deleteBranchOnMerge: true,
      autoMerge: true,
    };

    // Verify the type is correct
    expect(prConfig.title).toBe('Test PR');
    expect(prConfig.mergeStrategy).toBe(MergeStrategy.MERGE);
  });
});
