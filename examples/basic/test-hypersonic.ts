import { Hypersonic, MergeStrategy } from '@runcased/hypersonic';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

const token = process.env.HYPERSONIC_GITHUB_TOKEN || '';
if (!token) {
  console.error('❌ Please set HYPERSONIC_GITHUB_TOKEN environment variable');
  process.exit(1);
}

const repo = process.argv[2];
if (!repo) {
  console.error('❌ Please provide a repository (e.g. "org/repo")');
  process.exit(1);
}

async function main() {
  // Original examples with basic client
  const basic = new Hypersonic(token);

  try {
    // 1. Single file from content
    const contentPrUrl = await basic.createPrFromContent(
      repo,
      'Hello from Hypersonic!',
      'docs/hello.md',
      {
        title: 'Add hello doc',
        description: 'Testing single file content creation',
        labels: ['documentation']
      }
    );
    console.log('Created PR from content:', contentPrUrl);

    // 2. Single file from local filesystem
    const localFile = join(__dirname, 'test.txt');
    await writeFile(localFile, 'Local file content');
    
    const filePrUrl = await basic.createPrFromFile(
      repo,
      localFile,
      'test/test.txt',
      {
        title: 'Add test file',
        description: 'Testing local file upload'
      }
    );
    console.log('Created PR from file:', filePrUrl);

    // 3. Multiple files from content
    const multiContentPrUrl = await basic.createPrFromMultipleContents(
      repo,
      {
        'config/settings.json': JSON.stringify({ setting: 'value' }, null, 2),
        'docs/README.md': '# Test Project\nCreated by Hypersonic',
        'src/version.ts': 'export const VERSION = "1.0.0";'
      },
      {
        title: 'Add multiple configuration files',
        description: 'Setting up project configuration'
      }
    );
    console.log('Created PR from multiple contents:', multiContentPrUrl);

    // 4. Multiple files from local filesystem
    const testDir = join(__dirname, 'test-files');
    await mkdir(testDir, { recursive: true });
    await writeFile(join(testDir, 'file1.txt'), 'Content 1');
    await writeFile(join(testDir, 'file2.txt'), 'Content 2');

    const multiFilePrUrl = await basic.createPrFromFiles(
      repo,
      {
        [join(testDir, 'file1.txt')]: 'test/file1.txt',
        [join(testDir, 'file2.txt')]: 'test/file2.txt'
      },
      {
        title: 'Add multiple test files',
        description: 'Testing multiple file uploads',
        labels: ['testing']
      }
    );
    console.log('Created PR from multiple files:', multiFilePrUrl);

    // New examples with configured client
    const withDefaults = new Hypersonic({
      githubToken: token,
      defaultPrConfig: {
        title: 'Automated Update',
        labels: ['automated'],
        mergeStrategy: MergeStrategy.SQUASH,
        autoMerge: true
      }
    });

    // 5. Minimal PR config (uses instance defaults)
    const pr5 = await withDefaults.createPrFromContent(
      repo,
      'Updated content',
      'docs/README.md',
      {
        title: 'Update documentation'  // Only override title
      }
    );
    console.log('Created PR with minimal config:', pr5);

    // 6. Override some defaults
    const pr6 = await withDefaults.createPrFromContent(
      repo,
      'New feature code',
      'src/feature.ts',
      {
        title: 'Add new feature',
        labels: ['feature'],      // Override default labels
        autoMerge: false         // Disable auto-merge for this PR
      }
    );
    console.log('Created PR with overridden defaults:', pr6);

    // 7. Full custom config
    const pr7 = await withDefaults.createPrFromContent(
      repo,
      'Configuration update',
      'config.json',
      {
        title: 'Update configuration',
        description: 'Update service configuration with new defaults',
        baseBranch: 'develop',
        draft: false,
        labels: ['config', 'urgent'],
        mergeStrategy: 'rebase',
        deleteBranchOnMerge: true,
        autoMerge: true,
        commitMessage: 'chore: update service configuration'
      }
    );
    console.log('Created PR with full custom config:', pr7);

    // 8. Multiple files with configured client
    const pr8 = await withDefaults.createPrFromMultipleContents(
      repo,
      {
        'config/app.json': JSON.stringify({ version: '2.0.0' }),
        'README.md': '# Updated Documentation',
        'CHANGELOG.md': '## 2.0.0\n- Major update'
      },
      {
        title: 'Version 2.0.0 Release',
        labels: ['release'],      // Override default labels
        autoMerge: false         // Disable auto-merge for this release
      }
    );
    console.log('Created PR for release:', pr8);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main().catch(console.error); 
