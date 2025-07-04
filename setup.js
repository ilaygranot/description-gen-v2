#!/usr/bin/env node

/**
 * Setup script to help create .env file
 * Run with: node setup.js
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, '.env.example');

console.log('\n🚀 SEO Description Generator v2 - Setup\n');

// Check if .env already exists
if (fs.existsSync(envPath)) {
  console.log('⚠️  A .env file already exists.');
  rl.question('Do you want to overwrite it? (y/N): ', (answer) => {
    if (answer.toLowerCase() !== 'y') {
      console.log('Setup cancelled.');
      process.exit(0);
    }
    createEnvFile();
  });
} else {
  createEnvFile();
}

function createEnvFile() {
  const envContent = `# DataForSEO API Credentials
# Get your credentials at https://dataforseo.com/
DATAFORSEO_LOGIN=your_dataforseo_login_here
DATAFORSEO_PASSWORD=your_dataforseo_password_here

# OpenAI API Credentials
# Get your API key at https://platform.openai.com/
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3000
NODE_ENV=development

# Feature Flags
ENABLE_COMPETITOR_ANALYSIS=true
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ Created .env file successfully!\n');
    console.log('Next steps:');
    console.log('1. Open .env file in your editor');
    console.log('2. Replace the placeholder values with your actual API credentials:');
    console.log('   - OPENAI_API_KEY: Get from https://platform.openai.com/api-keys');
    console.log('   - DATAFORSEO_LOGIN & PASSWORD: Get from https://dataforseo.com/');
    console.log('3. Save the file');
    console.log('4. Run: npm run dev\n');
  } catch (error) {
    console.error('❌ Error creating .env file:', error.message);
  }

  rl.close();
} 