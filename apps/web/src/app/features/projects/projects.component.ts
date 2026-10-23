import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  Person,
  Project,
  ProjectAssociations,
  Team,
  WorkMemoryService,
} from '../../core/work-memory.service';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './projects.component.html',
  styleUrl: './projects.component.scss',
})
export class ProjectsComponent implements OnInit {
  readonly projects = signal<Project[]>([]);
  readonly people = signal<Person[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly selected = signal<Project | null>(null);
  readonly associations = signal<ProjectAssociations | null>(null);
  readonly adding = signal(false);
  readonly viewStatus = new FormControl('active', { nonNullable: true });
  readonly projectQuery = new FormControl('', { nonNullable: true });
  readonly error = signal('');
  readonly form = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    targetDate: new FormControl('', { nonNullable: true }),
  });
  readonly personId = new FormControl('', { nonNullable: true });
  readonly teamId = new FormControl('', { nonNullable: true });
  constructor(private readonly memory: WorkMemoryService) {}
  async ngOnInit() {
    await this.reload();
  }
  async reload() {
    try {
      const [projects, people, teams] = await Promise.all([
        this.memory.projects(this.viewStatus.value, this.projectQuery.value.trim() || undefined),
        this.memory.people(),
        this.memory.teams(),
      ]);
      this.projects.set(projects);
      this.people.set(people);
      this.teams.set(teams);
    } catch {
      this.error.set('Projects could not be loaded.');
    }
  }
  async transition(project: Project, action: 'complete' | 'archive' | 'reactivate' | 'restore') {
    this.error.set('');
    try {
      await this.memory.transitionProject(project, action);
      if (this.selected()?.id === project.id) {
        this.selected.set(null);
        this.associations.set(null);
      }
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
  async manage(project: Project) {
    this.selected.set(project);
    try {
      this.associations.set(await this.memory.projectAssociations(project.id));
    } catch {
      this.error.set('Project associations could not be loaded.');
    }
  }
  async addPerson() {
    const project = this.selected(),
      personId = this.personId.value;
    if (!project || !personId) return;
    try {
      const updated = await this.memory.addProjectPerson(project, personId);
      this.selected.set(updated);
      this.personId.setValue('');
      await this.refreshAssociations(updated);
    } catch {
      this.error.set('Person was not added. Reload if the project changed elsewhere.');
    }
  }
  async removePerson(personId: string) {
    const project = this.selected();
    if (!project) return;
    try {
      const updated = await this.memory.removeProjectPerson(project, personId);
      this.selected.set(updated);
      await this.refreshAssociations(updated);
    } catch {
      this.error.set('Person was not removed. Reload if the project changed elsewhere.');
    }
  }
  async addTeam() {
    const project = this.selected(),
      teamId = this.teamId.value;
    if (!project || !teamId) return;
    try {
      const updated = await this.memory.addProjectTeam(project, teamId);
      this.selected.set(updated);
      this.teamId.setValue('');
      await this.refreshAssociations(updated);
    } catch {
      this.error.set('Team was not added. Reload if the project changed elsewhere.');
    }
  }
  async removeTeam(teamId: string) {
    const project = this.selected();
    if (!project) return;
    try {
      const updated = await this.memory.removeProjectTeam(project, teamId);
      this.selected.set(updated);
      await this.refreshAssociations(updated);
    } catch {
      this.error.set('Team was not removed. Reload if the project changed elsewhere.');
    }
  }
  private async refreshAssociations(project: Project) {
    this.projects.update((items) => items.map((item) => (item.id === project.id ? project : item)));
    this.associations.set(await this.memory.projectAssociations(project.id));
  }
}
