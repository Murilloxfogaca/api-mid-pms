import { Request, Response } from 'express';

export const getExampleData = (req: Request, res: Response) => {
    res.json({ message: 'This is an example response from the controller.' });
};

// Additional controller functions can be added here as needed.