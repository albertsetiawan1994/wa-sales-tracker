import { describe, it, expect } from 'vitest';

describe('Task 8: Sales Kanban, Table & Header Components', () => {
  it('exports KanbanBoard component', async () => {
    const mod = await import('../src/components/KanbanBoard.js');
    expect(mod.KanbanBoard).toBeDefined();
    expect(typeof mod.KanbanBoard).toBe('function');
  });

  it('exports ContactTable component', async () => {
    const mod = await import('../src/components/ContactTable.js');
    expect(mod.ContactTable).toBeDefined();
    expect(typeof mod.ContactTable).toBe('function');
  });

  it('exports HeaderBar component', async () => {
    const mod = await import('../src/components/HeaderBar.js');
    expect(mod.HeaderBar).toBeDefined();
    expect(typeof mod.HeaderBar).toBe('function');
  });
});
