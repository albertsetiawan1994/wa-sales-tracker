import { describe, it, expect } from 'vitest';

describe('Task 7: Triage Inbox Module & Filtering Logic', () => {
  it('exports TriageInbox component', async () => {
    const mod = await import('../src/components/TriageInbox.js');
    expect(mod.TriageInbox).toBeDefined();
    expect(typeof mod.TriageInbox).toBe('function');
  });
});
