import { describe, it, expect, vi } from 'vitest';
import express from 'express';
import { createAuthMiddleware } from '../src/routes/auth.js';
import { verifyWsAuth } from '../src/ws/gateway.js';

describe('Task 4 & Security Review: Auth Protection Middleware & WebSocket Security', () => {
  it('protects routes with Master PIN middleware', async () => {
    process.env.APP_PIN = '123456';

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

    const mockReqValid = { headers: { 'x-app-pin': '123456' } } as any;
    const mockResValid = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
    const mockNextValid = vi.fn();

    mw(mockReqValid, mockResValid, mockNextValid);
    expect(mockNextValid).toHaveBeenCalled();
  });

  it('validates Master PIN on WebSocket connection handshake', () => {
    process.env.APP_PIN = 'secret123';

    // 1. Missing PIN
    const mockReqNoPin = { url: '/ws', headers: {} };
    expect(verifyWsAuth(mockReqNoPin as any)).toBe(false);

    // 2. Wrong PIN
    const mockReqWrongPin = { url: '/ws?pin=wrong', headers: {} };
    expect(verifyWsAuth(mockReqWrongPin as any)).toBe(false);

    // 3. Valid PIN via query param
    const mockReqValidQuery = { url: '/ws?pin=secret123', headers: {} };
    expect(verifyWsAuth(mockReqValidQuery as any)).toBe(true);

    // 4. Valid PIN via header
    const mockReqValidHeader = { url: '/ws', headers: { 'x-app-pin': 'secret123' } };
    expect(verifyWsAuth(mockReqValidHeader as any)).toBe(true);
  });
});
