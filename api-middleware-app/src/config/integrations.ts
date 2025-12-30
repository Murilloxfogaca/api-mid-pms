/**
 * Integration Configuration System
 *
 * Manages configurations for different external systems/integrations
 */

export interface IntegrationAuth {
    type: 'none' | 'basic' | 'bearer' | 'oauth2' | 'api_key';
    credentials?: {
        username?: string;
        password?: string;
        token?: string;
        apiKey?: string;
        clientId?: string;
        clientSecret?: string;
    };
    headers?: Record<string, string>;
}

export interface IntegrationEndpoint {
    path: string;
    method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    transformer?: string;
}

export interface IntegrationConfig {
    name: string;
    enabled: boolean;
    baseUrl: string;
    auth: IntegrationAuth;
    endpoints: Record<string, IntegrationEndpoint>;
    timeout?: number;
    retries?: number;
    rateLimit?: {
        maxRequests: number;
        windowMs: number;
    };
    webhooks?: {
        enabled: boolean;
        secret?: string; // For HMAC validation
        events?: string[];
    };
}

export type IntegrationsConfig = Record<string, IntegrationConfig>;

/**
 * Default integrations configuration
 * Can be overridden via environment variables or external config file
 */
export const defaultIntegrations: IntegrationsConfig = {
    // Example: Booking Engine Integration
    booking_engine: {
        name: 'Booking Engine',
        enabled: true,
        baseUrl: process.env.BOOKING_ENGINE_URL || 'https://api.booking-engine.example.com',
        auth: {
            type: 'api_key',
            credentials: {
                apiKey: process.env.BOOKING_ENGINE_API_KEY || ''
            },
            headers: {
                'X-API-Key': process.env.BOOKING_ENGINE_API_KEY || ''
            }
        },
        endpoints: {
            createReservation: {
                path: '/v1/reservations',
                method: 'POST',
                transformer: 'BookingReservationTransformer'
            },
            getReservation: {
                path: '/v1/reservations/{id}',
                method: 'GET'
            },
            updateReservation: {
                path: '/v1/reservations/{id}',
                method: 'PUT',
                transformer: 'BookingReservationTransformer'
            },
            cancelReservation: {
                path: '/v1/reservations/{id}',
                method: 'DELETE'
            }
        },
        timeout: 30000,
        retries: 3,
        rateLimit: {
            maxRequests: 100,
            windowMs: 60000 // 1 minute
        },
        webhooks: {
            enabled: true,
            secret: process.env.BOOKING_ENGINE_WEBHOOK_SECRET,
            events: ['reservation.created', 'reservation.updated', 'reservation.cancelled']
        }
    },

    // Example: PMS System Integration
    pms_system: {
        name: 'PMS System',
        enabled: true,
        baseUrl: process.env.PMS_SYSTEM_URL || 'https://api.pms.example.com',
        auth: {
            type: 'bearer',
            credentials: {
                token: process.env.PMS_SYSTEM_TOKEN || ''
            }
        },
        endpoints: {
            syncGuest: {
                path: '/api/guests',
                method: 'POST',
                transformer: 'PMSGuestTransformer'
            },
            syncReservation: {
                path: '/api/reservations',
                method: 'POST',
                transformer: 'PMSReservationTransformer'
            },
            updateRoom: {
                path: '/api/rooms/{id}',
                method: 'PUT'
            }
        },
        timeout: 20000,
        retries: 2,
        webhooks: {
            enabled: false
        }
    },

    // Example: Channel Manager Integration
    channel_manager: {
        name: 'Channel Manager',
        enabled: false,
        baseUrl: process.env.CHANNEL_MANAGER_URL || 'https://api.channelmanager.example.com',
        auth: {
            type: 'oauth2',
            credentials: {
                clientId: process.env.CHANNEL_MANAGER_CLIENT_ID,
                clientSecret: process.env.CHANNEL_MANAGER_CLIENT_SECRET
            }
        },
        endpoints: {
            updateAvailability: {
                path: '/v1/availability',
                method: 'POST'
            },
            updatePricing: {
                path: '/v1/pricing',
                method: 'POST'
            }
        },
        timeout: 15000,
        retries: 3
    }
};

/**
 * Integration Manager Class
 */
export class IntegrationManager {
    private integrations: IntegrationsConfig;

    constructor(customConfig?: IntegrationsConfig) {
        this.integrations = customConfig || defaultIntegrations;
    }

    /**
     * Get configuration for a specific integration
     */
    getIntegration(name: string): IntegrationConfig | undefined {
        return this.integrations[name];
    }

    /**
     * Check if an integration is enabled
     */
    isEnabled(name: string): boolean {
        const integration = this.getIntegration(name);
        return integration?.enabled || false;
    }

    /**
     * Get endpoint configuration
     */
    getEndpoint(integrationName: string, endpointName: string): IntegrationEndpoint | undefined {
        const integration = this.getIntegration(integrationName);
        return integration?.endpoints[endpointName];
    }

    /**
     * Build full URL for an endpoint
     */
    buildUrl(integrationName: string, endpointName: string, params?: Record<string, string>): string | null {
        const integration = this.getIntegration(integrationName);
        const endpoint = this.getEndpoint(integrationName, endpointName);

        if (!integration || !endpoint) {
            return null;
        }

        let path = endpoint.path;

        // Replace path parameters
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                path = path.replace(`{${key}}`, encodeURIComponent(value));
            });
        }

        return `${integration.baseUrl}${path}`;
    }

    /**
     * Get authentication headers for an integration
     */
    getAuthHeaders(integrationName: string): Record<string, string> {
        const integration = this.getIntegration(integrationName);
        if (!integration) {
            return {};
        }

        const headers: Record<string, string> = { ...integration.auth.headers } || {};
        const { type, credentials } = integration.auth;

        switch (type) {
            case 'bearer':
                if (credentials?.token) {
                    headers['Authorization'] = `Bearer ${credentials.token}`;
                }
                break;

            case 'basic':
                if (credentials?.username && credentials?.password) {
                    const encoded = Buffer.from(`${credentials.username}:${credentials.password}`).toString('base64');
                    headers['Authorization'] = `Basic ${encoded}`;
                }
                break;

            case 'api_key':
                if (credentials?.apiKey && !headers['X-API-Key']) {
                    headers['X-API-Key'] = credentials.apiKey;
                }
                break;
        }

        return headers;
    }

    /**
     * Get all enabled integrations
     */
    getEnabledIntegrations(): string[] {
        return Object.entries(this.integrations)
            .filter(([_, config]) => config.enabled)
            .map(([name, _]) => name);
    }

    /**
     * Get integrations that have webhooks enabled
     */
    getWebhookEnabledIntegrations(): string[] {
        return Object.entries(this.integrations)
            .filter(([_, config]) => config.enabled && config.webhooks?.enabled)
            .map(([name, _]) => name);
    }

    /**
     * Validate webhook signature (HMAC)
     */
    validateWebhookSignature(integrationName: string, payload: string, signature: string): boolean {
        const integration = this.getIntegration(integrationName);
        const secret = integration?.webhooks?.secret;

        if (!secret) {
            return false;
        }

        const crypto = require('crypto');
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(payload)
            .digest('hex');

        return crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        );
    }
}

// Singleton instance
export const integrationManager = new IntegrationManager();
