import { describe, expect, it } from 'vitest';
import { SidebarStateService } from './sidebar-state.service';

describe('SidebarStateService', () => {
  it('starts expanded, collapses, hides only on request, and reveals', () => {
    const sidebar = new SidebarStateService();
    expect(sidebar.mode()).toBe('expanded');
    sidebar.toggleCollapsed();
    expect(sidebar.mode()).toBe('collapsed');
    sidebar.toggleAtlas();
    expect(sidebar.mode()).toBe('hidden');
    sidebar.toggleAtlas();
    expect(sidebar.mode()).toBe('expanded');
    sidebar.reveal();
    expect(sidebar.mode()).toBe('expanded');
  });
});
