import { Router } from 'express';
import { getExampleData } from '../controllers';
import { createAuthRoutes } from './auth';
import { createWebhookRoutes } from './webhooks';
import { createProxyRoutes } from './proxy';
import Database from 'better-sqlite3';

/**
 * Create main router with all routes
 */
export const createRouter = (db: Database.Database): Router => {
    const router = Router();

    // Authentication routes
    router.use('/auth', createAuthRoutes(db));

    // Webhook routes (no auth required - validated by signature)
    router.use('/webhooks', createWebhookRoutes());

    // Proxy routes (authenticated)
    router.use('/proxy', createProxyRoutes(db));

    // Example route
    router.get('/example', getExampleData);

    // Health check endpoint
    router.get('/health', (req, res) => {
        res.status(200).json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime()
        });
    });

    return router;
};

// For backward compatibility
export default createRouter;