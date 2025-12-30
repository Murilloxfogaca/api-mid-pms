/**
 * Robust HTTP Client with Retry Logic
 *
 * Features:
 * - Automatic retries with exponential backoff
 * - Configurable timeouts
 * - Request/Response logging
 * - Error handling
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import axiosRetry from 'axios-retry';
import { integrationManager, IntegrationConfig } from '../config/integrations';
import logger, { logIntegration } from '../utils/logger';

export interface HttpClientOptions {
    integration: string;
    timeout?: number;
    retries?: number;
    logRequests?: boolean;
}

export class HttpClient {
    private client: AxiosInstance;
    private integration: IntegrationConfig;
    private integrationName: string;
    private logRequests: boolean;

    constructor(options: HttpClientOptions) {
        this.integrationName = options.integration;
        const integration = integrationManager.getIntegration(options.integration);

        if (!integration) {
            throw new Error(`Integration "${options.integration}" not found`);
        }

        this.integration = integration;
        this.logRequests = options.logRequests !== false;

        // Create axios instance
        this.client = axios.create({
            baseURL: integration.baseUrl,
            timeout: options.timeout || integration.timeout || 30000,
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'API-Middleware/1.0',
                ...integrationManager.getAuthHeaders(options.integration)
            }
        });

        // Configure retry logic
        const retries = options.retries !== undefined ? options.retries : integration.retries || 3;

        axiosRetry(this.client, {
            retries,
            retryDelay: axiosRetry.exponentialDelay,
            retryCondition: (error: AxiosError) => {
                // Retry on network errors and 5xx errors
                return axiosRetry.isNetworkOrIdempotentRequestError(error) ||
                    (error.response?.status !== undefined && error.response.status >= 500);
            },
            onRetry: (retryCount, error, requestConfig) => {
                logger.warn('Retrying request', {
                    integration: this.integrationName,
                    retryCount,
                    url: requestConfig.url,
                    error: error.message
                });
            }
        });

        // Request interceptor
        this.client.interceptors.request.use(
            (config) => {
                if (this.logRequests) {
                    logger.debug('HTTP Request', {
                        integration: this.integrationName,
                        method: config.method?.toUpperCase(),
                        url: config.url,
                        headers: this.sanitizeHeaders(config.headers || {})
                    });
                }
                return config;
            },
            (error) => {
                logger.error('Request interceptor error', {
                    integration: this.integrationName,
                    error: error.message
                });
                return Promise.reject(error);
            }
        );

        // Response interceptor
        this.client.interceptors.response.use(
            (response) => {
                if (this.logRequests) {
                    logger.debug('HTTP Response', {
                        integration: this.integrationName,
                        status: response.status,
                        url: response.config.url
                    });
                }
                return response;
            },
            (error) => {
                this.handleError(error);
                return Promise.reject(error);
            }
        );
    }

    /**
     * Sanitize headers (remove sensitive data from logs)
     */
    private sanitizeHeaders(headers: any): any {
        const sanitized = { ...headers };
        const sensitiveHeaders = ['authorization', 'x-api-key', 'cookie'];

        sensitiveHeaders.forEach(header => {
            if (sanitized[header]) {
                sanitized[header] = '***REDACTED***';
            }
        });

        return sanitized;
    }

    /**
     * Handle HTTP errors
     */
    private handleError(error: AxiosError): void {
        if (error.response) {
            // Server responded with error status
            logIntegration(
                this.integrationName,
                error.config?.url || 'unknown',
                'error',
                {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                }
            );
        } else if (error.request) {
            // Request was made but no response received
            logIntegration(
                this.integrationName,
                error.config?.url || 'unknown',
                'error',
                {
                    error: 'No response received',
                    message: error.message
                }
            );
        } else {
            // Error setting up the request
            logIntegration(
                this.integrationName,
                'setup',
                'error',
                {
                    error: error.message
                }
            );
        }
    }

    /**
     * GET request
     */
    async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.get<T>(url, config);
    }

    /**
     * POST request
     */
    async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.post<T>(url, data, config);
    }

    /**
     * PUT request
     */
    async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.put<T>(url, data, config);
    }

    /**
     * PATCH request
     */
    async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.patch<T>(url, data, config);
    }

    /**
     * DELETE request
     */
    async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        return this.client.delete<T>(url, config);
    }

    /**
     * Make a request to a configured endpoint
     */
    async callEndpoint<T = any>(
        endpointName: string,
        data?: any,
        params?: Record<string, string>
    ): Promise<AxiosResponse<T>> {
        const endpoint = integrationManager.getEndpoint(this.integrationName, endpointName);

        if (!endpoint) {
            throw new Error(`Endpoint "${endpointName}" not found in integration "${this.integrationName}"`);
        }

        const url = integrationManager.buildUrl(this.integrationName, endpointName, params);

        if (!url) {
            throw new Error(`Could not build URL for endpoint "${endpointName}"`);
        }

        const method = endpoint.method || 'GET';
        const urlPath = url.replace(this.integration.baseUrl, '');

        switch (method) {
            case 'GET':
                return this.get<T>(urlPath);
            case 'POST':
                return this.post<T>(urlPath, data);
            case 'PUT':
                return this.put<T>(urlPath, data);
            case 'PATCH':
                return this.patch<T>(urlPath, data);
            case 'DELETE':
                return this.delete<T>(urlPath);
            default:
                throw new Error(`Unsupported HTTP method: ${method}`);
        }
    }
}

/**
 * Factory function to create HTTP clients for integrations
 */
export function createHttpClient(integration: string, options?: Partial<HttpClientOptions>): HttpClient {
    return new HttpClient({
        integration,
        ...options
    });
}
