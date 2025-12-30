import Database from 'better-sqlite3';
import { DatabaseConnection, getDatabaseConfig } from '../../src/config/database';

export class TestDatabase {
    private connection: DatabaseConnection;

    constructor() {
        // Always use in-memory database for tests
        const config = getDatabaseConfig('test');
        this.connection = new DatabaseConnection(config);
    }

    /**
     * Setup database connection and create tables
     */
    setup(): Database.Database {
        const db = this.connection.connect();
        this.createTables(db);
        return db;
    }

    /**
     * Create database tables
     */
    private createTables(db: Database.Database): void {
        // OAuth Clients table
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
    }

    /**
     * Clear all data from tables (useful between tests)
     */
    clearAll(db: Database.Database): void {
        db.exec(`DELETE FROM api_logs;`);
        db.exec(`DELETE FROM sessions;`);
        db.exec(`DELETE FROM users;`);
        db.exec(`DELETE FROM clients;`);
    }

    /**
     * Get database connection
     */
    getConnection(): Database.Database {
        return this.connection.getConnection();
    }

    /**
     * Close database connection
     */
    teardown(): void {
        this.connection.close();
    }

    /**
     * Seed test data
     */
    seedTestData(db: Database.Database): void {
        // Insert test users
        const insertUser = db.prepare(`
            INSERT INTO users (username, email, password)
            VALUES (?, ?, ?)
        `);

        insertUser.run('testuser1', 'test1@example.com', 'hashedpassword1');
        insertUser.run('testuser2', 'test2@example.com', 'hashedpassword2');

        // Insert test OAuth clients (using bcrypt hash for 'secret123')
        // Hash: $2b$10$rXQvGwXqVqZ5yFQYX5vYcOKxJ8Uj8TjY5vYcOKxJ8Uj8TjY5vYcO
        const insertClient = db.prepare(`
            INSERT INTO clients (client_id, client_secret_hash, name, description)
            VALUES (?, ?, ?, ?)
        `);

        insertClient.run(
            'test_client_1',
            '$2b$10$rXQvGwXqVqZ5yFQYX5vYcOKxJ8Uj8TjY5vYcOKxJ8Uj8TjY5vYcO',
            'Test Client 1',
            'Client for testing purposes'
        );
        insertClient.run(
            'test_client_2',
            '$2b$10$rXQvGwXqVqZ5yFQYX5vYcOKxJ8Uj8TjY5vYcOKxJ8Uj8TjY5vYcO',
            'Test Client 2',
            'Another test client'
        );
    }
}

/**
 * Helper function to setup and teardown database for tests
 */
export const setupTestDatabase = (): {
    db: Database.Database;
    testDb: TestDatabase;
    cleanup: () => void;
} => {
    const testDb = new TestDatabase();
    const db = testDb.setup();

    const cleanup = () => {
        testDb.teardown();
    };

    return { db, testDb, cleanup };
};
