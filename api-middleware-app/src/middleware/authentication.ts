import { Response, NextFunction } from 'express';
import { AuthRequest } from '../types';
import { AuthService } from '../services/authService';
import Database from 'better-sqlite3';

/**
 * Create authentication middleware with database connection
 */
export const createAuthMiddleware = (db: Database.Database) => {
    const authService = new AuthService(db);

    return (req: AuthRequest, res: Response, next: NextFunction) => {
        const authHeader = req.headers['authorization'];

        if (!authHeader) {
            return res.status(401).json({
                error: 'unauthorized',
                error_description: 'No authorization header provided',
            });
        }

        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return res.status(401).json({
                error: 'unauthorized',
                error_description: 'Invalid authorization header format. Expected: Bearer <token>',
            });
        }

        const token = parts[1];

        try {
            // Validate token
            const session = authService.validateAccessToken(token);

            if (!session) {
                return res.status(401).json({
                    error: 'unauthorized',
                    error_description: 'Invalid or expired access token',
                });
            }

            // Get client information
            const client = authService.getClientBySession(session);

            if (!client) {
                return res.status(401).json({
                    error: 'unauthorized',
                    error_description: 'Client not found or inactive',
                });
            }

            // Attach client to request
            req.client = client;

            next();
        } catch (error) {
            return res.status(401).json({
                error: 'unauthorized',
                error_description: 'Token validation failed',
            });
        }
    };
};

/**
 * Legacy authenticate function (for backward compatibility)
 * Note: This requires a database instance to be passed
 */
export const authenticate = createAuthMiddleware;