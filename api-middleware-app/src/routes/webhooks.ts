/**
 * Webhook Routes
 */

import { Router } from 'express';
import { WebhookController } from '../controllers/webhookController';

export const createWebhookRoutes = (): Router => {
    const router = Router();
    const webhookController = new WebhookController();

    /**
     * POST /webhooks/:integration
     * Generic webhook receiver
     *
     * Receives webhooks from any configured integration
     */
    router.post('/:integration', webhookController.receive);

    /**
     * POST /webhooks/:integration/:event
     * Event-specific webhook receiver
     *
     * Receives webhooks for specific events
     * Example: POST /webhooks/booking_engine/reservation.created
     */
    router.post('/:integration/:event', webhookController.receiveEvent);

    return router;
};
