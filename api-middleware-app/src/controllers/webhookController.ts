/**
 * Webhook Controller
 *
 * Handles incoming webhooks from external systems
 */

import { Request, Response } from 'express';
import { integrationManager } from '../config/integrations';
import { transformerRegistry } from '../transformers/registry';
import logger, { logWebhook } from '../utils/logger';
import crypto from 'crypto';

export class WebhookController {
    /**
     * Generic webhook receiver
     * POST /webhooks/:integration
     */
    receive = async (req: Request, res: Response): Promise<void> => {
        const integration = req.params.integration;
        const event = req.body.event || 'unknown';

        try {
            // Check if integration exists and has webhooks enabled
            if (!integrationManager.isEnabled(integration)) {
                res.status(404).json({
                    error: 'integration_not_found',
                    message: `Integration "${integration}" not found or disabled`
                });
                return;
            }

            const config = integrationManager.getIntegration(integration);
            if (!config?.webhooks?.enabled) {
                res.status(400).json({
                    error: 'webhooks_disabled',
                    message: `Webhooks not enabled for integration "${integration}"`
                });
                return;
            }

            // Validate webhook signature if secret is configured
            const signature = req.headers['x-webhook-signature'] as string;
            if (config.webhooks.secret && signature) {
                const isValid = this.validateSignature(
                    JSON.stringify(req.body),
                    signature,
                    config.webhooks.secret
                );

                if (!isValid) {
                    logWebhook(integration, event, { status: 'signature_invalid' });
                    res.status(401).json({
                        error: 'invalid_signature',
                        message: 'Webhook signature validation failed'
                    });
                    return;
                }
            }

            // Log webhook received
            logWebhook(integration, event, {
                payload: req.body,
                headers: this.sanitizeHeaders(req.headers)
            });

            // Process webhook (can be extended with custom logic)
            const result = await this.processWebhook(integration, event, req.body);

            res.status(200).json({
                success: true,
                message: 'Webhook received and processed',
                data: result
            });

        } catch (error: any) {
            logger.error('Webhook processing error', {
                integration,
                event,
                error: error.message
            });

            res.status(500).json({
                error: 'webhook_processing_error',
                message: error.message
            });
        }
    };

    /**
     * Event-specific webhook receiver
     * POST /webhooks/:integration/:event
     */
    receiveEvent = async (req: Request, res: Response): Promise<void> => {
        const { integration, event } = req.params;

        try {
            // Check if integration exists
            if (!integrationManager.isEnabled(integration)) {
                res.status(404).json({
                    error: 'integration_not_found',
                    message: `Integration "${integration}" not found or disabled`
                });
                return;
            }

            const config = integrationManager.getIntegration(integration);

            // Check if event is allowed
            if (config?.webhooks?.events && !config.webhooks.events.includes(event)) {
                res.status(400).json({
                    error: 'event_not_allowed',
                    message: `Event "${event}" not allowed for this integration`
                });
                return;
            }

            // Validate signature
            const signature = req.headers['x-webhook-signature'] as string;
            if (config?.webhooks?.secret && signature) {
                const isValid = this.validateSignature(
                    JSON.stringify(req.body),
                    signature,
                    config.webhooks.secret
                );

                if (!isValid) {
                    res.status(401).json({
                        error: 'invalid_signature',
                        message: 'Webhook signature validation failed'
                    });
                    return;
                }
            }

            logWebhook(integration, event, { payload: req.body });

            // Process event-specific webhook
            const result = await this.processWebhook(integration, event, req.body);

            res.status(200).json({
                success: true,
                event,
                data: result
            });

        } catch (error: any) {
            logger.error('Event webhook error', {
                integration,
                event,
                error: error.message
            });

            res.status(500).json({
                error: 'webhook_error',
                message: error.message
            });
        }
    };

    /**
     * Process webhook data (can be customized per integration/event)
     */
    private async processWebhook(
        integration: string,
        event: string,
        payload: any
    ): Promise<any> {
        // This is where you can add custom logic for processing webhooks
        // For example:
        // - Apply data transformations
        // - Forward to another system
        // - Store in database
        // - Trigger business logic

        logger.info('Processing webhook', {
            integration,
            event,
            payloadKeys: Object.keys(payload || {})
        });

        // Example: Return processed data
        return {
            processed: true,
            timestamp: new Date().toISOString(),
            event,
            integration
        };
    }

    /**
     * Validate HMAC signature
     */
    private validateSignature(payload: string, signature: string, secret: string): boolean {
        try {
            const expectedSignature = crypto
                .createHmac('sha256', secret)
                .update(payload)
                .digest('hex');

            return crypto.timingSafeEqual(
                Buffer.from(signature),
                Buffer.from(expectedSignature)
            );
        } catch (error) {
            return false;
        }
    }

    /**
     * Sanitize headers for logging
     */
    private sanitizeHeaders(headers: any): any {
        const sanitized = { ...headers };
        const sensitiveHeaders = ['authorization', 'x-api-key', 'x-webhook-signature'];

        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = '***REDACTED***';
            }
        });

        return sanitized;
    }
}
