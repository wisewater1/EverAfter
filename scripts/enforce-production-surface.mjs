import fs from 'node:fs';
import path from 'node:path';

const projectRoot = process.cwd();
const targets = ['src', path.join('backend', 'app'), 'server', 'package.json'];
const bannedPatterns = [
  { label: 'demo-auth', regex: /demo-auth/i },
  { label: 'demo-storage', regex: /demo-storage/i },
  { label: 'demo-user-001', regex: /demo-user-001/i },
  { label: 'mock-oauth', regex: /#mock-oauth/i },
  { label: 'coming soon', regex: /\bcoming soon\b/i },
];

function walk(entryPath) {
  const absolutePath = path.join(projectRoot, entryPath);
  const stat = fs.statSync(absolutePath);
  if (stat.isFile()) {
    if (entryPath.endsWith('.pyc')) {
      return [];
    }
    return [entryPath];
  }

  const results = [];
  for (const child of fs.readdirSync(absolutePath, { withFileTypes: true })) {
    if (child.name === '__pycache__') {
      continue;
    }
    const childPath = path.join(entryPath, child.name);
    if (child.isDirectory()) {
      results.push(...walk(childPath));
      continue;
    }
    results.push(childPath);
  }
  return results;
}

const files = targets.flatMap((target) => walk(target));
const failures = [];

for (const relativePath of files) {
  const absolutePath = path.join(projectRoot, relativePath);
  const source = fs.readFileSync(absolutePath, 'utf8');

  for (const { label, regex } of bannedPatterns) {
    if (!regex.test(source)) {
      continue;
    }
    failures.push(`${relativePath}: found ${label}`);
  }
}

if (failures.length > 0) {
  console.error('Production surface guard failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Production surface guard passed.');
