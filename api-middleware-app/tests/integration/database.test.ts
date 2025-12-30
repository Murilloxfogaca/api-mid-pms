import { setupTestDatabase } from '../helpers/testDatabase';
import Database from 'better-sqlite3';

describe('Database Integration Tests', () => {
    let db: Database.Database;
    let cleanup: () => void;

    beforeAll(() => {
        const setup = setupTestDatabase();
        db = setup.db;
        cleanup = setup.cleanup;
    });

    afterAll(() => {
        cleanup();
    });

    afterEach(() => {
        // Clear data between tests
        db.exec('DELETE FROM api_logs;');
        db.exec('DELETE FROM sessions;');
        db.exec('DELETE FROM users;');
    });

    describe('Users Table', () => {
        it('should insert a new user', () => {
            const stmt = db.prepare(`
                INSERT INTO users (username, email, password)
                VALUES (?, ?, ?)
            `);

            const result = stmt.run('john_doe', 'john@example.com', 'hashedpassword123');

            expect(result.changes).toBe(1);
            expect(result.lastInsertRowid).toBeGreaterThan(0);
        });

        it('should retrieve a user by username', () => {
            // Insert test user
            db.prepare(`
                INSERT INTO users (username, email, password)
                VALUES (?, ?, ?)
            `).run('jane_doe', 'jane@example.com', 'hashedpassword456');

            // Retrieve user
            const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
            const user = stmt.get('jane_doe') as any;

            expect(user).toBeDefined();
            expect(user.username).toBe('jane_doe');
            expect(user.email).toBe('jane@example.com');
        });

        it('should not allow duplicate usernames', () => {
            const insertStmt = db.prepare(`
                INSERT INTO users (username, email, password)
                VALUES (?, ?, ?)
            `);

            insertStmt.run('duplicate_user', 'user1@example.com', 'password1');

            expect(() => {
                insertStmt.run('duplicate_user', 'user2@example.com', 'password2');
            }).toThrow();
        });

        it('should update user email', () => {
            // Insert user
            db.prepare(`
                INSERT INTO users (username, email, password)
                VALUES (?, ?, ?)
            `).run('update_test', 'old@example.com', 'password');

            // Update email
            const updateStmt = db.prepare(`
                UPDATE users SET email = ? WHERE username = ?
            `);
            const result = updateStmt.run('new@example.com', 'update_test');

            expect(result.changes).toBe(1);

            // Verify update
            const user = db.prepare('SELECT email FROM users WHERE username = ?')
                .get('update_test') as any;
            expect(user.email).toBe('new@example.com');
        });

        it('should delete a user', () => {
            // Insert user
            db.prepare(`
                INSERT INTO users (username, email, password)
                VALUES (?, ?, ?)
            `).run('delete_test', 'delete@example.com', 'password');

            // Delete user
            const deleteStmt = db.prepare('DELETE FROM users WHERE username = ?');
            const result = deleteStmt.run('delete_test');

            expect(result.changes).toBe(1);

            // Verify deletion
            const user = db.prepare('SELECT * FROM users WHERE username = ?')
                .get('delete_test');
            expect(user).toBeUndefined();
        });
    });

    describe('OAuth Sessions Table', () => {
        let clientId: number;

        beforeEach(() => {
            // Create a test OAuth client for session tests
            const result = db.prepare(`
                INSERT INTO clients (client_id, client_secret_hash, name)
                VALUES (?, ?, ?)
            `).run('test_client', 'hashed_secret', 'Test Client');

            clientId = Number(result.lastInsertRowid);
        });

        afterEach(() => {
            db.exec('DELETE FROM sessions;');
            db.exec('DELETE FROM clients;');
        });

        it('should create a session for a client', () => {
            const stmt = db.prepare(`
                INSERT INTO sessions (client_id, access_token, refresh_token, expires_at, refresh_expires_at)
                VALUES (?, ?, ?, ?, ?)
            `);

            const expiresAt = new Date(Date.now() + 3600000).toISOString();
            const refreshExpiresAt = new Date(Date.now() + 86400000).toISOString();
            const result = stmt.run(clientId, 'access_token_123', 'refresh_token_123', expiresAt, refreshExpiresAt);

            expect(result.changes).toBe(1);
        });

        it('should retrieve session by access token', () => {
            const expiresAt = new Date(Date.now() + 3600000).toISOString();
            const refreshExpiresAt = new Date(Date.now() + 86400000).toISOString();
            db.prepare(`
                INSERT INTO sessions (client_id, access_token, refresh_token, expires_at, refresh_expires_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(clientId, 'retrieve_access_token', 'retrieve_refresh_token', expiresAt, refreshExpiresAt);

            const session = db.prepare('SELECT * FROM sessions WHERE access_token = ?')
                .get('retrieve_access_token') as any;

            expect(session).toBeDefined();
            expect(session.client_id).toBe(clientId);
            expect(session.access_token).toBe('retrieve_access_token');
        });

        it('should delete sessions when client is deleted (CASCADE)', () => {
            // Create session
            const expiresAt = new Date(Date.now() + 3600000).toISOString();
            const refreshExpiresAt = new Date(Date.now() + 86400000).toISOString();
            db.prepare(`
                INSERT INTO sessions (client_id, access_token, refresh_token, expires_at, refresh_expires_at)
                VALUES (?, ?, ?, ?, ?)
            `).run(clientId, 'cascade_access_token', 'cascade_refresh_token', expiresAt, refreshExpiresAt);

            // Delete client
            db.prepare('DELETE FROM clients WHERE id = ?').run(clientId);

            // Verify session was also deleted
            const session = db.prepare('SELECT * FROM sessions WHERE access_token = ?')
                .get('cascade_access_token');
            expect(session).toBeUndefined();
        });
    });

    describe('API Logs Table', () => {
        it('should log an API request', () => {
            const stmt = db.prepare(`
                INSERT INTO api_logs (method, path, status_code, response_time)
                VALUES (?, ?, ?, ?)
            `);

            const result = stmt.run('GET', '/api/users', 200, 45);

            expect(result.changes).toBe(1);
        });

        it('should retrieve logs by status code', () => {
            // Insert multiple logs
            const stmt = db.prepare(`
                INSERT INTO api_logs (method, path, status_code, response_time)
                VALUES (?, ?, ?, ?)
            `);

            stmt.run('GET', '/api/users', 200, 45);
            stmt.run('POST', '/api/users', 201, 120);
            stmt.run('GET', '/api/products', 404, 30);
            stmt.run('GET', '/api/orders', 200, 55);

            // Get all 200 status logs
            const logs = db.prepare(`
                SELECT * FROM api_logs WHERE status_code = ?
            `).all(200);

            expect(logs).toHaveLength(2);
        });

        it('should calculate average response time', () => {
            const stmt = db.prepare(`
                INSERT INTO api_logs (method, path, status_code, response_time)
                VALUES (?, ?, ?, ?)
            `);

            stmt.run('GET', '/api/test', 200, 100);
            stmt.run('GET', '/api/test', 200, 200);
            stmt.run('GET', '/api/test', 200, 150);

            const result = db.prepare(`
                SELECT AVG(response_time) as avg_time FROM api_logs
            `).get() as any;

            expect(result.avg_time).toBe(150);
        });
    });

    describe('Transactions', () => {
        it('should rollback transaction on error', () => {
            const insertUser = db.prepare(`
                INSERT INTO users (username, email, password)
                VALUES (?, ?, ?)
            `);

            expect(() => {
                const transaction = db.transaction(() => {
                    insertUser.run('user1', 'user1@example.com', 'pass1');
                    // This will fail due to duplicate username
                    insertUser.run('user1', 'user2@example.com', 'pass2');
                });
                transaction();
            }).toThrow();

            // Verify no users were inserted
            const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
            expect(count.count).toBe(0);
        });

        it('should commit transaction on success', () => {
            const insertUser = db.prepare(`
                INSERT INTO users (username, email, password)
                VALUES (?, ?, ?)
            `);

            const transaction = db.transaction(() => {
                insertUser.run('user1', 'user1@example.com', 'pass1');
                insertUser.run('user2', 'user2@example.com', 'pass2');
            });

            transaction();

            const count = db.prepare('SELECT COUNT(*) as count FROM users').get() as any;
            expect(count.count).toBe(2);
        });
    });
});
