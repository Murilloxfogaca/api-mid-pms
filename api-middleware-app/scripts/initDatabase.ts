/**
 * Script to initialize database tables
 *
 * Usage:
 *   npx ts-node scripts/initDatabase.ts
 */

import Database from 'better-sqlite3';
import { getDatabaseConfig } from '../src/config/database';
import path from 'path';
import fs from 'fs';

function initDatabase(): void {
    // Get database config for development
    const config = getDatabaseConfig('development');

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log('📊 Initializing database...');
    console.log(`Database file: ${config.filename}\n`);

    const db = new Database(config.filename);

    try {
        // OAuth Clients table
        console.log('Creating clients table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS clients (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id TEXT NOT NULL UNIQUE,
                client_secret_hash TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                is_active INTEGER DEFAULT 1,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_clients_client_id ON clients(client_id);
            CREATE INDEX IF NOT EXISTS idx_clients_is_active ON clients(is_active);
        `);

        // OAuth Sessions/Tokens table
        console.log('Creating sessions table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                client_id INTEGER NOT NULL,
                access_token TEXT NOT NULL UNIQUE,
                refresh_token TEXT NOT NULL UNIQUE,
                token_type TEXT DEFAULT 'Bearer',
                expires_at DATETIME NOT NULL,
                refresh_expires_at DATETIME NOT NULL,
                is_revoked INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_sessions_access_token ON sessions(access_token);
            CREATE INDEX IF NOT EXISTS idx_sessions_refresh_token ON sessions(refresh_token);
            CREATE INDEX IF NOT EXISTS idx_sessions_client_id ON sessions(client_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_is_revoked ON sessions(is_revoked);
        `);

        // Users table (optional, for future user-based auth)
        console.log('Creating users table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT NOT NULL UNIQUE,
                email TEXT NOT NULL UNIQUE,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
        `);

        // API logs table
        console.log('Creating api_logs table...');
        db.exec(`
            CREATE TABLE IF NOT EXISTS api_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                method TEXT NOT NULL,
                path TEXT NOT NULL,
                status_code INTEGER NOT NULL,
                response_time INTEGER NOT NULL,
                client_id INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL
            );
            CREATE INDEX IF NOT EXISTS idx_api_logs_status_code ON api_logs(status_code);
            CREATE INDEX IF NOT EXISTS idx_api_logs_created_at ON api_logs(created_at);
        `);

        console.log('\n✅ Database initialized successfully!');
        console.log('━'.repeat(50));
        console.log('Tables created:');
        console.log('  • clients');
        console.log('  • sessions');
        console.log('  • users');
        console.log('  • api_logs');
        console.log('━'.repeat(50));
        console.log('\n💡 Next steps:');
        console.log('  1. Create an OAuth client:');
        console.log('     npx ts-node scripts/createClient.ts <client_id> <secret> <name>');
        console.log('  2. Start the server:');
        console.log('     npm start\n');
    } catch (error: any) {
        console.error(`\n❌ Error: ${error.message}`);
        process.exit(1);
    } finally {
        db.close();
    }
}

initDatabase();
