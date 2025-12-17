import { Request, Response, NextFunction } from 'express';

const loggingMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const { method, url } = req;
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${method} request to ${url}`);
    next();
};

export default loggingMiddleware;