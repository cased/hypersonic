import { Hypersonic, MergeStrategy } from '@runcased/hypersonic';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function main() {
  const hypersonic = new Hypersonic(process.env.GITHUB_TOKEN || '');

  const repo = process.argv[2] || 'tnm/test-sonic';

  try {
    // 1. Single file from content
    const contentPrUrl = await hypersonic.createPrFromContent(
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
    
    const filePrUrl = await hypersonic.createPrFromFile(
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
    const multiContentPrUrl = await hypersonic.createPrFromMultipleContents(
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

    const multiFilePrUrl = await hypersonic.createPrFromFiles(
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

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main(); 