/**
 * Structured Logger using Winston
 */

import winston from 'winston';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';
const nodeEnv = process.env.NODE_ENV || 'development';

// Define log format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
);

// Console format for development
const consoleFormat = winston.format.combine(
    winston.format.colorize(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(meta).length > 0) {
            msg += ` ${JSON.stringify(meta)}`;
        }
        return msg;
    })
);

// Create logger instance
const logger = winston.createLogger({
    level: logLevel,
    format: logFormat,
    defaultMeta: { service: 'api-middleware' },
    transports: [
        // Write all logs to console
        new winston.transports.Console({
            format: nodeEnv === 'development' ? consoleFormat : logFormat
        }),

        // Write errors to error.log
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        }),

        // Write all logs to combined.log
        new winston.transports.File({
            filename: path.join(process.cwd(), 'logs', 'combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
        })
    ],
    // Don't exit on uncaught exceptions
    exitOnError: false
});

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Log HTTP request
 */
export const logRequest = (
    method: string,
    url: string,
    statusCode?: number,
    duration?: number,
    meta?: object
) => {
    logger.info('HTTP Request', {
        method,
        url,
        statusCode,
        duration,
        ...meta
    });
};

/**
 * Log integration call
 */
export const logIntegration = (
    integration: string,
    action: string,
    status: 'success' | 'error',
    meta?: object
) => {
    const logFn = status === 'error' ? logger.error : logger.info;
    logFn('Integration Call', {
        integration,
        action,
        status,
        ...meta
    });
};

/**
 * Log webhook received
 */
export const logWebhook = (
    integration: string,
    event: string,
    meta?: object
) => {
    logger.info('Webhook Received', {
        integration,
        event,
        ...meta
    });
};

/**
 * Log data transformation
 */
export const logTransformation = (
    transformer: string,
    status: 'success' | 'error',
    meta?: object
) => {
    const logFn = status === 'error' ? logger.error : logger.info;
    logFn('Data Transformation', {
        transformer,
        status,
        ...meta
    });
};

export default logger;
