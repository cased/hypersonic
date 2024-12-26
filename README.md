# Hypersonic

Streamlined GitHub PR automation for modern TypeScript applications. Hypersonic is a high-level API for creating and managing Pull Requests, designed specifically for AI and SaaS applications that need to propose changes to user repositories.

## Table of Contents

- [Why Hypersonic?](#why-hypersonic)
- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
  - [Basic Usage](#basic-usage)
  - [Working with Files and Content](#working-with-files-and-content)
    - [1. Single File Updates (`createPrFromFile`)](#1-single-file-updates)
    - [2. Single Content Updates (`createPrFromContent`)](#2-single-content-updates)
    - [3. Multiple Content Updates (`createPrFromMultipleContents`)](#3-multiple-content-updates)
    - [4. Multiple File Updates (`createPrFromFiles`)](#4-multiple-file-updates)
  - [Common Options](#common-options)
- [Pull Request Configuration](#pull-request-configuration)
  - [Basic Usage](#basic-usage-1)
  - [Using PRConfig](#using-prconfig)
  - [Enterprise Usage](#enterprise-usage)
- [Configuration](#configuration)
  - [Full Configuration Options](#full-configuration-options)
- [Use Cases](#use-cases)
  - [AI-Powered Code Improvements](#ai-powered-code-improvements)
  - [Automated Documentation Updates](#automated-documentation-updates)
  - [Configuration Management](#configuration-management)
- [Development](#development)
  - [Setup](#setup)
  - [Testing](#testing)
- [License](#license)

## Why Hypersonic?

Modern AI and SaaS applications often need to propose changes to user repositories—whether it's AI-suggested improvements, automated documentation updates, or configuration changes. However, creating Pull Requests programmatically through the GitHub API can be complex and error-prone.

Hypersonic solves this:

- **Simple, High-Level API**: Create PRs with a single function call, using files or plain text content
- **Safe Defaults**: All changes are created as PRs, allowing users to review before merging
- **Enterprise Ready**: Full support for GitHub Enterprise and custom base URLs
- **Fully Typed**: Written in TypeScript with complete type definitions
- **Excessively customizable**: Full control over PR creation, set draft mode, reviewers, labels, etc.
- **Best for apps, useful for scripts too**: Plug it into your SaaS app and delight your users. Or automate internal workflows.

## Installation

```bash
# Using npm
npm install @runcased/hypersonic

# Using yarn
yarn add @runcased/hypersonic

# Using pnpm
pnpm add @runcased/hypersonic
```

## Quick Start

### Basic Usage

```typescript
import { Hypersonic } from '@runcased/hypersonic';

const hypersonic = new Hypersonic('your-github-token');

// Create a PR to update a file
const prUrl = await hypersonic.createPrFromContent(
  'user/repo',
  'console.log("hello world")',
  'src/hello.ts'
);

console.log(`Created PR: ${prUrl}`);
```

### Working with Files and Content

#### 1. Single File Updates

When you have a local file that you want to propose as a change:

```typescript
const prUrl = await hypersonic.createPrFromFile(
  'user/repo',
  'local/config.json',  // Path to your local file
  'config/settings.json',  // Where it should go in the repo
  {
    title: 'Update configuration',
    baseBranch: 'develop'
  }
);
```

#### 2. Single Content Updates

When you have content in memory that you want to propose as a change:

```typescript
const prUrl = await hypersonic.createPrFromContent(
  'user/repo',
  'console.log("hello")',  // The actual content
  'src/hello.ts',  // Where to put it in the repo
  {
    title: 'Add hello script',
    description: 'Adds a simple hello world script',
    draft: false,
    labels: ['enhancement'],
    reviewers: ['username']
  }
);
```

#### 3. Multiple Content Updates

```typescript
const prUrl = await hypersonic.createPrFromMultipleContents(
  'user/repo',
  {
    'config/settings.json': '{"debug": true}',
    'README.md': '# Updated Docs\n\nNew content here'
  },
  {
    title: 'Update configuration and docs',
    description: `
      This PR includes two changes:
      1. Updated debug settings
      2. Refreshed documentation
    `,
    labels: ['config', 'docs'],
    reviewers: ['your-tech-lead', 'somebody-else']
  }
);
```

#### 4. Multiple File Updates

```typescript
const prUrl = await hypersonic.createPrFromFiles(
  'user/repo',
  {
    'local/config.json': 'config/settings.json',
    'local/README.md': 'docs/README.md'
  },
  {
    title: 'Update configs and docs',
    labels: ['configuration', 'documentation']
  }
);
```

### Common Options

All PR creation methods accept these common options via `PRConfig`:
```typescript
interface PRConfig {
  title?: string;
  description?: string;
  baseBranch?: string;
  draft?: boolean;
  labels?: string[];
  reviewers?: string[];
  teamReviewers?: string[];
  mergeStrategy?: 'merge' | 'squash' | 'rebase';
  deleteBranchOnMerge?: boolean;
  autoMerge?: boolean;
}
```

## Pull Request Configuration

### Using PRConfig

```typescript
import { Hypersonic, PRConfig } from 'hypersonic';

const config: PRConfig = {
  title: 'Update configuration',
  description: `
    This PR updates the configuration file with new settings.
    
    Changes:
    - Updated API endpoints
    - Added new feature flags
  `,
  baseBranch: 'main',
  draft: false,
  labels: ['automated'],
  reviewers: ['user1', 'user2'],
  teamReviewers: ['team1'],
  mergeStrategy: 'squash',
  deleteBranchOnMerge: true,
  autoMerge: false
};

const hypersonic = new Hypersonic('your-github-token');
const prUrl = await hypersonic.createPrFromMultipleContents(
  'user/repo',
  { 'config.json': newConfigContent },
  config
);
```

### Enterprise Usage

```typescript
const hypersonic = new Hypersonic({
  githubToken: 'your-token',
  baseUrl: 'https://github.your-company.com/api/v3',
  appName: 'your-tool',
  defaultPrConfig: {
    baseBranch: 'main',
    draft: false,
    labels: ['automated'],
    mergeStrategy: 'squash',
    deleteBranchOnMerge: true
  }
});
```

## Configuration

### Full Configuration Options

## Use Cases

### AI-Powered Code Improvements

Perfect for AI applications that suggest code improvements:

```typescript
import { Hypersonic } from 'hypersonic';

async function handleImprovementRequest(
  repo: string, 
  filePath: string, 
  userPrompt: string
): Promise<string> {
  // Your AI logic to generate improvements
  const improvedCode = await ai.improveCode(userPrompt);
  
  const hypersonic = new Hypersonic('your-github-token');
  const prUrl = await hypersonic.createPrFromContent(
    repo,
    improvedCode,
    filePath,
    {
      title: `AI: ${userPrompt.slice(0, 50)}...`,
      description: `
        AI-suggested improvements based on code analysis.
        Please review the changes carefully.
      `,
      draft: true,  // Let users review AI changes
      labels: ['ai-improvement'],
      reviewers: ['tech-lead']
    }
  );
  return prUrl;
}
```

### Automated Documentation Updates

Keep documentation in sync with code changes:

```typescript
import { Hypersonic } from 'hypersonic';
import type { APIChanges } from './types';

async function updateApiDocs(
  repo: string, 
  apiChanges: APIChanges
): Promise<string> {
  // Generate updated docs
  const docs = {
    'docs/api/endpoints.md': await generateEndpointDocs(apiChanges),
    'docs/api/types.md': await generateTypeDocs(apiChanges),
    'README.md': await updateQuickstart(apiChanges)
  };
  
  const hypersonic = new Hypersonic('your-github-token');
  const prUrl = await hypersonic.createPrFromMultipleContents(
    repo,
    docs,
    {
      title: 'Update API documentation',
      description: `
        # API Documentation Updates
        
        Automatically generated documentation updates based on API changes.
      `,
      labels: ['documentation'],
      reviewers: ['docs-team'],
      teamReviewers: ['api-team']
    }
  );
  return prUrl;
}
```

### Configuration Management

Manage customer configurations through PRs:

```typescript
import { Hypersonic } from 'hypersonic';

async function updateCustomerConfig(
  customerId: string, 
  newSettings: Record<string, unknown>
): Promise<string> {
  const repo = `customers/${customerId}/config`;
  const configJson = JSON.stringify(newSettings, null, 2);
  
  const hypersonic = new Hypersonic('your-github-token');
  const prUrl = await hypersonic.createPrFromContent(
    repo,
    configJson,
    'settings.json',
    {
      title: 'Update customer configuration',
      description: `
        Configuration updates for customer ${customerId}
        
        Changes:
        ${formatChanges(newSettings)}
      `,
      reviewers: [`@${customerId}-admin`],  // Auto-assign customer admin
      labels: ['config-change'],
      autoMerge: true,  // Enable auto-merge if tests pass
      mergeStrategy: 'squash'
    }
  );
  return prUrl;
}
```

## Development

### Setup

```bash
# Clone repository
git clone https://github.com/cased/hypersonic
cd hypersonic

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

### Testing

We use Jest for testing. The test suite includes:
- Unit tests for core functionality
- Integration tests with GitHub API mocking
- Coverage reporting

```bash
# Run tests with coverage
npm run test:coverage

# Run tests in watch mode during development
npm run test:watch
```

### CI/CD

We use GitHub Actions for continuous integration. 

See [.github/workflows/ci.yml](.github/workflows/ci.yml) for details.

### Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## See also 

`hypersonic` is based on Cased's [supersonic](https://github.com/cased/supersonic), and rewritten in TypeScript.
