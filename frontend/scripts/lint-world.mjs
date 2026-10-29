import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const worldDir = path.resolve(__dirname, '../src/world');

let errors = [];

function walk(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git' && file !== 'fixtures') {
        walk(filePath, fileList);
      }
    } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
      fileList.push(filePath);
    }
  }
  return fileList;
}

const allFiles = walk(worldDir);

// Rule 1: No Math.random anywhere under src/world
for (const file of allFiles) {
  const rel = path.relative(worldDir, file);
  const content = fs.readFileSync(file, 'utf8');
  if (content.includes('Math.random')) {
    errors.push(`Rule 1 violation: Math.random found in src/world/${rel}`);
  }
}

// Rule 2: BoxGeometry only allowed in src/world/parts/primitives/
for (const file of allFiles) {
  const rel = path.relative(worldDir, file);
  const normalized = rel.replace(/\\/g, '/');
  if (!normalized.startsWith('parts/primitives/')) {
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('BoxGeometry')) {
      errors.push(`Rule 2 violation: BoxGeometry found outside primitives in src/world/${rel}`);
    }
  }
}

if (errors.length > 0) {
  console.error('\n❌ World Lint Failed with errors:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
} else {
  console.log('✅ World Lint Passed: no BoxGeometry outside primitives, no Math.random.');
}
