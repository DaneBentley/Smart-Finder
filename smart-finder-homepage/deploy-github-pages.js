#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const basePath = '/Smart-Finder';
const outDir = './out';

function fixPaths(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  // Fix asset paths
  const updatedContent = content
    .replace(/src="\/logo\.png"/g, `src="${basePath}/logo.png"`)
    .replace(/href="\/logo\.png"/g, `href="${basePath}/logo.png"`)
    .replace(/src="\/_next\//g, `src="${basePath}/_next/`)
    .replace(/href="\/_next\//g, `href="${basePath}/_next/`)
    .replace(/"\/Smart-Finder\/_next\//g, `"${basePath}/_next/`)
    .replace(/"\/_next\//g, `"${basePath}/_next/`);
  
  fs.writeFileSync(filePath, updatedContent);
}

// Fix HTML files
function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.html')) {
      console.log(`Fixing paths in: ${filePath}`);
      fixPaths(filePath);
    }
  });
}

console.log('Fixing paths for GitHub Pages deployment...');
processDirectory(outDir);
console.log('Done!'); 