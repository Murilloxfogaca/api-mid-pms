/**
 * Main entry point
 *
 * To properly start the server with database:
 * 1. Import Database and getDatabaseConfig
 * 2. Create database connection
 * 3. Initialize transformers
 * 4. Setup routes with createRouter(db)
 *
 * For now, this file exports the server setup
 * See server.ts for a basic Express setup
 */

import express from 'express';
import Database from 'better-sqlite3';
import { getDatabaseConfig } from './config/database';
import { createRouter } from './routes';
import { initializeTransformers } from './transformers';
import config from './config';
import loggingMiddleware from './middleware/logging';
import { rateLimiter } from './middleware/rateLimiter';
import errorHandler from './middleware/errorHandler';

const app = express();

// Middleware
app.use(express.json());
app.use(loggingMiddleware);
app.use(rateLimiter);

// Database setup
const dbConfig = getDatabaseConfig(process.env.NODE_ENV || 'development');
const db = new Database(dbConfig.filename);

// Initialize transformers
initializeTransformers();

// Routes
app.use('/', createRouter(db));

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`Database: ${dbConfig.filename}`);
});

export default app;