#!/usr/bin/env node

/**
 * Setup script for local development
 * Creates necessary directories and files that should not be in version control
 * Works on both Windows and Linux/macOS
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Directories to create
const directories = [
    'data',           // For SQLite database files
    'logs',           // For application logs
];

// Files to create (if they don't exist)
const files = {
    '.env': `# Environment variables
NODE_ENV=development
PORT=3001
JWT_SECRET=your-secret-key-change-this-in-production
LOG_LEVEL=debug
`,
};

console.log('🚀 Setting up local development environment...\n');

// Create directories
directories.forEach(dir => {
    const dirPath = path.join(process.cwd(), dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✅ Created directory: ${dir}/`);
    } else {
        console.log(`ℹ️  Directory already exists: ${dir}/`);
    }
});

console.log('');

// Create files
Object.entries(files).forEach(([filename, content]) => {
    const filePath = path.join(process.cwd(), filename);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✅ Created file: ${filename}`);
    } else {
        console.log(`ℹ️  File already exists: ${filename}`);
    }
});

// Initialize database
console.log('\n📊 Initializing database...\n');
try {
    execSync('npx ts-node scripts/initDatabase.ts', { stdio: 'inherit' });
} catch (error) {
    console.error('\n⚠️  Database initialization failed. You may need to run it manually:');
    console.error('   npx ts-node scripts/initDatabase.ts\n');
}

console.log('\n✨ Setup complete!\n');
console.log('Next steps:');
console.log('  1. Create an OAuth client:');
console.log('     npx ts-node scripts/createClient.ts <client_id> <secret> <name>');
console.log('  2. Start the server:');
console.log('     npm start\n');
