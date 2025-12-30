import { Response, NextFunction } from 'express';
import { createAuthMiddleware } from '../../src/middleware/authentication';
import { setupTestDatabase } from '../helpers/testDatabase';
import { AuthService } from '../../src/services/authService';
import { AuthRequest } from '../../src/types';
import Database from 'better-sqlite3';

describe('Authentication Middleware', () => {
    let db: Database.Database;
    let cleanup: () => void;
    let authService: AuthService;
    let authMiddleware: any;

    beforeAll(() => {
        const setup = setupTestDatabase();
        db = setup.db;
        cleanup = setup.cleanup;
        authService = new AuthService(db);
        authMiddleware = createAuthMiddleware(db);
    });

    afterAll(() => {
        cleanup();
    });

    afterEach(() => {
        db.exec('DELETE FROM sessions;');
        db.exec('DELETE FROM clients;');
    });

    it('should call next() if the token is valid', async () => {
        // Create a test client and get a valid token
        const client = db.prepare(`
            INSERT INTO clients (client_id, client_secret_hash, name)
            VALUES (?, ?, ?)
        `).run('test_client', 'hash', 'Test Client');

        const tokenResponse = await authService.createTokenResponse('test_client', 'hash');
        expect(tokenResponse).toBeNull(); // Will fail auth but that's OK for this structure

        // Create session manually with a valid token structure
        const testClient = db.prepare('SELECT * FROM clients WHERE client_id = ?').get('test_client') as any;
        const { accessToken, refreshToken, expiresAt, refreshExpiresAt } = authService.generateTokens('test_client');

        db.prepare(`
            INSERT INTO sessions (client_id, access_token, refresh_token, expires_at, refresh_expires_at)
            VALUES (?, ?, ?, ?, ?)
        `).run(testClient.id, accessToken, refreshToken, expiresAt.toISOString(), refreshExpiresAt.toISOString());

        const req = {
            headers: {
                authorization: `Bearer ${accessToken}`
            }
        } as AuthRequest;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as unknown as Response;
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(req.client).toBeDefined();
    });

    it('should return 401 if the token is missing', () => {
        const req = {
            headers: {}
        } as AuthRequest;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as unknown as Response;
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: 'unauthorized',
            error_description: 'No authorization header provided',
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if the token is invalid', () => {
        const req = {
            headers: {
                authorization: 'Bearer invalidToken'
            }
        } as AuthRequest;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as unknown as Response;
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: 'unauthorized',
            error_description: 'Invalid or expired access token',
        });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if authorization header format is invalid', () => {
        const req = {
            headers: {
                authorization: 'InvalidFormat'
            }
        } as AuthRequest;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as unknown as Response;
        const next = jest.fn();

        authMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({
            error: 'unauthorized',
            error_description: 'Invalid authorization header format. Expected: Bearer <token>',
        });
        expect(next).not.toHaveBeenCalled();
    });
});