import { Request, Response, NextFunction } from 'express';
import { authenticate } from '../../src/middleware/authentication';

describe('Authentication Middleware', () => {
    it('should call next() if the token is valid', () => {
        const req = {
            headers: {
                authorization: 'Bearer validToken'
            }
        } as Request;
        const res = {} as Response;
        const next = jest.fn();

        authenticate(req, res, next);

        expect(next).toHaveBeenCalled();
    });

    it('should return 401 if the token is missing', () => {
        const req = {
            headers: {}
        } as Request;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as unknown as Response;
        const next = jest.fn();

        authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'No token provided' });
        expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 if the token is invalid', () => {
        const req = {
            headers: {
                authorization: 'Bearer invalidToken'
            }
        } as Request;
        const res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        } as unknown as Response;
        const next = jest.fn();

        authenticate(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ message: 'Invalid token' });
        expect(next).not.toHaveBeenCalled();
    });
});