import express from 'express';
import { setupMiddleware } from './middleware';
import { setupRoutes } from './routes';
import { config } from './config';

const app = express();

// Setup middleware
setupMiddleware(app);

// Setup routes
setupRoutes(app);

// Start the server
const PORT = config.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});