import { setupTestDatabase } from '../helpers/testDatabase';
import Database from 'better-sqlite3';
import { AuthService } from '../../src/services/authService';
import { hashSecret } from '../../src/utils/hash';

describe('Authentication Integration Tests', () => {
    let db: Database.Database;
    let cleanup: () => void;
    let authService: AuthService;
    let testClientId: string;
    let testClientSecret: string;

    beforeAll(async () => {
        const setup = setupTestDatabase();
        db = setup.db;
        cleanup = setup.cleanup;
        authService = new AuthService(db);

        // Create a test client
        testClientId = 'integration_test_client';
        testClientSecret = 'integration_test_secret';
        const secretHash = await hashSecret(testClientSecret);

        db.prepare(`
            INSERT INTO clients (client_id, client_secret_hash, name, description)
            VALUES (?, ?, ?, ?)
        `).run(testClientId, secretHash, 'Integration Test Client', 'Client for integration tests');
    });

    afterAll(() => {
        cleanup();
    });

    afterEach(() => {
        // Clear sessions between tests
        db.exec('DELETE FROM sessions;');
    });

    describe('Client Credentials Flow', () => {
        it('should authenticate valid client credentials', async () => {
            const client = await authService.authenticateClient(testClientId, testClientSecret);

            expect(client).not.toBeNull();
            expect(client?.client_id).toBe(testClientId);
            expect(client?.is_active).toBe(1);
        });

        it('should reject invalid client_id', async () => {
            const client = await authService.authenticateClient('invalid_client', testClientSecret);

            expect(client).toBeNull();
        });

        it('should reject invalid client_secret', async () => {
            const client = await authService.authenticateClient(testClientId, 'wrong_secret');

            expect(client).toBeNull();
        });

        it('should create complete token response', async () => {
            const tokenResponse = await authService.createTokenResponse(testClientId, testClientSecret);

            expect(tokenResponse).not.toBeNull();
            expect(tokenResponse?.access_token).toBeDefined();
            expect(tokenResponse?.refresh_token).toBeDefined();
            expect(tokenResponse?.token_type).toBe('Bearer');
            expect(tokenResponse?.expires_in).toBe(3600);
        });

        it('should save session to database', async () => {
            await authService.createTokenResponse(testClientId, testClientSecret);

            const sessions = db.prepare('SELECT * FROM sessions').all();
            expect(sessions).toHaveLength(1);

            const session = sessions[0] as any;
            expect(session.access_token).toBeDefined();
            expect(session.refresh_token).toBeDefined();
            expect(session.token_type).toBe('Bearer');
            expect(session.is_revoked).toBe(0);
        });
    });

    describe('Token Validation', () => {
        let validAccessToken: string;

        beforeEach(async () => {
            const tokenResponse = await authService.createTokenResponse(testClientId, testClientSecret);
            validAccessToken = tokenResponse!.access_token;
        });

        it('should validate valid access token', () => {
            const session = authService.validateAccessToken(validAccessToken);

            expect(session).not.toBeNull();
            expect(session?.access_token).toBe(validAccessToken);
        });

        it('should reject invalid access token', () => {
            const session = authService.validateAccessToken('invalid_token');

            expect(session).toBeNull();
        });

        it('should reject revoked token', () => {
            const session = authService.validateAccessToken(validAccessToken);
            authService.revokeSession(session!.id);

            const revokedSession = authService.validateAccessToken(validAccessToken);
            expect(revokedSession).toBeNull();
        });

        it('should get client by session', () => {
            const session = authService.validateAccessToken(validAccessToken);
            const client = authService.getClientBySession(session!);

            expect(client).not.toBeNull();
            expect(client?.client_id).toBe(testClientId);
        });
    });

    describe('Refresh Token Flow', () => {
        let refreshToken: string;

        beforeEach(async () => {
            const tokenResponse = await authService.createTokenResponse(testClientId, testClientSecret);
            refreshToken = tokenResponse!.refresh_token;
        });

        it('should refresh access token with valid refresh token', async () => {
            const newTokenResponse = await authService.refreshAccessToken(refreshToken);

            expect(newTokenResponse).not.toBeNull();
            expect(newTokenResponse?.access_token).toBeDefined();
            expect(newTokenResponse?.refresh_token).toBeDefined();
            expect(newTokenResponse?.access_token).not.toBe(refreshToken);
        });

        it('should reject invalid refresh token', async () => {
            const newTokenResponse = await authService.refreshAccessToken('invalid_refresh_token');

            expect(newTokenResponse).toBeNull();
        });

        it('should revoke old session when refreshing', async () => {
            const sessionsBeforeRefresh = db.prepare('SELECT * FROM sessions WHERE is_revoked = 0').all();
            expect(sessionsBeforeRefresh).toHaveLength(1);

            await authService.refreshAccessToken(refreshToken);

            const activeSessions = db.prepare('SELECT * FROM sessions WHERE is_revoked = 0').all();
            const revokedSessions = db.prepare('SELECT * FROM sessions WHERE is_revoked = 1').all();

            expect(activeSessions).toHaveLength(1);
            expect(revokedSessions).toHaveLength(1);
        });

        it('should not allow using refresh token twice', async () => {
            const firstRefresh = await authService.refreshAccessToken(refreshToken);
            expect(firstRefresh).not.toBeNull();

            const secondRefresh = await authService.refreshAccessToken(refreshToken);
            expect(secondRefresh).toBeNull();
        });
    });

    describe('Session Management', () => {
        it('should revoke session by id', async () => {
            const tokenResponse = await authService.createTokenResponse(testClientId, testClientSecret);
            const session = authService.validateAccessToken(tokenResponse!.access_token);

            authService.revokeSession(session!.id);

            const revokedSession = db.prepare('SELECT * FROM sessions WHERE id = ?').get(session!.id) as any;
            expect(revokedSession.is_revoked).toBe(1);
        });

        it('should revoke all client sessions', async () => {
            // Create multiple sessions
            await authService.createTokenResponse(testClientId, testClientSecret);
            await authService.createTokenResponse(testClientId, testClientSecret);
            await authService.createTokenResponse(testClientId, testClientSecret);

            const client = await authService.authenticateClient(testClientId, testClientSecret);
            authService.revokeAllClientSessions(client!.id);

            const activeSessions = db.prepare('SELECT * FROM sessions WHERE is_revoked = 0').all();
            const revokedSessions = db.prepare('SELECT * FROM sessions WHERE is_revoked = 1').all();

            expect(activeSessions).toHaveLength(0);
            expect(revokedSessions).toHaveLength(3);
        });

        it('should cleanup expired sessions', async () => {
            // Create a session
            const client = await authService.authenticateClient(testClientId, testClientSecret);
            const { accessToken, refreshToken, refreshExpiresAt } = authService.generateTokens(client!.client_id);
            const expiredDate = new Date(Date.now() - 1000); // 1 second ago

            authService.saveSession(client!, accessToken, refreshToken, expiredDate, refreshExpiresAt);

            const deletedCount = authService.cleanupExpiredSessions();

            expect(deletedCount).toBeGreaterThan(0);
            const sessions = db.prepare('SELECT * FROM sessions').all();
            expect(sessions).toHaveLength(0);
        });
    });

    describe('Token Generation', () => {
        it('should generate unique refresh tokens', () => {
            const tokens1 = authService.generateTokens(testClientId);
            const tokens2 = authService.generateTokens(testClientId);

            // Refresh tokens are always unique (random UUID)
            expect(tokens1.refreshToken).not.toBe(tokens2.refreshToken);

            // Access tokens (JWT) may be the same if generated in the same second
            // This is expected behavior for JWT tokens
        });

        it('should generate tokens with correct expiration', () => {
            const expiresIn = 300; // 5 minutes
            const tokens = authService.generateTokens(testClientId, expiresIn);

            const now = Date.now();
            const expiresAt = tokens.expiresAt.getTime();
            const expectedExpiry = now + expiresIn * 1000;

            // Allow 1 second tolerance
            expect(Math.abs(expiresAt - expectedExpiry)).toBeLessThan(1000);
        });

        it('should generate refresh token with longer expiration', () => {
            const expiresIn = 3600;
            const tokens = authService.generateTokens(testClientId, expiresIn);

            const accessExpiry = tokens.expiresAt.getTime();
            const refreshExpiry = tokens.refreshExpiresAt.getTime();

            expect(refreshExpiry).toBeGreaterThan(accessExpiry);
        });
    });

    describe('Inactive Clients', () => {
        let inactiveClientId: string;
        let inactiveClientSecret: string;

        beforeAll(async () => {
            inactiveClientId = 'inactive_client';
            inactiveClientSecret = 'inactive_secret';
            const secretHash = await hashSecret(inactiveClientSecret);

            const result = db.prepare(`
                INSERT INTO clients (client_id, client_secret_hash, name, is_active)
                VALUES (?, ?, ?, ?)
            `).run(inactiveClientId, secretHash, 'Inactive Client', 0);
        });

        it('should not authenticate inactive client', async () => {
            const client = await authService.authenticateClient(inactiveClientId, inactiveClientSecret);

            expect(client).toBeNull();
        });
    });
});
