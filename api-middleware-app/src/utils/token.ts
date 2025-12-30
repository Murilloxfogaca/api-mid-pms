import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import config from '../config';

export interface TokenPayload {
    clientId: string;
    type: 'access' | 'refresh';
    jti: string; // JWT ID for uniqueness
    iat?: number;
    exp?: number;
}

/**
 * Generate a JWT access token
 */
export const generateAccessToken = (clientId: string, expiresIn: number = 3600): string => {
    const payload: TokenPayload = {
        clientId,
        type: 'access',
        jti: crypto.randomBytes(16).toString('hex'), // Unique identifier
    };

    return jwt.sign(payload, config.jwtSecret, {
        expiresIn, // in seconds
    });
};

/**
 * Generate a random refresh token (UUID v4)
 */
export const generateRefreshToken = (): string => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Verify and decode a JWT token
 */
export const verifyToken = (token: string): TokenPayload => {
    try {
        return jwt.verify(token, config.jwtSecret) as TokenPayload;
    } catch (error) {
        throw new Error('Invalid or expired token');
    }
};

/**
 * Decode a JWT token without verification (useful for debugging)
 */
export const decodeToken = (token: string): TokenPayload | null => {
    try {
        return jwt.decode(token) as TokenPayload;
    } catch (error) {
        return null;
    }
};

/**
 * Calculate expiration date from seconds
 */
export const getExpirationDate = (expiresInSeconds: number): Date => {
    return new Date(Date.now() + expiresInSeconds * 1000);
};
