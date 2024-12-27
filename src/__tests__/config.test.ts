import { 
  Hypersonic, 
  MergeStrategy, 
  HypersonicConfig, 
  PRConfig 
} from '../core';

describe('Hypersonic Configuration', () => {
  const token = 'test-token';
  const repo = 'test/repo';

  describe('Initialization', () => {
    test('initializes with just a token', () => {
      const client = new Hypersonic(token);
      expect(client).toBeInstanceOf(Hypersonic);
    });

    test('initializes with full config', () => {
      const config: HypersonicConfig = {
        githubToken: token,
        defaultPrConfig: {
          title: 'Custom Default',
          baseBranch: 'develop',
          labels: ['automated'],
          reviewers: ['reviewer'],
          teamReviewers: ['team'],
          mergeStrategy: MergeStrategy.REBASE,
          draft: true,
          deleteBranchOnMerge: false,
          autoMerge: true
        }
      };
      const client = new Hypersonic(config);
      expect(client).toBeInstanceOf(Hypersonic);
    });
  });

  describe('PR Configuration Merging', () => {
    let client: Hypersonic;

    beforeEach(() => {
      client = new Hypersonic(token);
    });

    test('uses all defaults when only title provided', async () => {
      const config = { title: 'Test PR' };
      const finalConfig = await client['preparePrConfig'](config);

      expect(finalConfig).toEqual({
        title: 'Test PR',
        baseBranch: 'main',
        draft: false,
        labels: [],
        reviewers: [],
        teamReviewers: [],
        mergeStrategy: MergeStrategy.SQUASH,
        deleteBranchOnMerge: true,
        autoMerge: false,
        commitMessage: undefined,
        description: undefined
      });
    });

    test('instance defaults override built-in defaults', async () => {
      const instanceConfig: HypersonicConfig = {
        githubToken: token,
        defaultPrConfig: {
          title: 'Instance Default',
          baseBranch: 'develop',
          labels: ['automated'],
          reviewers: ['default-reviewer'],
          teamReviewers: [],
          mergeStrategy: MergeStrategy.REBASE,
          draft: true,
          deleteBranchOnMerge: false,
          autoMerge: true
        }
      };
      const clientWithDefaults = new Hypersonic(instanceConfig);
      
      const config = { title: 'Test PR' };
      const finalConfig = await clientWithDefaults['preparePrConfig'](config);

      expect(finalConfig).toEqual({
        title: 'Test PR', // Overrides instance default
        baseBranch: 'develop',
        labels: ['automated'],
        reviewers: ['default-reviewer'],
        teamReviewers: [],
        mergeStrategy: MergeStrategy.REBASE,
        draft: true,
        deleteBranchOnMerge: false,
        autoMerge: true,
        commitMessage: undefined,
        description: undefined
      });
    });

    test('per-request config overrides all defaults', async () => {
      const instanceConfig: HypersonicConfig = {
        githubToken: token,
        defaultPrConfig: {
          title: 'Instance Default',
          baseBranch: 'develop',
          labels: ['automated'],
          reviewers: ['default-reviewer'],
          teamReviewers: [],
          mergeStrategy: MergeStrategy.REBASE,
          draft: true,
          deleteBranchOnMerge: false,
          autoMerge: true
        }
      };
      const clientWithDefaults = new Hypersonic(instanceConfig);
      
      const requestConfig = {
        title: 'Test PR',
        labels: ['urgent'],
        reviewers: [],
        draft: false
      };
      const finalConfig = await clientWithDefaults['preparePrConfig'](requestConfig);

      expect(finalConfig).toEqual({
        title: 'Test PR',
        baseBranch: 'develop',
        labels: ['urgent'],  // Overrides instance default
        reviewers: [],      // Overrides instance default
        teamReviewers: [],
        mergeStrategy: MergeStrategy.REBASE,
        draft: false,       // Overrides instance default
        deleteBranchOnMerge: false,
        autoMerge: true,
        commitMessage: undefined,
        description: undefined
      });
    });

    test('handles partial configurations correctly', async () => {
      const partialConfig = {
        title: 'Partial Config',
        labels: ['test'],
        // All other fields omitted
      };
      const finalConfig = await client['preparePrConfig'](partialConfig);

      expect(finalConfig.title).toBe('Partial Config');
      expect(finalConfig.labels).toEqual(['test']);
      expect(finalConfig.baseBranch).toBe('main');  // Default
      expect(finalConfig.draft).toBe(false);        // Default
      expect(finalConfig.reviewers).toEqual([]);    // Default
      expect(finalConfig.mergeStrategy).toBe(MergeStrategy.SQUASH); // Default
    });
  });
});
