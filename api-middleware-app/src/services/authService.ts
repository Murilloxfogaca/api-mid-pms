import Database from 'better-sqlite3';
import { verifySecret } from '../utils/hash';
import { generateAccessToken, generateRefreshToken, getExpirationDate, verifyToken } from '../utils/token';
import { OAuthClient, OAuthSession, TokenResponse } from '../types';

export class AuthService {
    constructor(private db: Database.Database) {}

    /**
     * Authenticate a client using client_id and client_secret
     */
    async authenticateClient(clientId: string, clientSecret: string): Promise<OAuthClient | null> {
        const client = this.db
            .prepare('SELECT * FROM clients WHERE client_id = ? AND is_active = 1')
            .get(clientId) as OAuthClient | undefined;

        if (!client) {
            return null;
        }

        const isValid = await verifySecret(clientSecret, client.client_secret_hash);
        if (!isValid) {
            return null;
        }

        return client;
    }

    /**
     * Generate access and refresh tokens for a client
     */
    generateTokens(clientId: string, expiresIn: number = 3600): {
        accessToken: string;
        refreshToken: string;
        expiresAt: Date;
        refreshExpiresAt: Date;
    } {
        const accessToken = generateAccessToken(clientId, expiresIn);
        const refreshToken = generateRefreshToken();
        const expiresAt = getExpirationDate(expiresIn);
        const refreshExpiresAt = getExpirationDate(expiresIn * 24); // Refresh token lasts 24x longer

        return {
            accessToken,
            refreshToken,
            expiresAt,
            refreshExpiresAt,
        };
    }

    /**
     * Save session to database
     */
    saveSession(
        client: OAuthClient,
        accessToken: string,
        refreshToken: string,
        expiresAt: Date,
        refreshExpiresAt: Date
    ): OAuthSession {
        const stmt = this.db.prepare(`
            INSERT INTO sessions (client_id, access_token, refresh_token, token_type, expires_at, refresh_expires_at)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        const result = stmt.run(
            client.id,
            accessToken,
            refreshToken,
            'Bearer',
            expiresAt.toISOString(),
            refreshExpiresAt.toISOString()
        );

        const session = this.db
            .prepare('SELECT * FROM sessions WHERE id = ?')
            .get(result.lastInsertRowid) as OAuthSession;

        return session;
    }

    /**
     * Create a complete token response
     */
    async createTokenResponse(clientId: string, clientSecret: string): Promise<TokenResponse | null> {
        const client = await this.authenticateClient(clientId, clientSecret);
        if (!client) {
            return null;
        }

        const expiresIn = 3600; // 1 hour
        const { accessToken, refreshToken, expiresAt, refreshExpiresAt } = this.generateTokens(
            client.client_id,
            expiresIn
        );

        this.saveSession(client, accessToken, refreshToken, expiresAt, refreshExpiresAt);

        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            token_type: 'Bearer',
            expires_in: expiresIn,
        };
    }

    /**
     * Refresh an access token using a refresh token
     */
    async refreshAccessToken(refreshToken: string): Promise<TokenResponse | null> {
        const session = this.db
            .prepare('SELECT * FROM sessions WHERE refresh_token = ? AND is_revoked = 0')
            .get(refreshToken) as OAuthSession | undefined;

        if (!session) {
            return null;
        }

        // Check if refresh token is expired
        const sessionRefreshExpiresAt = new Date(session.refresh_expires_at);
        if (sessionRefreshExpiresAt < new Date()) {
            return null;
        }

        // Get client
        const client = this.db
            .prepare('SELECT * FROM clients WHERE id = ?')
            .get(session.client_id) as OAuthClient | undefined;

        if (!client || client.is_active !== 1) {
            return null;
        }

        // Revoke old session
        this.revokeSession(session.id);

        // Generate new tokens
        const expiresIn = 3600;
        const { accessToken, refreshToken: newRefreshToken, expiresAt, refreshExpiresAt } = this.generateTokens(
            client.client_id,
            expiresIn
        );

        this.saveSession(client, accessToken, newRefreshToken, expiresAt, refreshExpiresAt);

        return {
            access_token: accessToken,
            refresh_token: newRefreshToken,
            token_type: 'Bearer',
            expires_in: expiresIn,
        };
    }

    /**
     * Validate an access token
     */
    validateAccessToken(accessToken: string): OAuthSession | null {
        try {
            // Verify JWT signature and expiration
            verifyToken(accessToken);

            // Check if token exists in database and is not revoked
            const session = this.db
                .prepare('SELECT * FROM sessions WHERE access_token = ? AND is_revoked = 0')
                .get(accessToken) as OAuthSession | undefined;

            if (!session) {
                return null;
            }

            // Check if token is expired
            const expiresAt = new Date(session.expires_at);
            if (expiresAt < new Date()) {
                return null;
            }

            return session;
        } catch (error) {
            return null;
        }
    }

    /**
     * Get client by session
     */
    getClientBySession(session: OAuthSession): OAuthClient | null {
        const client = this.db
            .prepare('SELECT * FROM clients WHERE id = ?')
            .get(session.client_id) as OAuthClient | undefined;

        return client || null;
    }

    /**
     * Revoke a session (logout)
     */
    revokeSession(sessionId: number): void {
        this.db.prepare('UPDATE sessions SET is_revoked = 1 WHERE id = ?').run(sessionId);
    }

    /**
     * Revoke all sessions for a client
     */
    revokeAllClientSessions(clientId: number): void {
        this.db.prepare('UPDATE sessions SET is_revoked = 1 WHERE client_id = ?').run(clientId);
    }

    /**
     * Clean up expired sessions
     */
    cleanupExpiredSessions(): number {
        const now = new Date().toISOString();
        const result = this.db
            .prepare('DELETE FROM sessions WHERE expires_at < ?')
            .run(now);

        return result.changes;
    }
}
