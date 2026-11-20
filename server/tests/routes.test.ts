import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import { createAuthMiddleware } from '../src/routes/auth.js';

describe('Task 4: REST API & Auth Protection Middleware', () => {
  it('protects routes with Master PIN middleware', async () => {
    const app = express();
    process.env.APP_PIN = '123456';
    app.use(express.json());
    app.use(createAuthMiddleware());

    app.get('/protected', (_req, res) => {
      res.json({ ok: true });
    });

    // 1. Without pin header -> 401 Unauthorized
    const res1 = await fetch('http://localhost:0/protected').catch(() => null);
    // Directly test the middleware function
    const mockReq = { headers: {} } as any;
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
    } as any;
    const mockNext = vi.fn();

    const mw = createAuthMiddleware();
    mw(mockReq, mockRes, mockNext);

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();

    // 2. With valid PIN header
    const mockReqValid = { headers: { 'x-app-pin': '123456' } } as any;
    const mockResValid = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const mockNextValid = vi.fn();

    mw(mockReqValid, mockResValid, mockNextValid);
    expect(mockNextValid).toHaveBeenCalled();
  });
});
