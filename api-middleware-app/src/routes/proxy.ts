/**
 * Proxy Routes
 */

import { Router } from 'express';
import { ProxyController } from '../controllers/proxyController';
import { createAuthMiddleware } from '../middleware/authentication';
import Database from 'better-sqlite3';

export const createProxyRoutes = (db: Database.Database): Router => {
    const router = Router();
    const proxyController = new ProxyController();
    const authMiddleware = createAuthMiddleware(db);

    /**
     * GET /proxy/integrations
     * List all available integrations
     *
     * Public endpoint (no auth required)
     */
    router.get('/integrations', proxyController.listIntegrations);

    /**
     * GET /proxy/:integration/status
     * Get integration connection status
     *
     * Requires authentication
     */
    router.get('/:integration/status', authMiddleware, proxyController.getStatus);

    /**
     * POST /proxy/:integration/:endpoint
     * Forward POST request to integration endpoint
     *
     * Requires authentication
     * Automatically applies data transformation if configured
     */
    router.post('/:integration/:endpoint', authMiddleware, proxyController.forward);

    /**
     * GET /proxy/:integration/:endpoint
     * Forward GET request to integration endpoint
     *
     * Requires authentication
     */
    router.get('/:integration/:endpoint', authMiddleware, proxyController.forward);

    /**
     * PUT /proxy/:integration/:endpoint
     * Forward PUT request to integration endpoint
     *
     * Requires authentication
     * Automatically applies data transformation if configured
     */
    router.put('/:integration/:endpoint', authMiddleware, proxyController.forward);

    /**
     * PATCH /proxy/:integration/:endpoint
     * Forward PATCH request to integration endpoint
     *
     * Requires authentication
     */
    router.patch('/:integration/:endpoint', authMiddleware, proxyController.forward);

    /**
     * DELETE /proxy/:integration/:endpoint
     * Forward DELETE request to integration endpoint
     *
     * Requires authentication
     */
    router.delete('/:integration/:endpoint', authMiddleware, proxyController.forward);

    return router;
};
