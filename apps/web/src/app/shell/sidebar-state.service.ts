import { Injectable, signal } from '@angular/core';

export type SidebarMode = 'expanded' | 'collapsed' | 'hidden';

@Injectable({ providedIn: 'root' })
export class SidebarStateService {
  readonly mode = signal<SidebarMode>('expanded');

  toggleCollapsed() {
    this.mode.update((mode) => mode === 'expanded' ? 'collapsed' : 'expanded');
  }

  toggleAtlas() {
    this.mode.update((mode) => mode === 'hidden' ? 'expanded' : 'hidden');
  }

  reveal() {
    this.mode.set('expanded');
  }
}
