import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  HostListener,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideArrowUpDown,
  LucideCircleDot,
  LucideList,
  LucideRotateCcw,
  LucideSearch,
  LucideSlidersHorizontal,
} from '@lucide/angular';
import { ProjectAtlasItem, WorkMemoryService } from '../../core/work-memory.service';
import { SidebarStateService } from '../../shell/sidebar-state.service';
import { packBubbles } from './bubble-layout';

type BubbleMetric = 'tasks' | 'activity' | 'recency';
type ProjectView = 'bubbles' | 'list';
type SortKey = 'name' | 'status' | 'metric' | 'updated';

@Component({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    LucideArrowUpDown,
    LucideCircleDot,
    LucideList,
    LucideRotateCcw,
    LucideSearch,
    LucideSlidersHorizontal,
  ],
  templateUrl: './all-projects.component.html',
  styleUrl: './all-projects.component.scss',
})
export class AllProjectsComponent implements OnInit, AfterViewInit {
  @ViewChild('bubbleField') private bubbleField?: ElementRef<HTMLElement>;
  @ViewChild('projectSearch') private projectSearch?: ElementRef<HTMLInputElement>;
  private readonly destroyRef = inject(DestroyRef);
  readonly sidebar = inject(SidebarStateService);
  private resizeObserver?: ResizeObserver;
  private focusObserver?: ResizeObserver;
  private focusMutationObserver?: MutationObserver;
  private observedFocusStrip?: HTMLElement;
  private resizeFrame = 0;

  readonly projects = signal<ProjectAtlasItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly view = signal<ProjectView>('bubbles');
  readonly metric = signal<BubbleMetric>('tasks');
  readonly query = signal('');
  readonly status = signal('all');
  readonly limit = signal(100);
  readonly fieldSize = signal({ width: 0, height: 0 });
  readonly focusHeight = signal(0);
  readonly sortKey = signal<SortKey>('updated');
  readonly sortDirection = signal<1 | -1>(-1);
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly countControl = new FormControl('100', { nonNullable: true });

  readonly filteredProjects = computed(() => {
    const query = this.query().trim().toLocaleLowerCase();
    return this.projects()
      .filter((project) => this.status() === 'all' || project.status === this.status())
      .filter(
        (project) =>
          !query ||
          project.name.toLocaleLowerCase().includes(query) ||
          project.description?.toLocaleLowerCase().includes(query),
      )
      .slice(0, this.limit());
  });

  readonly bubbleNodes = computed(() => {
    const { width, height } = this.fieldSize();
    return packBubbles(
      this.filteredProjects().map((project) => ({
        id: project.id,
        weight: this.metricValue(project) + 1,
      })),
      width,
      height,
    );
  });

  readonly sortedProjects = computed(() => {
    const key = this.sortKey();
    const direction = this.sortDirection();
    return [...this.filteredProjects()].sort((left, right) => {
      if (key === 'metric') return (this.metricValue(left) - this.metricValue(right)) * direction;
      const a = key === 'updated' ? left.updatedAt : String(left[key]);
      const b = key === 'updated' ? right.updatedAt : String(right[key]);
      return a.localeCompare(b) * direction;
    });
  });

  constructor(private readonly memory: WorkMemoryService) {
    const searchSubscription = this.searchControl.valueChanges.subscribe((value) => this.query.set(value));
    const countSubscription = this.countControl.valueChanges.subscribe((value) => this.limit.set(Number(value)));
    this.destroyRef.onDestroy(() => {
      searchSubscription.unsubscribe();
      countSubscription.unsubscribe();
      this.resizeObserver?.disconnect();
      this.focusObserver?.disconnect();
      this.focusMutationObserver?.disconnect();
      cancelAnimationFrame(this.resizeFrame);
    });
  }

  ngOnInit() {
    void this.load();
  }

  @HostListener('window:keydown', ['$event'])
  onShortcut(event: KeyboardEvent) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      this.projectSearch?.nativeElement.focus();
    }
  }

  ngAfterViewInit() {
    this.focusObserver = new ResizeObserver(([entry]) => this.focusHeight.set(entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height));
    this.syncFocusStrip();
    const main = document.getElementById('main-content');
    if (main) {
      this.focusMutationObserver = new MutationObserver(() => this.syncFocusStrip());
      this.focusMutationObserver.observe(main, { childList: true });
    }
    const field = this.bubbleField?.nativeElement;
    if (!field) return;
    this.resizeObserver = new ResizeObserver(([entry]) => {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = requestAnimationFrame(() => {
        this.fieldSize.set({ width: entry.contentRect.width, height: entry.contentRect.height });
      });
    });
    this.resizeObserver.observe(field);
  }

  private syncFocusStrip() {
    const focusStrip = document.querySelector<HTMLElement>('.focus-strip');
    if (focusStrip === this.observedFocusStrip) return;
    this.focusObserver?.disconnect();
    this.observedFocusStrip = focusStrip ?? undefined;
    this.focusHeight.set(focusStrip?.getBoundingClientRect().height ?? 0);
    if (focusStrip) this.focusObserver?.observe(focusStrip);
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.projects.set(await this.memory.allProjects());
    } catch {
      this.error.set('The project field could not be loaded. Check the local API and try again.');
    } finally {
      this.loading.set(false);
    }
  }

  setMetric(metric: BubbleMetric) {
    this.metric.set(metric);
  }

  metricValue(project: ProjectAtlasItem) {
    if (this.metric() === 'activity') return project.activityCount;
    if (this.metric() === 'recency') {
      const updated = new Date(project.lastActivityAt || project.updatedAt).getTime();
      return Math.max(1, 100 - Math.floor((Date.now() - updated) / 86_400_000));
    }
    return project.taskCount;
  }

  metricLabel(project: ProjectAtlasItem) {
    if (this.metric() === 'activity') return `${project.activityCount} events`;
    if (this.metric() === 'recency') return this.relativeUpdated(project);
    return `${project.taskCount} ${project.taskCount === 1 ? 'task' : 'tasks'}`;
  }

  relativeUpdated(project: ProjectAtlasItem) {
    const date = new Date(project.lastActivityAt || project.updatedAt);
    const days = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86_400_000));
    if (days === 0) return 'Updated today';
    if (days === 1) return 'Updated yesterday';
    if (days < 7) return `Updated ${days} days ago`;
    if (days < 42) return `Updated ${Math.floor(days / 7)}w ago`;
    return `Updated ${Math.max(1, Math.floor(days / 30))}mo ago`;
  }

  bubbleTone(project: ProjectAtlasItem) {
    if (project.status === 'active') return 'active';
    const age = Date.now() - new Date(project.lastActivityAt || project.updatedAt).getTime();
    return age <= 42 * 86_400_000 ? 'inactive' : 'quiet';
  }

  bubbleStyle(project: ProjectAtlasItem) {
    const node = this.bubbleNodes().find((bubble) => bubble.id === project.id);
    if (!node) return {};
    return {
      '--bubble-x': `${node.x}px`,
      '--bubble-y': `${node.y}px`,
      '--bubble-size': `${node.diameter}px`,
      '--bubble-scale': String(Math.max(0.58, Math.min(1, node.diameter / 150))),
    };
  }

  sortBy(key: SortKey) {
    if (this.sortKey() === key) this.sortDirection.update((direction) => (direction === 1 ? -1 : 1));
    else {
      this.sortKey.set(key);
      this.sortDirection.set(key === 'name' ? 1 : -1);
    }
  }
}
