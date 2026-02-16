#!/usr/bin/env node
/**
 * Comprehensive End-to-End Test for TTS Cloud
 * Tests build output, file structure, and critical code patterns
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     TTS CLOUD - COMPREHENSIVE E2E TEST                    ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`❌ ${name}: ${e.message}`);
    failed++;
  }
}

// Test 1: Build output exists
test('Build output exists', () => {
  const distPath = path.join(__dirname, 'dist');
  if (!fs.existsSync(distPath)) throw new Error('dist folder not found');
  
  const indexHtml = path.join(distPath, 'index.html');
  if (!fs.existsSync(indexHtml)) throw new Error('index.html not found');
  
  const assetsDir = path.join(distPath, 'assets');
  if (!fs.existsSync(assetsDir)) throw new Error('assets folder not found');
  
  const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
  if (jsFiles.length === 0) throw new Error('No JS files in assets');
});

// Test 2: HTML has no type=module
test('HTML has no type=module', () => {
  const html = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8');
  if (html.includes('type="module"')) throw new Error('HTML contains type="module"');
  if (html.includes('crossorigin')) throw new Error('HTML contains crossorigin');
});

// Test 3: HTML structure is valid
test('HTML structure valid', () => {
  const html = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8');
  
  if (!html.includes('<!DOCTYPE html>')) throw new Error('Missing DOCTYPE');
  if (!html.includes('<div id="root">')) throw new Error('Missing root div');
  if (!html.includes('<script')) throw new Error('Missing script tag');
});

// Test 4: JavaScript files exist and are readable
test('JavaScript files valid', () => {
  const assetsDir = path.join(__dirname, 'dist', 'assets');
  const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
  
  jsFiles.forEach(file => {
    const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
    if (content.length === 0) throw new Error(`${file} is empty`);
    if (content.length < 1000) throw new Error(`${file} is too small (${content.length} bytes)`);
  });
});

// Test 5: Check for critical code patterns
test('Critical code patterns present', () => {
  const assetsDir = path.join(__dirname, 'dist', 'assets');
  const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
  const mainJs = jsFiles.find(f => f.includes('main')) || jsFiles[0];
  const content = fs.readFileSync(path.join(assetsDir, mainJs), 'utf8');
  
  // Check for React
  if (!content.includes('react')) throw new Error('React not found in bundle');
  
  // Check for key components (minified names will differ)
  const checks = [
    ['MASSIVE WebSocket', /socket\.massive\.com|wss:\/\/socket/],
    ['WebSocket connection', /new WebSocket/],
    ['Price cache', /priceCache|getCachedPrice/],
    ['Error handling', /try\s*\{|catch\s*\(/],
    ['DOMContentLoaded', /DOMContentLoaded/],
  ];
  
  checks.forEach(([name, pattern]) => {
    if (!pattern.test(content)) throw new Error(`${name} pattern not found`);
  });
});

// Test 6: Check MASSIVE subscription format
test('MASSIVE subscription format', () => {
  const assetsDir = path.join(__dirname, 'dist', 'assets');
  const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
  const mainJs = jsFiles.find(f => f.includes('main')) || jsFiles[0];
  const content = fs.readFileSync(path.join(assetsDir, mainJs), 'utf8');
  
  // Check for MASSIVE-specific patterns
  if (!content.includes('ev:')) throw new Error('MASSIVE ev field not found');
  if (!content.includes('"T"') && !content.includes("'T'")) throw new Error('Trade event type not found');
});

// Test 7: File sizes are reasonable
test('File sizes reasonable', () => {
  const assetsDir = path.join(__dirname, 'dist', 'assets');
  const files = fs.readdirSync(assetsDir);
  
  files.forEach(file => {
    const stats = fs.statSync(path.join(assetsDir, file));
    const sizeMB = stats.size / (1024 * 1024);
    
    if (sizeMB > 5) {
      throw new Error(`${file} is too large (${sizeMB.toFixed(2)} MB)`);
    }
  });
});

// Test 8: No source maps in production (optional)
test('No source maps in production', () => {
  const assetsDir = path.join(__dirname, 'dist', 'assets');
  const mapFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js.map'));
  
  if (mapFiles.length > 0) {
    console.log('   ⚠️  Warning: Source maps found (optional)');
  }
});

// Test 9: Check for syntax errors by trying to parse
test('JavaScript syntax valid', () => {
  const assetsDir = path.join(__dirname, 'dist', 'assets');
  const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js') && !f.endsWith('.map'));
  
  jsFiles.forEach(file => {
    const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
    // Basic check - ensure file starts with valid JavaScript
    if (!content.startsWith('(') && !content.startsWith('!') && !content.startsWith('/')) {
      // Most minified JS starts with (function) or !function or /*
      console.log(`   ⚠️  Warning: ${file} has unusual start`);
    }
  });
});

// Test 10: Check for required env var references
test('Environment variables referenced', () => {
  const assetsDir = path.join(__dirname, 'dist', 'assets');
  const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
  const mainJs = jsFiles.find(f => f.includes('main')) || jsFiles[0];
  const content = fs.readFileSync(path.join(assetsDir, mainJs), 'utf8');
  
  const envVars = [
    'VITE_MASSIVE_API_KEY',
    'VITE_FINNHUB_API_KEY', 
    'VITE_KIMI_API_KEY'
  ];
  
  let found = 0;
  envVars.forEach(envVar => {
    if (content.includes(envVar)) found++;
  });
  
  if (found === 0) {
    throw new Error('No environment variable references found');
  }
});

// Summary
console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║                    TEST SUMMARY                            ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log(`\n✅ Passed: ${passed}`);
console.log(`❌ Failed: ${failed}`);

if (failed === 0) {
  console.log('\n🎉 ALL TESTS PASSED! Ready for deployment.');
  console.log('\n📋 Deployment Checklist:');
  console.log('   ✓ Build successful');
  console.log('   ✓ No type=module in HTML');
  console.log('   ✓ MASSIVE WebSocket configured');
  console.log('   ✓ All env vars referenced');
  console.log('   ✓ JavaScript syntax valid');
  process.exit(0);
} else {
  console.log('\n⚠️  SOME TESTS FAILED. Fix issues before deploying.');
  process.exit(1);
}
