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