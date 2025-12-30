#!/usr/bin/env node

/**
 * Setup script for local development
 * Creates necessary directories and files that should not be in version control
 * Works on both Windows and Linux/macOS
 */

const fs = require('fs');
const path = require('path');

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

console.log('\n✨ Setup complete! You can now run: npm start\n');
