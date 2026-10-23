import { Component, Input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-project-nav',
  imports: [RouterLink, RouterLinkActive],
  template: `<nav aria-label="Project views">
    @for (view of views; track view.path) {
      <a
        [routerLink]="['/projects', projectId, view.path]"
        routerLinkActive="active"
        ariaCurrentWhenActive="page"
        >{{ view.label }}</a
      >
    }
  </nav>`,
  styles: [
    `
      :host {
        display: block;
        min-width: 0;
      max-width: 100%;
      overflow: hidden;
      }
      nav {
        display: flex;
      max-width: 100%;
        gap: 0.25rem;
        overflow-x: auto;
        padding: 0.25rem 0 0.7rem;
        border-bottom: 1px solid var(--rule);
        scrollbar-width: thin;
      }
      a {
        position: relative;
        display: inline-flex;
        align-items: center;
        min-height: 2.75rem;
        padding: 0 0.8rem;
        border-radius: var(--radius-sm);
        color: var(--slate);
        font-weight: 650;
        text-decoration: none;
        white-space: nowrap;
      }
      a:hover {
        color: var(--ink);
        background: var(--wash);
      }
      a.active {
        color: var(--cobalt);
        background: var(--cobalt-soft);
      }
      a.active::after {
        content: '';
        position: absolute;
        inset: auto 0.8rem -0.72rem;
        height: 2px;
        background: var(--cobalt);
      }
    `,
  ],
})
export class ProjectNavComponent {
  @Input({ required: true }) projectId = '';
  readonly views = [
    { path: 'overview', label: 'Overview' },
    { path: 'tasks', label: 'Tasks' },
    { path: 'history', label: 'History' },
    { path: 'decisions', label: 'Decisions' },
    { path: 'evidence', label: 'Evidence' },
    { path: 'people', label: 'People' },
  ];
}
