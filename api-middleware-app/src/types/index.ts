import { Request } from 'express';

export interface MiddlewareResponse {
    status: number;
    message: string;
}

export interface User {
    id: string;
    username: string;
    email: string;
}

export interface AuthRequest extends Request {
    user?: User;
    client?: OAuthClient;
}

export interface RateLimit {
    limit: number;
    remaining: number;
    reset: number;
}

export interface Config {
    port: number;
    jwtSecret: string;
    apiBaseUrl: string;
}

// OAuth Types
export interface OAuthClient {
    id: number;
    client_id: string;
    client_secret_hash: string;
    name: string;
    description?: string;
    is_active: number;
    created_at: string;
    updated_at: string;
}

export interface OAuthSession {
    id: number;
    client_id: number;
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_at: string;
    refresh_expires_at: string;
    is_revoked: number;
    created_at: string;
}

export interface TokenRequest {
    client_id: string;
    client_secret: string;
    grant_type: 'client_credentials';
}

export interface RefreshTokenRequest {
    refresh_token: string;
    grant_type: 'refresh_token';
}

export interface TokenResponse {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
}

export interface ErrorResponse {
    error: string;
    error_description?: string;
}