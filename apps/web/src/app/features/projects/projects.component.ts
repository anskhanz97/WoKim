import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Project, WorkMemoryService } from '../../core/work-memory.service';
import { DatePickerDirective } from '../../shared/date-picker.directive';
import { SelectMenuDirective } from '../../shared/select-menu.directive';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePickerDirective, SelectMenuDirective],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent implements OnInit {
  readonly projects = signal<Project[]>([]);
  readonly adding = signal(false);
  readonly viewStatus = new FormControl('active', { nonNullable: true });
  readonly projectQuery = new FormControl('', { nonNullable: true });
  readonly error = signal('');
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    targetDate: new FormControl('', { nonNullable: true }),
  });
  constructor(private readonly memory: WorkMemoryService) {}
  async ngOnInit() {
    await this.reload();
  }
  async reload() {
    try {
      this.projects.set(
        await this.memory.projects(
          this.viewStatus.value,
          this.projectQuery.value.trim() || undefined,
        ),
      );
    } catch {
      this.error.set('Projects could not be loaded.');
    }
  }
  async transition(project: Project, action: 'complete' | 'archive' | 'reactivate' | 'restore') {
    this.error.set('');
    try {
      await this.memory.transitionProject(project, action);
      await this.reload();
    } catch {
      this.error.set('Project state was not changed. Finish or pause active work and reload first.');
    }
  }
  async create() {
    if (this.form.invalid) return;
    this.error.set('');
    try {
      await this.memory.createProject({
        name: this.form.value.name!,
        description: this.form.value.description || undefined,
        targetDate: this.form.value.targetDate || undefined,
      });
      this.form.reset({ name: '', description: '', targetDate: '' });
      this.adding.set(false);
      await this.reload();
    } catch {
      this.error.set('Project was not saved. Please check the fields and retry.');
    }
  }
}
