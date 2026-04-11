#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('\x1b[36m%s\x1b[0m', '📦 Building React app...');

try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('\x1b[32m%s\x1b[0m', '✓ Build completed successfully!');
} catch (error) {
  console.error('\x1b[31m%s\x1b[0m', '✗ Build failed!');
  process.exit(1);
}

console.log('\x1b[36m%s\x1b[0m', '\n📋 Copying build to docs folder...');

// Remove old docs folder if exists
const docsPath = path.join(__dirname, 'docs');
if (fs.existsSync(docsPath)) {
  console.log('\x1b[33m%s\x1b[0m', 'Removing old docs folder...');
  fs.rmSync(docsPath, { recursive: true, force: true });
}

// Copy build to docs
const buildPath = path.join(__dirname, 'build');
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const files = fs.readdirSync(src);
  files.forEach(file => {
    const srcFile = path.join(src, file);
    const destFile = path.join(dest, file);
    if (fs.statSync(srcFile).isDirectory()) {
      copyDir(srcFile, destFile);
    } else {
      fs.copyFileSync(srcFile, destFile);
    }
  });
}

copyDir(buildPath, docsPath);
console.log('\x1b[32m%s\x1b[0m', '✓ Copied build to docs/');

// Create .nojekyll file
fs.writeFileSync(path.join(docsPath, '.nojekyll'), '');
console.log('\x1b[32m%s\x1b[0m', '✓ Created docs/.nojekyll');

console.log('\x1b[32m%s\x1b[0m', '\n✓ Build and deployment complete!');
console.log('\x1b[36m%s\x1b[0m', 'Commit and push docs/ to deploy on GitHub Pages (main branch, /docs)');
