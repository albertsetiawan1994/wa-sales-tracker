import { Request, Response, NextFunction } from 'express';

export function createAuthMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const configuredPin = process.env.APP_PIN;
    if (!configuredPin) {
      // If no PIN is configured in environment, allow all (dev mode)
      next();
      return;
    }

    const providedPin = req.headers['x-app-pin'];
    if (providedPin !== configuredPin) {
      res.status(401).json({ error: 'Unauthorized: Invalid or missing Master PIN' });
      return;
    }

    next();
  };
}
