import { Component, Input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string | readonly unknown[];
}

@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  template: `
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      @for (item of items; track $index; let last = $last) {
        @if (item.link && !last) {
          <a [routerLink]="item.link">{{ item.label }}</a>
        } @else {
          <span class="breadcrumbs__current" [attr.aria-current]="last ? 'page' : null">{{ item.label }}</span>
        }
        @if (!last) { <span class="breadcrumbs__separator" aria-hidden="true">›</span> }
      }
    </nav>
  `,
  styles: [`
    :host { display:block; min-width:0; }
    .breadcrumbs { display:flex; align-items:center; gap:.35rem; width:fit-content; max-width:100%; padding:.4rem; border-radius:var(--radius-sm); color:var(--muted); background:rgba(255,255,255,.72); box-shadow:var(--shadow-sm); font-size:.82rem; }
    a,.breadcrumbs__current { min-width:0; padding:.35rem .5rem; border-radius:var(--radius-sm); color:var(--slate); line-height:1.2; text-decoration:none; }
    a:hover { color:var(--cobalt); background:var(--cobalt-soft); }
    .breadcrumbs__current { max-width:18rem; overflow:hidden; color:var(--ink); font-weight:700; text-overflow:ellipsis; white-space:nowrap; }
    .breadcrumbs__separator { color:var(--muted); }
    @media(max-width:600px) { .breadcrumbs__current,.breadcrumbs__separator:last-of-type{display:none} .breadcrumbs{max-width:100%; overflow:hidden} }
  `],
})
export class BreadcrumbsComponent {
  @Input({ required: true }) items: BreadcrumbItem[] = [];
}
