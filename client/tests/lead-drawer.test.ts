import { describe, it, expect } from 'vitest';

describe('Task 9: Lead Detail & Quick Reply Drawers', () => {
  it('exports LeadDetailDrawer component', async () => {
    const mod = await import('../src/components/LeadDetailDrawer.js');
    expect(mod.LeadDetailDrawer).toBeDefined();
    expect(typeof mod.LeadDetailDrawer).toBe('function');
  });

  it('exports QuickReplyDrawer component', async () => {
    const mod = await import('../src/components/QuickReplyDrawer.js');
    expect(mod.QuickReplyDrawer).toBeDefined();
    expect(typeof mod.QuickReplyDrawer).toBe('function');
  });
});
