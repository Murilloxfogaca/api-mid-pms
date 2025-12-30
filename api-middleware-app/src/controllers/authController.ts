import { Request, Response } from 'express';
import { AuthService } from '../services/authService';
import { TokenRequest, RefreshTokenRequest, ErrorResponse } from '../types';
import Database from 'better-sqlite3';

export class AuthController {
    private authService: AuthService;

    constructor(db: Database.Database) {
        this.authService = new AuthService(db);
    }

    /**
     * POST /auth/token - Client Credentials Flow
     * Request body: { client_id, client_secret, grant_type: "client_credentials" }
     */
    token = async (req: Request, res: Response): Promise<void> => {
        try {
            const { client_id, client_secret, grant_type } = req.body as TokenRequest;

            // Validate request
            if (!client_id || !client_secret || !grant_type) {
                const error: ErrorResponse = {
                    error: 'invalid_request',
                    error_description: 'Missing required parameters: client_id, client_secret, grant_type',
                };
                res.status(400).json(error);
                return;
            }

            if (grant_type !== 'client_credentials') {
                const error: ErrorResponse = {
                    error: 'unsupported_grant_type',
                    error_description: 'Only client_credentials grant type is supported',
                };
                res.status(400).json(error);
                return;
            }

            // Authenticate and generate tokens
            const tokenResponse = await this.authService.createTokenResponse(client_id, client_secret);

            if (!tokenResponse) {
                const error: ErrorResponse = {
                    error: 'invalid_client',
                    error_description: 'Client authentication failed',
                };
                res.status(401).json(error);
                return;
            }

            res.status(200).json(tokenResponse);
        } catch (error) {
            console.error('Error in token endpoint:', error);
            const errorResponse: ErrorResponse = {
                error: 'server_error',
                error_description: 'An unexpected error occurred',
            };
            res.status(500).json(errorResponse);
        }
    };

    /**
     * POST /auth/refresh - Refresh Token Flow
     * Request body: { refresh_token, grant_type: "refresh_token" }
     */
    refresh = async (req: Request, res: Response): Promise<void> => {
        try {
            const { refresh_token, grant_type } = req.body as RefreshTokenRequest;

            // Validate request
            if (!refresh_token || !grant_type) {
                const error: ErrorResponse = {
                    error: 'invalid_request',
                    error_description: 'Missing required parameters: refresh_token, grant_type',
                };
                res.status(400).json(error);
                return;
            }

            if (grant_type !== 'refresh_token') {
                const error: ErrorResponse = {
                    error: 'unsupported_grant_type',
                    error_description: 'Only refresh_token grant type is supported',
                };
                res.status(400).json(error);
                return;
            }

            // Refresh access token
            const tokenResponse = await this.authService.refreshAccessToken(refresh_token);

            if (!tokenResponse) {
                const error: ErrorResponse = {
                    error: 'invalid_grant',
                    error_description: 'Invalid or expired refresh token',
                };
                res.status(401).json(error);
                return;
            }

            res.status(200).json(tokenResponse);
        } catch (error) {
            console.error('Error in refresh endpoint:', error);
            const errorResponse: ErrorResponse = {
                error: 'server_error',
                error_description: 'An unexpected error occurred',
            };
            res.status(500).json(errorResponse);
        }
    };

    /**
     * POST /auth/revoke - Revoke a token
     * Request body: { token }
     */
    revoke = async (req: Request, res: Response): Promise<void> => {
        try {
            const { token } = req.body;

            if (!token) {
                const error: ErrorResponse = {
                    error: 'invalid_request',
                    error_description: 'Missing required parameter: token',
                };
                res.status(400).json(error);
                return;
            }

            // Find and revoke session
            const session = this.authService.validateAccessToken(token);
            if (session) {
                this.authService.revokeSession(session.id);
            }

            // Always return 200 for security (don't reveal if token exists)
            res.status(200).json({ message: 'Token revoked successfully' });
        } catch (error) {
            console.error('Error in revoke endpoint:', error);
            const errorResponse: ErrorResponse = {
                error: 'server_error',
                error_description: 'An unexpected error occurred',
            };
            res.status(500).json(errorResponse);
        }
    };
}
