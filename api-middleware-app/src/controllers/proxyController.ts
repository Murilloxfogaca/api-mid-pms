/**
 * Proxy Controller
 *
 * Forwards authenticated requests to external integrations
 */

import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import { integrationManager } from '../config/integrations';
import { transformerRegistry } from '../transformers/registry';
import { createHttpClient } from '../services/httpClient';
import logger, { logIntegration } from '../utils/logger';

export class ProxyController {
    /**
     * Forward request to integration endpoint
     * POST/GET/PUT/DELETE /proxy/:integration/:endpoint
     */
    forward = async (req: AuthRequest, res: Response): Promise<void> => {
        const { integration, endpoint } = req.params;
        const startTime = Date.now();

        try {
            // Validate integration
            if (!integrationManager.isEnabled(integration)) {
                res.status(404).json({
                    error: 'integration_not_found',
                    message: `Integration "${integration}" not found or disabled`
                });
                return;
            }

            // Validate endpoint
            const endpointConfig = integrationManager.getEndpoint(integration, endpoint);
            if (!endpointConfig) {
                res.status(404).json({
                    error: 'endpoint_not_found',
                    message: `Endpoint "${endpoint}" not found in integration "${integration}"`
                });
                return;
            }

            // Transform request data if transformer is configured
            let requestData = req.body;
            if (endpointConfig.transformer && requestData) {
                try {
                    requestData = transformerRegistry.transform(endpointConfig.transformer, requestData);
                } catch (transformError: any) {
                    logger.error('Request transformation error', {
                        integration,
                        endpoint,
                        transformer: endpointConfig.transformer,
                        error: transformError.message
                    });

                    res.status(400).json({
                        error: 'transformation_error',
                        message: 'Failed to transform request data',
                        details: transformError.message
                    });
                    return;
                }
            }

            // Create HTTP client and make request
            const client = createHttpClient(integration);
            const response = await client.callEndpoint(endpoint, requestData, req.query as any);

            // Log successful request
            const duration = Date.now() - startTime;
            logIntegration(integration, endpoint, 'success', {
                statusCode: response.status,
                duration,
                clientId: req.client?.client_id
            });

            // Return response
            res.status(response.status).json(response.data);

        } catch (error: any) {
            const duration = Date.now() - startTime;

            // Log error
            logIntegration(integration, endpoint, 'error', {
                error: error.message,
                statusCode: error.response?.status,
                duration,
                clientId: req.client?.client_id
            });

            // Return error response
            const statusCode = error.response?.status || 500;
            res.status(statusCode).json({
                error: 'proxy_error',
                message: error.message,
                details: error.response?.data || null
            });
        }
    };

    /**
     * Get integration status
     * GET /proxy/:integration/status
     */
    getStatus = async (req: Request, res: Response): Promise<void> => {
        const { integration } = req.params;

        try {
            const config = integrationManager.getIntegration(integration);

            if (!config) {
                res.status(404).json({
                    error: 'integration_not_found',
                    message: `Integration "${integration}" not found`
                });
                return;
            }

            // Test connection
            const client = createHttpClient(integration, { retries: 0, logRequests: false });
            let connectionStatus = 'unknown';

            try {
                await client.get('/');
                connectionStatus = 'connected';
            } catch (error: any) {
                connectionStatus = error.response ? 'reachable' : 'unreachable';
            }

            res.status(200).json({
                integration,
                name: config.name,
                enabled: config.enabled,
                baseUrl: config.baseUrl,
                connectionStatus,
                endpoints: Object.keys(config.endpoints),
                webhooks: {
                    enabled: config.webhooks?.enabled || false,
                    events: config.webhooks?.events || []
                }
            });

        } catch (error: any) {
            res.status(500).json({
                error: 'status_check_error',
                message: error.message
            });
        }
    };

    /**
     * List all available integrations
     * GET /proxy/integrations
     */
    listIntegrations = async (req: Request, res: Response): Promise<void> => {
        try {
            const enabledIntegrations = integrationManager.getEnabledIntegrations();
            const integrations = enabledIntegrations.map(name => {
                const config = integrationManager.getIntegration(name);
                return {
                    name,
                    displayName: config?.name,
                    baseUrl: config?.baseUrl,
                    endpoints: Object.keys(config?.endpoints || {}),
                    webhooksEnabled: config?.webhooks?.enabled || false
                };
            });

            res.status(200).json({
                count: integrations.length,
                integrations
            });

        } catch (error: any) {
            res.status(500).json({
                error: 'list_error',
                message: error.message
            });
        }
    };
}
