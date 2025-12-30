import express from 'express';
import { json } from 'body-parser';
import errorHandler from './middleware/errorHandler';
import loggingMiddleware from './middleware/logging';
import { rateLimiter } from './middleware/rateLimiter';
import config from './config';

const app = express();
const PORT = config.port || 3000;

app.use(json());
app.use(loggingMiddleware);
app.use(rateLimiter);

// Routes will be setup via createRouter(db) in a proper setup
// For now, just add a simple health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});