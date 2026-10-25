import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Person, Project, Task, WorkMemoryService } from '../../core/work-memory.service';
import { ProjectNavComponent } from '../../shared/project-nav.component';
import { DatePickerDirective } from '../../shared/date-picker.directive';
import { SelectMenuDirective } from '../../shared/select-menu.directive';
import { BreadcrumbsComponent } from '../../shared/breadcrumbs.component';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ProjectNavComponent, DatePickerDirective, SelectMenuDirective, BreadcrumbsComponent],
  templateUrl: './task-list.component.html',
  styleUrl: './task-list.component.scss',
})
export class TaskListComponent implements OnInit {
  readonly project = signal<Project | null>(null);
  readonly tasks = signal<Task[]>([]);
  readonly people = signal<Person[]>([]);
  readonly adding = signal(false);
  readonly error = signal('');
  readonly status = new FormControl('', { nonNullable: true });
  readonly type = new FormControl('', { nonNullable: true });
  readonly priority = new FormControl('', { nonNullable: true });
  readonly dueFrom = new FormControl('', { nonNullable: true });
  readonly dueTo = new FormControl('', { nonNullable: true });
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    type: new FormControl('feature', { nonNullable: true }),
    priority: new FormControl('normal', { nonNullable: true }),
    requestedByPersonId: new FormControl('', { nonNullable: true }),
    nextAction: new FormControl('', { nonNullable: true }),
    deadlineKind: new FormControl('target', { nonNullable: true }),
    dueDate: new FormControl('', { nonNullable: true }),
  });
  projectId = '';
  constructor(
    private readonly route: ActivatedRoute,
    private readonly memory: WorkMemoryService,
  ) {}
  async ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('projectId')!;
    try {
      const [projects, people] = await Promise.all([this.memory.projects(), this.memory.people()]);
      this.project.set(projects.find((item) => item.id === this.projectId) || null);
      this.people.set(people);
      await this.reload();
    } catch {
      this.error.set('Project tasks could not be loaded.');
    }
  }
  async reload() {
    this.error.set('');
    try {
      this.tasks.set(
        await this.memory.tasks(this.projectId, this.status.value || undefined, undefined, {
          type: this.type.value || undefined,
          priority: this.priority.value || undefined,
          dueFrom: this.dueFrom.value || undefined,
          dueTo: this.dueTo.value || undefined,
        }),
      );
    } catch {
      this.error.set('Tasks could not be filtered. Keep the due-date range ordered and within one year.');
    }
  }
  async create() {
    if (this.form.invalid) return;
    try {
      const value = this.form.getRawValue();
      await this.memory.createTask({
        projectId: this.projectId,
        title: value.title,
        description: value.description || undefined,
        type: value.type,
        priority: value.priority,
        requestedByPersonId: value.requestedByPersonId || undefined,
        nextAction: value.nextAction || undefined,
        deadline: value.dueDate ? { kind: value.deadlineKind, date: value.dueDate } : null,
      });
      this.form.reset({
        title: '',
        description: '',
        type: 'feature',
        priority: 'normal',
        requestedByPersonId: '',
        nextAction: '',
        deadlineKind: 'target',
        dueDate: '',
      });
      this.adding.set(false);
      await this.reload();
    } catch {
      this.error.set('Task was not saved. Check its fields and retry.');
    }
  }
}
