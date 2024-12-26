import { DEFAULT_PR_CONFIG, MergeStrategy } from '../core/config';

describe('DEFAULT_PR_CONFIG', () => {
  test('has all required fields', () => {
    expect(DEFAULT_PR_CONFIG).toEqual(
      expect.objectContaining({
        title: expect.any(String),
        baseBranch: expect.any(String),
        draft: expect.any(Boolean),
        labels: expect.any(Array),
        reviewers: expect.any(Array),
        teamReviewers: expect.any(Array),
        mergeStrategy: expect.any(String),
        deleteBranchOnMerge: expect.any(Boolean),
        autoMerge: expect.any(Boolean),
      })
    );
  });

  test('uses valid merge strategy', () => {
    expect(Object.values(MergeStrategy)).toContain(DEFAULT_PR_CONFIG.mergeStrategy);
  });
});
