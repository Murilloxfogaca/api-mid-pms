/**
 * Script to list all OAuth clients
 *
 * Usage:
 *   ts-node scripts/listClients.ts
 */

import Database from 'better-sqlite3';
import { getDatabaseConfig } from '../src/config/database';

function listClients(): void {
    const config = getDatabaseConfig('development');
    const db = new Database(config.filename);

    try {
        const clients = db.prepare(`
            SELECT
                id,
                client_id,
                name,
                description,
                is_active,
                created_at
            FROM clients
            ORDER BY created_at DESC
        `).all();

        if (clients.length === 0) {
            console.log('\nNo clients found.');
            console.log('\nCreate a client with:');
            console.log('  ts-node scripts/createClient.ts <client_id> <client_secret> <name>');
            return;
        }

        console.log('\n📋 OAuth Clients');
        console.log('═'.repeat(80));

        clients.forEach((client: any, index) => {
            const status = client.is_active ? '🟢 Active' : '🔴 Inactive';
            const date = new Date(client.created_at).toLocaleString();

            console.log(`\n${index + 1}. ${client.name} ${status}`);
            console.log('─'.repeat(80));
            console.log(`   ID:          ${client.id}`);
            console.log(`   Client ID:   ${client.client_id}`);
            if (client.description) {
                console.log(`   Description: ${client.description}`);
            }
            console.log(`   Created:     ${date}`);
        });

        console.log('\n═'.repeat(80));
        console.log(`Total: ${clients.length} client(s)\n`);

        // Show active sessions count
        const sessions = db.prepare(`
            SELECT client_id, COUNT(*) as count
            FROM sessions
            WHERE is_revoked = 0
            GROUP BY client_id
        `).all() as any[];

        if (sessions.length > 0) {
            console.log('🔑 Active Sessions:');
            sessions.forEach((session: any) => {
                const client = clients.find((c: any) => c.id === session.client_id);
                console.log(`   ${client?.name || 'Unknown'}: ${session.count} session(s)`);
            });
            console.log();
        }

    } finally {
        db.close();
    }
}

listClients();
