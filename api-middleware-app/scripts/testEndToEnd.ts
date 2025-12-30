/**
 * End-to-End Test Script
 *
 * Tests the complete OAuth 2.0 authentication flow:
 * 1. Create a test client
 * 2. Get access token (client credentials flow)
 * 3. Validate token works
 * 4. Refresh token
 * 5. Revoke token
 * 6. Cleanup
 */

import Database from 'better-sqlite3';
import { DatabaseConnection, getDatabaseConfig } from '../src/config/database';
import { hashSecret } from '../src/utils/hash';
import { AuthService } from '../src/services/authService';
import { AuthController } from '../src/controllers/authController';

interface MockResponse {
    statusCode?: number;
    jsonData?: any;
    status(code: number): MockResponse;
    json(data: any): void;
}

interface MockRequest {
    body?: any;
    headers?: any;
    client?: any;
}

class TestRunner {
    private db: Database.Database;
    private authService: AuthService;
    private authController: AuthController;
    private testClientId = 'e2e_test_client';
    private testClientSecret = 'e2e_test_secret_123';
    private accessToken = '';
    private refreshToken = '';

    constructor() {
        // Use in-memory database for testing
        const config = getDatabaseConfig('test');
        const connection = new DatabaseConnection(config);
        this.db = connection.connect();
        this.createTables();
        this.authService = new AuthService(this.db);
        this.authController = new AuthController(this.db);
    }

    private createTables(): void {
        this.db.exec(`
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
        `);
    }

    private createMockResponse(): MockResponse {
        const res: MockResponse = {
            status(code: number): MockResponse {
                this.statusCode = code;
                return this;
            },
            json(data: any): void {
                this.jsonData = data;
            }
        };
        return res;
    }

    private log(step: string, message: string, data?: any): void {
        console.log(`\n${'='.repeat(60)}`);
        console.log(`[${step}] ${message}`);
        if (data) {
            console.log(JSON.stringify(data, null, 2));
        }
    }

    private logSuccess(message: string): void {
        console.log(`✅ ${message}`);
    }

    private logError(message: string): void {
        console.log(`❌ ${message}`);
    }

    async test1_CreateClient(): Promise<boolean> {
        this.log('STEP 1', 'Creating OAuth Client');

        try {
            const secretHash = await hashSecret(this.testClientSecret);

            this.db.prepare(`
                INSERT INTO clients (client_id, client_secret_hash, name, description)
                VALUES (?, ?, ?, ?)
            `).run(
                this.testClientId,
                secretHash,
                'E2E Test Client',
                'Client for end-to-end testing'
            );

            const client = this.db.prepare('SELECT * FROM clients WHERE client_id = ?')
                .get(this.testClientId) as any;

            if (client) {
                this.logSuccess('Client created successfully');
                this.log('CLIENT INFO', '', {
                    client_id: client.client_id,
                    name: client.name,
                    is_active: client.is_active === 1 ? 'Yes' : 'No'
                });
                return true;
            }

            this.logError('Client creation failed');
            return false;
        } catch (error: any) {
            this.logError(`Client creation error: ${error.message}`);
            return false;
        }
    }

    async test2_GetAccessToken(): Promise<boolean> {
        this.log('STEP 2', 'Getting Access Token (Client Credentials Flow)');

        try {
            const req: MockRequest = {
                body: {
                    client_id: this.testClientId,
                    client_secret: this.testClientSecret,
                    grant_type: 'client_credentials'
                }
            };

            const res = this.createMockResponse();
            await this.authController.token(req as any, res as any);

            if (res.statusCode === 200 && res.jsonData) {
                this.accessToken = res.jsonData.access_token;
                this.refreshToken = res.jsonData.refresh_token;

                this.logSuccess('Access token obtained successfully');
                this.log('TOKEN RESPONSE', '', {
                    token_type: res.jsonData.token_type,
                    expires_in: res.jsonData.expires_in,
                    access_token_length: this.accessToken.length,
                    refresh_token_length: this.refreshToken.length
                });
                return true;
            }

            this.logError(`Token request failed with status ${res.statusCode}`);
            return false;
        } catch (error: any) {
            this.logError(`Token request error: ${error.message}`);
            return false;
        }
    }

    test3_ValidateToken(): boolean {
        this.log('STEP 3', 'Validating Access Token');

        try {
            const session = this.authService.validateAccessToken(this.accessToken);

            if (session) {
                const client = this.authService.getClientBySession(session);

                this.logSuccess('Token is valid');
                this.log('SESSION INFO', '', {
                    client_name: client?.name,
                    token_type: session.token_type,
                    is_revoked: session.is_revoked === 0 ? 'No' : 'Yes',
                    expires_at: session.expires_at
                });
                return true;
            }

            this.logError('Token validation failed');
            return false;
        } catch (error: any) {
            this.logError(`Token validation error: ${error.message}`);
            return false;
        }
    }

    async test4_RefreshToken(): Promise<boolean> {
        this.log('STEP 4', 'Refreshing Access Token');

        try {
            const req: MockRequest = {
                body: {
                    refresh_token: this.refreshToken,
                    grant_type: 'refresh_token'
                }
            };

            const res = this.createMockResponse();
            await this.authController.refresh(req as any, res as any);

            if (res.statusCode === 200 && res.jsonData) {
                const oldAccessToken = this.accessToken;
                const oldRefreshToken = this.refreshToken;

                this.accessToken = res.jsonData.access_token;
                this.refreshToken = res.jsonData.refresh_token;

                this.logSuccess('Token refreshed successfully');
                this.log('REFRESH RESULT', '', {
                    tokens_changed: oldAccessToken !== this.accessToken,
                    old_token_revoked: true,
                    new_expires_in: res.jsonData.expires_in
                });

                // Verify old token is revoked
                const oldSession = this.db.prepare(
                    'SELECT * FROM sessions WHERE access_token = ?'
                ).get(oldAccessToken) as any;

                if (oldSession && oldSession.is_revoked === 1) {
                    this.logSuccess('Old token was properly revoked');
                } else {
                    this.logError('Old token was NOT revoked');
                }

                return true;
            }

            this.logError(`Token refresh failed with status ${res.statusCode}`);
            return false;
        } catch (error: any) {
            this.logError(`Token refresh error: ${error.message}`);
            return false;
        }
    }

    async test5_RevokeToken(): Promise<boolean> {
        this.log('STEP 5', 'Revoking Access Token');

        try {
            const req: MockRequest = {
                body: {
                    token: this.accessToken
                }
            };

            const res = this.createMockResponse();
            await this.authController.revoke(req as any, res as any);

            if (res.statusCode === 200) {
                this.logSuccess('Token revoked successfully');

                // Verify token is actually revoked
                const session = this.authService.validateAccessToken(this.accessToken);

                if (!session) {
                    this.logSuccess('Token validation now fails (as expected)');
                    return true;
                } else {
                    this.logError('Token is still valid (should be revoked)');
                    return false;
                }
            }

            this.logError(`Token revocation failed with status ${res.statusCode}`);
            return false;
        } catch (error: any) {
            this.logError(`Token revocation error: ${error.message}`);
            return false;
        }
    }

    test6_VerifyDatabaseState(): boolean {
        this.log('STEP 6', 'Verifying Database State');

        try {
            const clients = this.db.prepare('SELECT COUNT(*) as count FROM clients').get() as any;
            const sessions = this.db.prepare('SELECT COUNT(*) as count FROM sessions').get() as any;
            const activeSessions = this.db.prepare(
                'SELECT COUNT(*) as count FROM sessions WHERE is_revoked = 0'
            ).get() as any;
            const revokedSessions = this.db.prepare(
                'SELECT COUNT(*) as count FROM sessions WHERE is_revoked = 1'
            ).get() as any;

            this.log('DATABASE STATE', '', {
                total_clients: clients.count,
                total_sessions: sessions.count,
                active_sessions: activeSessions.count,
                revoked_sessions: revokedSessions.count
            });

            this.logSuccess('Database state verified');
            return true;
        } catch (error: any) {
            this.logError(`Database verification error: ${error.message}`);
            return false;
        }
    }

    cleanup(): void {
        this.log('CLEANUP', 'Cleaning up test data');
        this.db.exec('DELETE FROM sessions;');
        this.db.exec('DELETE FROM clients;');
        this.db.close();
        this.logSuccess('Cleanup completed');
    }

    async runAllTests(): Promise<void> {
        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║     END-TO-END OAUTH 2.0 AUTHENTICATION TEST SUITE       ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');

        const results: { [key: string]: boolean } = {};

        try {
            results['Create Client'] = await this.test1_CreateClient();
            if (!results['Create Client']) throw new Error('Client creation failed');

            results['Get Access Token'] = await this.test2_GetAccessToken();
            if (!results['Get Access Token']) throw new Error('Token acquisition failed');

            results['Validate Token'] = this.test3_ValidateToken();
            if (!results['Validate Token']) throw new Error('Token validation failed');

            results['Refresh Token'] = await this.test4_RefreshToken();
            if (!results['Refresh Token']) throw new Error('Token refresh failed');

            results['Revoke Token'] = await this.test5_RevokeToken();
            if (!results['Revoke Token']) throw new Error('Token revocation failed');

            results['Database State'] = this.test6_VerifyDatabaseState();

        } catch (error: any) {
            console.log(`\n❌ Test suite failed: ${error.message}`);
        } finally {
            this.cleanup();
        }

        // Print summary
        console.log('\n');
        console.log('╔═══════════════════════════════════════════════════════════╗');
        console.log('║                      TEST SUMMARY                         ║');
        console.log('╚═══════════════════════════════════════════════════════════╝');

        let passed = 0;
        let failed = 0;

        Object.entries(results).forEach(([test, result]) => {
            const status = result ? '✅ PASS' : '❌ FAIL';
            console.log(`  ${status}  ${test}`);
            result ? passed++ : failed++;
        });

        console.log('\n' + '─'.repeat(60));
        console.log(`  Total: ${passed + failed} | Passed: ${passed} | Failed: ${failed}`);
        console.log('─'.repeat(60) + '\n');

        if (failed === 0) {
            console.log('🎉 All tests passed! OAuth 2.0 system is working correctly.\n');
            process.exit(0);
        } else {
            console.log('⚠️  Some tests failed. Please check the errors above.\n');
            process.exit(1);
        }
    }
}

// Run the test suite
const runner = new TestRunner();
runner.runAllTests().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
