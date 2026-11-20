import { describe, it, expect } from 'vitest';

describe('Task 6: QR Connect Card & Pin Lock Logic', () => {
  it('exports QrConnectCard component function', async () => {
    const mod = await import('../src/components/QrConnectCard.js');
    expect(mod.QrConnectCard).toBeDefined();
    expect(typeof mod.QrConnectCard).toBe('function');
  });

  it('exports PinLockModal component function', async () => {
    const mod = await import('../src/components/PinLockModal.js');
    expect(mod.PinLockModal).toBeDefined();
    expect(typeof mod.PinLockModal).toBe('function');
  });
});
