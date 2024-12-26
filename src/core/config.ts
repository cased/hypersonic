export enum MergeStrategy {
  MERGE = 'merge',
  SQUASH = 'squash',
  REBASE = 'rebase',
}

export interface PRConfig {
  title: string;
  description?: string;
  baseBranch: string;
  draft: boolean;
  labels: string[];
  reviewers: string[];
  teamReviewers: string[];
  mergeStrategy: MergeStrategy;
  deleteBranchOnMerge: boolean;
  autoMerge: boolean;
  commitMessage?: string;
}

export interface HypersonicConfig {
  githubToken: string;
  baseUrl: string;
  appName?: string;
  defaultPrConfig: PRConfig;
}

export const DEFAULT_PR_CONFIG: PRConfig = {
  title: 'Automated changes',
  baseBranch: 'main',
  draft: false,
  labels: [],
  reviewers: [],
  teamReviewers: [],
  mergeStrategy: MergeStrategy.SQUASH,
  deleteBranchOnMerge: true,
  autoMerge: false,
  commitMessage: undefined,
};

export const DEFAULT_CONFIG: HypersonicConfig = {
  githubToken: '',
  baseUrl: 'https://api.github.com',
  defaultPrConfig: DEFAULT_PR_CONFIG,
};
