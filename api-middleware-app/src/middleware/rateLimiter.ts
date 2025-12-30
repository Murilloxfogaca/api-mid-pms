import { Request, Response, NextFunction } from 'express';

const RATE_LIMIT = 100; // Maximum number of requests
const TIME_WINDOW = 60 * 1000; // Time window in milliseconds (1 minute)

const requestCounts: { [key: string]: number } = {};
const requestTimestamps: { [key: string]: number } = {};

export const rateLimiter = (req: Request, res: Response, next: NextFunction) => {
    const userIp = req.ip || req.socket.remoteAddress || 'unknown';

    const currentTime = Date.now();

    if (!requestCounts[userIp]) {
        requestCounts[userIp] = 0;
        requestTimestamps[userIp] = currentTime;
    }

    const timeElapsed = currentTime - requestTimestamps[userIp];

    if (timeElapsed > TIME_WINDOW) {
        requestCounts[userIp] = 1;
        requestTimestamps[userIp] = currentTime;
    } else {
        requestCounts[userIp]++;
    }

    if (requestCounts[userIp] > RATE_LIMIT) {
        return res.status(429).json({ message: 'Too many requests, please try again later.' });
    }

    next();
};