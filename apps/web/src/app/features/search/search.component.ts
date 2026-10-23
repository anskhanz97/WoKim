import { Component, DestroyRef, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, debounceTime, distinctUntilChanged, firstValueFrom, of, startWith, switchMap, tap } from 'rxjs';
import { Person, Project, SearchHit, WorkMemoryService } from '../../core/work-memory.service';

@Component({
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './search.component.html',
  styleUrl: './search.component.scss',
})
export class SearchComponent implements OnInit {
  readonly results = signal<SearchHit[]>([]);
  readonly projects = signal<Project[]>([]);
  readonly people = signal<Person[]>([]);
  readonly error = signal('');
  readonly loading = signal(false);
  readonly page = signal(1);
  readonly hasMore = signal(false);
  readonly form = new FormGroup({
    q: new FormControl('', { nonNullable: true }),
    type: new FormControl('', { nonNullable: true }),
    projectId: new FormControl('', { nonNullable: true }),
    personId: new FormControl('', { nonNullable: true }),
    status: new FormControl('', { nonNullable: true }),
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
  });

  constructor(
    private readonly memory: WorkMemoryService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly destroyRef: DestroyRef,
  ) {}

  async ngOnInit() {
    const query = this.route.snapshot.queryParamMap;
    this.form.setValue({
      q: query.get('q') || '',
      type: query.get('type') || '',
      projectId: query.get('projectId') || '',
      personId: query.get('personId') || '',
      status: query.get('status') || '',
      from: query.get('from') || '',
      to: query.get('to') || '',
    });
    const [projects, people] = await Promise.all([
      this.memory.projects().catch(() => []),
      this.memory.people().catch(() => []),
    ]);
    this.projects.set(projects);
    this.people.set(people);

    this.form.valueChanges
      .pipe(
        startWith(this.form.getRawValue()),
        debounceTime(300),
        distinctUntilChanged((left, right) => JSON.stringify(left) === JSON.stringify(right)),
        tap((value) => {
          this.error.set('');
          this.page.set(1);
          this.hasMore.set(false);
          this.loading.set(Boolean(value.q?.trim()));
          void this.router.navigate([], {
            relativeTo: this.route,
            replaceUrl: true,
            queryParams: Object.fromEntries(
              Object.entries(value).filter(([, item]) => Boolean(item)),
            ),
          });
        }),
        switchMap((value) => {
          const q = value.q?.trim();
          if (!q) return of({ data: [] as SearchHit[], page: { number: 1, limit: 20, hasMore: false } });
          return this.memory
            .searchPage$(q, {
              type: value.type || undefined,
              projectId: value.projectId || undefined,
              personId: value.personId || undefined,
              status: value.status || undefined,
              from: value.from || undefined,
              to: value.to || undefined,
            })
            .pipe(
              catchError(() => {
                this.error.set('Search failed. Keep date ranges ordered and within one year.');
                return of({ data: [] as SearchHit[], page: { number: 1, limit: 20, hasMore: false } });
              }),
            );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((response) => {
        this.results.set(response.data);
        this.page.set(response.page.number);
        this.hasMore.set(response.page.hasMore);
        this.loading.set(false);
      });
  }

  async loadMore() {
    const value = this.form.getRawValue();
    const q = value.q.trim();
    if (!q || !this.hasMore() || this.loading()) return;
    this.loading.set(true);
    try {
      const response = await firstValueFrom(
        this.memory.searchPage$(q, {
          type: value.type || undefined,
          projectId: value.projectId || undefined,
          personId: value.personId || undefined,
          status: value.status || undefined,
          from: value.from || undefined,
          to: value.to || undefined,
        }, this.page() + 1),
      );
      this.results.update((items) => [...items, ...response.data]);
      this.page.set(response.page.number);
      this.hasMore.set(response.page.hasMore);
    } catch {
      this.error.set('More results could not be loaded.');
    } finally {
      this.loading.set(false);
    }
  }

  link(item: SearchHit) {
    if (item.kind === 'task') return ['/tasks', item.id];
    if (item.kind === 'entry' || item.kind === 'derived') return ['/entries', item.id];
    if (item.kind === 'person') return ['/people', item.id];
    return ['/people'];
  }

  clearFilters() {
    const q = this.form.controls.q.value;
    this.form.reset({ q, type: '', projectId: '', personId: '', status: '', from: '', to: '' });
  }
}
