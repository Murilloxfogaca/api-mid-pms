import express from 'express';
import { json } from 'body-parser';
import { setupRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { logging } from './middleware/logging';
import { rateLimiter } from './middleware/rateLimiter';
import { authenticate } from './middleware/authentication';
import { config } from './config';

const app = express();
const PORT = config.port || 3000;

app.use(json());
app.use(logging);
app.use(rateLimiter);
app.use(authenticate);

setupRoutes(app);

app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});