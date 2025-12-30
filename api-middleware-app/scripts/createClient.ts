/**
 * Script to create a new OAuth client
 *
 * Usage:
 *   ts-node scripts/createClient.ts <client_id> <client_secret> <name> [description]
 *
 * Example:
 *   ts-node scripts/createClient.ts my_app my_secret123 "My Application" "App for testing"
 */

import Database from 'better-sqlite3';
import { hashSecret } from '../src/utils/hash';
import { getDatabaseConfig } from '../src/config/database';
import path from 'path';

async function createClient(
    clientId: string,
    clientSecret: string,
    name: string,
    description?: string
): Promise<void> {
    // Get database config for development
    const config = getDatabaseConfig('development');

    // Ensure data directory exists
    const dataDir = path.join(process.cwd(), 'data');
    const fs = require('fs');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }

    const db = new Database(config.filename);

    try {
        // Create tables if they don't exist
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
        `);

        // Hash the client secret
        console.log('Hashing client secret...');
        const clientSecretHash = await hashSecret(clientSecret);

        // Insert the client
        console.log('Creating client...');
        const stmt = db.prepare(`
            INSERT INTO clients (client_id, client_secret_hash, name, description)
            VALUES (?, ?, ?, ?)
        `);

        const result = stmt.run(clientId, clientSecretHash, name, description || null);

        console.log('\n✅ Client created successfully!');
        console.log('━'.repeat(50));
        console.log(`ID:          ${result.lastInsertRowid}`);
        console.log(`Client ID:   ${clientId}`);
        console.log(`Name:        ${name}`);
        if (description) {
            console.log(`Description: ${description}`);
        }
        console.log('━'.repeat(50));
        console.log('\n💡 Test your client:');
        console.log(`
curl -X POST http://localhost:3000/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "client_id": "${clientId}",
    "client_secret": "${clientSecret}",
    "grant_type": "client_credentials"
  }'
        `);
    } catch (error: any) {
        if (error.message?.includes('UNIQUE constraint')) {
            console.error(`\n❌ Error: Client with ID "${clientId}" already exists.`);
        } else {
            console.error(`\n❌ Error: ${error.message}`);
        }
        process.exit(1);
    } finally {
        db.close();
    }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 3) {
    console.error(`
Usage: ts-node scripts/createClient.ts <client_id> <client_secret> <name> [description]

Arguments:
  client_id      Unique identifier for the client
  client_secret  Secret password for the client (will be hashed)
  name           Display name for the client
  description    Optional description

Example:
  ts-node scripts/createClient.ts my_app secret123 "My Application" "App for testing"
    `);
    process.exit(1);
}

const [clientId, clientSecret, name, description] = args;

createClient(clientId, clientSecret, name, description)
    .then(() => {
        process.exit(0);
    })
    .catch((error) => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
