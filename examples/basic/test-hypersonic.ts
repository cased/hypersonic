import { Hypersonic, MergeStrategy } from '@runcased/hypersonic';

async function main() {
  // Initialize with your token
  const hypersonic = new Hypersonic(process.env.GITHUB_TOKEN!);
  const repo = process.argv[2];

  if (!repo) {
    console.error('❌ Please provide a repository (e.g. "org/repo")');
    process.exit(1);
  }

  if (!repo.includes('/')) {
    console.error('❌ Repository must be in format "org/repo"');
    process.exit(1);
  }

  try {
    // 1. Update README with current timestamp
    const timestamp = new Date().toISOString();
    const readmeContent = `# Test Sonic
    
This repository is used for testing the hypersonic GitHub PR automation library.
Last updated: ${timestamp}

## What is this?

This is an automated PR created by hypersonic to demonstrate its features:
- Single file updates
- Multiple file updates
- PR customization
`;

    // 2. Create a new feature file
    const featureContent = `
// This is a sample feature
export function greet(name: string) {
  return \`Hello, \${name}! The time is \${new Date().toLocaleTimeString()}\`;
}
`;

    // 3. Create PR with multiple changes
    const prUrl = await hypersonic.createPrFromMultipleContents(
      repo,
      {
        'README.md': readmeContent,
        'src/feature.ts': featureContent,
      },
      {
        title: 'Update documentation and add greeting feature',
        description: `This PR demonstrates hypersonic's capabilities:
        
1. Updates README.md with current timestamp
2. Creates a new feature file
        
This PR was automatically created using hypersonic.`,
        labels: ['demo', 'automated'],
        draft: false,
        autoMerge: true,
        mergeStrategy: MergeStrategy.SQUASH,
        commitMessage: 'Update repository files'
      }
    );

    console.log(`✨ Created PR: ${prUrl}`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  if (!process.env.GITHUB_TOKEN) {
    console.error('❌ Please set GITHUB_TOKEN environment variable');
    process.exit(1);
  }
  
  main().catch(console.error);
} 