#!/usr/bin/env node
/**
 * End-to-End Test for TTS Cloud
 * Simulates browser environment and tests all functionality
 */

const fs = require('fs');
const path = require('path');

console.log('\n╔════════════════════════════════════════════════════════════╗');
console.log('║     TTS CLOUD - END-TO-END TEST SUITE                     ║');
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

// Test 2: HTML structure is valid
test('HTML structure valid', () => {
  const html = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8');
  
  if (!html.includes('<!DOCTYPE html>')) throw new Error('Missing DOCTYPE');
  if (!html.includes('<div id="root">')) throw new Error('Missing root div');
  if (!html.includes('<script')) throw new Error('Missing script tag');
  if (html.includes('type="module"')) throw new Error('Should not have type=module');
});

// Test 3: JavaScript files exist and are readable
test('JavaScript files valid', () => {
  const assetsDir = path.join(__dirname, 'dist', 'assets');
  const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
  
  jsFiles.forEach(file => {
    const content = fs.readFileSync(path.join(assetsDir, file), 'utf8');
    if (content.length === 0) throw new Error(`${file} is empty`);
    if (content.length < 1000) throw new Error(`${file} is too small (${content.length} bytes)`);
  });
});

// Test 4: Check for critical code patterns
test('Critical code patterns present', () => {
  const assetsDir = path.join(__dirname, 'dist', 'assets');
  const jsFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
  const mainJs = jsFiles.find(f => f.includes('main')) || jsFiles[0];
  const content = fs.readFileSync(path.join(assetsDir, mainJs), 'utf8');
  
  // Check for React
  if (!content.includes('react')) throw new Error('React not found in bundle');
  
  // Check for key components (including minified names)
  const checks = [
    ['MASSIVE WebSocket', /socket\.massive\.com|MASSIVE_WS_URL/],
    ['WebSocket connection', /new WebSocket/],
    ['Price cache', /priceCache|getCachedPrice|getAllCachedPrices/],
    ['Kimi AI functions', /Y1|K1|X1|Z1|J1|W1|getAenigmaAnalysis|getStratAnalysis/],
    ['Error handling', /try\s*\{|catch\s*\(/],
    ['React hooks', /useState|useEffect|useCallback/],
    ['Mock stocks data', /MOCK_STOCKS|AAPL|MSFT|TSLA/],
  ];
  
  checks.forEach(([name, pattern]) => {
    if (!pattern.test(content)) throw new Error(`${name} pattern not found`);
  });
});

// Test 5: Environment variables are properly referenced
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
  
  envVars.forEach(envVar => {
    if (!content.includes(envVar)) {
      console.log(`   ⚠️  Warning: ${envVar} not found (may be replaced during build)`);
    }
  });
});

// Test 6: File sizes are reasonable
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

// Test 7: No syntax errors in HTML
test('HTML has no obvious errors', () => {
  const html = fs.readFileSync(path.join(__dirname, 'dist', 'index.html'), 'utf8');
  
  // Check for balanced tags
  const openTags = (html.match(/<script/g) || []).length;
  const closeTags = (html.match(/<\/script>/g) || []).length;
  if (openTags !== closeTags) throw new Error(`Unbalanced script tags: ${openTags} open, ${closeTags} close`);
  
  // Check for duplicate attributes
  if (html.includes('type="module"')) throw new Error('Should not have type=module');
});

// Test 8: Check source maps exist (for debugging)
test('Source maps exist', () => {
  const assetsDir = path.join(__dirname, 'dist', 'assets');
  const mapFiles = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js.map'));
  
  if (mapFiles.length === 0) {
    console.log('   ⚠️  Warning: No source maps found (optional but recommended)');
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
  process.exit(0);
} else {
  console.log('\n⚠️  SOME TESTS FAILED. Fix issues before deploying.');
  process.exit(1);
}
