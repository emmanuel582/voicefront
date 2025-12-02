// Environment variable injection script for Vercel deployment
const fs = require('fs');

const BACKEND_URL = process.env.BACKEND_URL;

if (!BACKEND_URL) {
    console.error('❌ ERROR: BACKEND_URL environment variable is not set!');
    console.error('Please set it in your Vercel project settings.');
    process.exit(1);
}

console.log(`🔧 Injecting BACKEND_URL: ${BACKEND_URL}`);

// Read config.js
const configPath = './config.js';
let configContent = fs.readFileSync(configPath, 'utf8');

// Replace placeholder with actual URL
configContent = configContent.replace('__BACKEND_URL__', BACKEND_URL);

// Write back
fs.writeFileSync(configPath, configContent);

console.log('✅ Environment variables injected successfully!');
