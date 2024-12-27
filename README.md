# Hypersonic

Streamlined GitHub PR automation for modern applications in Typescript. 
Supersonic is a high-level API for creating and managing Pull Requests, 
designed specifically for AI and SaaS applications that need to propose 
changes to user repositories.


## Features

- 🚀 Simple, High-Level API: Create PRs with a single function call
- 🛡️ Safe Defaults: All changes go through PRs for review
- 🏢 Enterprise Ready: Full GitHub Enterprise support
- ⚙️ Excessively Customizable: Complete control over PR creation
- 📦 Multiple File Support: Update any number of files in one PR
- 🎯 Perfect for Apps & Scripts: From SaaS features to internal tools
- 🤖 Automation Ready: Auto-merge, labels, reviewers, and more

Common use cases:

- AI applications and agents suggesting code improvements
- Documentation generators keeping docs in sync with code
- Configuration management tools proposing config updates
- Any service that needs to propose changes to user repositories


## Installation

```bash
npm install @runcased/hypersonic
```

## Quick Start

```typescript
import { Hypersonic } from '@runcased/hypersonic';

const hypersonic = new Hypersonic('your-github-token');

// Create a PR from a local file
await hypersonic.createPrFromFile(
  'owner/repo',
  'local/path.txt',
  'remote/path.txt',
  {
    title: 'Update documentation',
    description: 'Updated API docs with new endpoints',
    labels: ['documentation'],
    reviewers: ['teammate']
  }
);
```

## Usage

### Initialize

```typescript
import { Hypersonic, MergeStrategy } from '@runcased/hypersonic';

// Initialize with just a token
const hypersonic = new Hypersonic('your-github-token');

// Or with full configuration
const hypersonic = new Hypersonic({
  githubToken: 'your-github-token',
  baseUrl: 'https://api.github.com', // Optional, useful for GitHub Enterprise
  defaultPrConfig: {
    title: 'Update files',
    description: 'Automated update',
    baseBranch: 'main',
    draft: false,
    labels: ['automated'],
    reviewers: ['teammate'],
    teamReviewers: ['team-name'],
    mergeStrategy: MergeStrategy.SQUASH, // Or simply 'squash'
    deleteBranchOnMerge: true,
    autoMerge: true
  }
});
```

### Create PRs

Each PR creation method is designed for different use cases:

#### 1. Single File from Content

Create or update a single file using a content string:

```typescript
await hypersonic.createPrFromContent(
  'owner/repo',      // Repository in format "owner/repo"
  'file content',    // The actual content to write
  'path/to/file.txt' // Path where file will be created/updated in the repo
  {                  // Optional config
    title: 'Add new documentation',
    description: 'Added API documentation for new endpoints',
    baseBranch: 'develop',
    labels: ['documentation'],
    reviewers: ['teammate1', 'teammate2'],
    teamReviewers: ['api-team'],
    mergeStrategy: 'squash',
    autoMerge: true
  }
);
```

**Use Cases:**
- Adding documentation files
- Updating configuration files
- Creating new source files
- Programmatically generating content

#### 2. Single File from Local System

Upload or update a file from your local filesystem:

```typescript
await hypersonic.createPrFromFile(
  'owner/repo',        // Repository in format "owner/repo"
  'local/path.txt',    // Path to file on your local system
  'remote/path.txt',   // Path where file will be placed in the repo
  {                    // Optional config
    title: 'Update configuration',
    commitMessage: 'chore: update config file',
    labels: ['config'],
    draft: true
  }
);
```

**Use Cases:**
- Uploading built/compiled files
- Syncing local changes to remote
- Updating files from CI/CD pipelines
- Working with local development files

#### 3. Multiple Files from Content

Update multiple files using content strings. You're passing in an object 
where the keys are the target paths and the values are the content strings.

```typescript
await hypersonic.createPrFromMultipleContents(
  'owner/repo',    // Repository in format "owner/repo"
  {               // Object mapping paths to content
    'config/settings.json': '{"new setting": "new value"}',
    'docs/README.md': '# Updated Docs',
    'src/index.ts': 'export const version = "2.0.0";'
  },
  {               // Optional config
    title: 'Update multiple files',
    description: 'Batch update of configuration and documentation',
    baseBranch: 'main',
    reviewers: ['tech-lead'],
    teamReviewers: ['platform-team']
  }
);
```

**Use Cases:**
- Updating version numbers across multiple files
- Making coordinated changes to related files
- Bulk content updates from external sources
- API-driven file updates

#### 4. Multiple Files from Local System

Upload multiple files from your local filesystem. You're passing in an object 
where the keys are the local paths and the values are the remote paths.

```typescript
await hypersonic.createPrFromFiles(
  'owner/repo',   // Repository in format "owner/repo"
  {              // Object mapping local paths to remote paths
    'local/dist/bundle.js': 'dist/bundle.js',
    'local/dist/styles.css': 'dist/styles.css',
    'local/README.md': 'README.md'
  },
  {              // Optional config
    title: 'Deploy latest build',
    description: 'Update production bundle and documentation',
    labels: ['deploy', 'production'],
    autoMerge: true,
    mergeStrategy: MergeStrategy.SQUASH
  }
);
```

**Use Cases:**
- Deploying build artifacts
- Syncing multiple local changes
- Updating sets of related files
- Batch file migrations

All methods accept the same configuration options:

```typescript
interface PRConfig {
  // Required
  title: string;           // PR title
  
  // Optional
  description?: string;    // PR description/body
  baseBranch: string;     // Target branch (default: 'main')
  draft: boolean;         // Create as draft PR
  labels: string[];       // Labels to add
  reviewers: string[];    // Individual reviewers
  teamReviewers: string[]; // Team reviewers
  mergeStrategy: MergeStrategy | 'merge' | 'squash' | 'rebase';
  deleteBranchOnMerge: boolean; // Delete branch after merge
  autoMerge: boolean;     // Enable auto-merge
  commitMessage?: string; // Custom commit message
}
```

### PR Configuration

All PR creation methods accept an optional config object:

```typescript
interface PRConfig {
  title: string;
  description?: string;
  baseBranch: string;
  draft: boolean;
  labels: string[];
  reviewers: string[];
  teamReviewers: string[];
  mergeStrategy: MergeStrategy | 'merge' | 'squash' | 'rebase';
  deleteBranchOnMerge: boolean;
  autoMerge: boolean;
  commitMessage?: string;
}
```

Example with config:

```typescript
await hypersonic.createPrFromContent(
  'owner/repo',
  'content',
  'file.txt',
  {
    title: 'Update API docs',
    description: 'Updated endpoint documentation',
    labels: ['documentation'],
    reviewers: ['teammate'],
    mergeStrategy: 'squash', // Can use string literal or MergeStrategy.SQUASH
    autoMerge: true
  }
);
```

### Configuration Precedence

Hypersonic merges configuration in the following order (later sources override earlier ones):

1. Default configuration (built-in defaults)
2. Instance configuration (passed to constructor)
3. Per-request configuration (passed to individual methods)

```typescript
// 1. Built-in defaults
const DEFAULT_PR_CONFIG = {
  title: 'Automated changes',
  baseBranch: 'main',
  draft: false,
  labels: [],
  reviewers: [],
  teamReviewers: [],
  mergeStrategy: MergeStrategy.SQUASH,
  deleteBranchOnMerge: true,
  autoMerge: false
};

// 2. Instance configuration
const hypersonic = new Hypersonic({
  githubToken: 'token',
  defaultPrConfig: {
    labels: ['automated'],
    reviewers: ['default-reviewer'],
    mergeStrategy: 'rebase'
  }
});

// 3. Per-request configuration
await hypersonic.createPrFromContent(
  'owner/repo',
  'content',
  'file.txt',
  {
    title: 'Custom PR',      // Overrides default title
    labels: ['urgent'],      // Replaces ['automated']
    reviewers: [],           // Removes default reviewer
    // mergeStrategy inherits 'rebase' from instance config
    // Other fields use built-in defaults
  }
);
```

### Git Operations

```typescript
// Apply a diff to create/update files
await hypersonic.applyDiff(
  'owner/repo',
  'feature-branch',
  diffContent
);

// Get diff from local changes
const diff = await hypersonic.getLocalDiff(
  '/path/to/repo',
  ['file1.txt', 'file2.txt'] // Optional file paths
);
```

## Advanced Usage

### Custom GitHub Enterprise

```typescript
const hypersonic = new Hypersonic({
  githubToken: 'your-token',
  baseUrl: 'https://github.your-company.com/api/v3'
});
```

### PR Templates

```typescript
const defaultConfig = {
  title: 'Update: ${filename}',
  description: 'Updated ${path} with latest changes',
  labels: ['automated'],
  reviewers: ['teammate'],
  teamReviewers: ['team-name'],
  mergeStrategy: 'squash',
  autoMerge: true
};

const hypersonic = new Hypersonic({
  githubToken: 'your-token',
  defaultPrConfig: defaultConfig
});
```

## Error Handling

```typescript
import { GitHubError, GitError } from '@runcased/hypersonic';

try {
  await hypersonic.createPrFromFile(...);
} catch (error) {
  if (error instanceof GitHubError) {
    // Handle GitHub API errors
    console.log(error.status); // HTTP status if available
  } else if (error instanceof GitError) {
    // Handle Git operation errors
  }
}
```

## Contributing

Contributions welcome! Please read our [contributing guidelines](CONTRIBUTING.md) first.

## License

MIT
