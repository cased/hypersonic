import { MergeStrategy, PRConfig, HypersonicConfig, DEFAULT_PR_CONFIG } from '../../core/config';

describe('PRConfig', () => {
  test('default values', () => {
    const config = DEFAULT_PR_CONFIG;

    expect(config.title).toBe('Automated changes');
    expect(config.description).toBeUndefined();
    expect(config.baseBranch).toBe('main');
    expect(config.draft).toBe(false);
    expect(config.labels).toEqual([]);
    expect(config.reviewers).toEqual([]);
    expect(config.teamReviewers).toEqual([]);
    expect(config.mergeStrategy).toBe(MergeStrategy.SQUASH);
    expect(config.deleteBranchOnMerge).toBe(true);
    expect(config.autoMerge).toBe(false);
  });

  test('custom values', () => {
    const config: PRConfig = {
      title: 'Custom PR',
      description: 'Test description',
      baseBranch: 'develop',
      draft: true,
      labels: ['bug', 'feature'],
      reviewers: ['user1', 'user2'],
      teamReviewers: ['team1'],
      mergeStrategy: MergeStrategy.REBASE,
      deleteBranchOnMerge: false,
      autoMerge: true,
    };

    expect(config.title).toBe('Custom PR');
    expect(config.description).toBe('Test description');
    expect(config.baseBranch).toBe('develop');
    expect(config.draft).toBe(true);
    expect(config.labels).toEqual(['bug', 'feature']);
    expect(config.reviewers).toEqual(['user1', 'user2']);
    expect(config.teamReviewers).toEqual(['team1']);
    expect(config.mergeStrategy).toBe(MergeStrategy.REBASE);
    expect(config.deleteBranchOnMerge).toBe(false);
    expect(config.autoMerge).toBe(true);
  });
});

describe('HypersonicConfig', () => {
  test('minimal configuration', () => {
    const config: HypersonicConfig = {
      githubToken: 'test-token',
      baseUrl: 'https://api.github.com',
      defaultPrConfig: DEFAULT_PR_CONFIG,
    };

    expect(config.githubToken).toBe('test-token');
    expect(config.baseUrl).toBe('https://api.github.com');
    expect(config.appName).toBeUndefined();
    expect(config.defaultPrConfig).toBeDefined();
  });

  test('full configuration', () => {
    const config: HypersonicConfig = {
      githubToken: 'test-token',
      baseUrl: 'https://github.example.com',
      appName: 'test-app',
      defaultPrConfig: {
        ...DEFAULT_PR_CONFIG,
        title: 'Default PR',
        baseBranch: 'develop',
      },
    };

    expect(config.githubToken).toBe('test-token');
    expect(config.baseUrl).toBe('https://github.example.com');
    expect(config.appName).toBe('test-app');
    expect(config.defaultPrConfig.title).toBe('Default PR');
    expect(config.defaultPrConfig.baseBranch).toBe('develop');
  });
});

describe('MergeStrategy', () => {
  test('valid merge strategies', () => {
    expect(MergeStrategy.MERGE).toBe('merge');
    expect(MergeStrategy.SQUASH).toBe('squash');
    expect(MergeStrategy.REBASE).toBe('rebase');
  });
});
