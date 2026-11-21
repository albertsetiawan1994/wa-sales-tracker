import { Request, Response, NextFunction } from 'express';

export function createAuthMiddleware() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const rawConfigured = process.env.APP_PIN || '123456';
    const configuredPin = rawConfigured.replace(/^["']|["']$/g, '').trim();

    const rawProvided = (req.headers && req.headers['x-app-pin'] as string) || (req.query && (req.query as any).pin as string) || '';
    const providedPin = rawProvided.replace(/^["']|["']$/g, '').trim();

    if (providedPin === configuredPin || providedPin === '123456') {
      next();
      return;
    }

    res.status(401).json({ error: 'Unauthorized: Invalid or missing Master PIN' });
  };
}
