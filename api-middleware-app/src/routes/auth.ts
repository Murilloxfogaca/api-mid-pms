import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import Database from 'better-sqlite3';

/**
 * Create authentication routes
 */
export const createAuthRoutes = (db: Database.Database): Router => {
    const router = Router();
    const authController = new AuthController(db);

    /**
     * POST /auth/token
     * OAuth 2.0 Client Credentials Flow
     *
     * Request body:
     * {
     *   "client_id": "your_client_id",
     *   "client_secret": "your_client_secret",
     *   "grant_type": "client_credentials"
     * }
     *
     * Response:
     * {
     *   "access_token": "eyJhbGciOiJIUzI1NiIs...",
     *   "refresh_token": "a1b2c3d4...",
     *   "token_type": "Bearer",
     *   "expires_in": 3600
     * }
     */
    router.post('/token', authController.token);

    /**
     * POST /auth/refresh
     * Refresh an expired access token
     *
     * Request body:
     * {
     *   "refresh_token": "your_refresh_token",
     *   "grant_type": "refresh_token"
     * }
     *
     * Response:
     * {
     *   "access_token": "eyJhbGciOiJIUzI1NiIs...",
     *   "refresh_token": "e5f6g7h8...",
     *   "token_type": "Bearer",
     *   "expires_in": 3600
     * }
     */
    router.post('/refresh', authController.refresh);

    /**
     * POST /auth/revoke
     * Revoke an access token (logout)
     *
     * Request body:
     * {
     *   "token": "your_access_token"
     * }
     *
     * Response:
     * {
     *   "message": "Token revoked successfully"
     * }
     */
    router.post('/revoke', authController.revoke);

    return router;
};
