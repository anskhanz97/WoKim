import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Entry, Person, Project, WorkMemoryService } from '../../core/work-memory.service';
import { DatePickerDirective } from '../../shared/date-picker.directive';
import { SelectMenuDirective } from '../../shared/select-menu.directive';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink, DatePickerDirective, SelectMenuDirective],
  templateUrl: './inbox.component.html',
  styleUrl: './inbox.component.scss',
})
export class InboxComponent implements OnInit {
  readonly entries = signal<Entry[]>([]);
  readonly projects = signal<Project[]>([]);
  readonly people = signal<Person[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly filters = new FormGroup({
    type: new FormControl('', { nonNullable: true }),
    projectId: new FormControl('', { nonNullable: true }),
    personId: new FormControl('', { nonNullable: true }),
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
  });

  constructor(readonly memory: WorkMemoryService) {}

  async ngOnInit() {
    const [projects, people] = await Promise.all([
      this.memory.projects().catch(() => []),
      this.memory.people().catch(() => []),
    ]);
    this.projects.set(projects);
    this.people.set(people);
    await this.reload();
  }

  async reload() {
    this.loading.set(true);
    this.error.set('');
    try {
      const value = this.filters.getRawValue();
      this.entries.set(
        await this.memory.entries('unprocessed', {
          type: value.type || undefined,
          projectId: value.projectId || undefined,
          personId: value.personId || undefined,
          from: value.from || undefined,
          to: value.to || undefined,
        }),
      );
    } catch {
      this.error.set('Inbox could not be filtered. Keep the date range ordered and within one year.');
    } finally {
      this.loading.set(false);
    }
  }

  clearFilters() {
    this.filters.reset({ type: '', projectId: '', personId: '', from: '', to: '' });
    void this.reload();
  }
}
