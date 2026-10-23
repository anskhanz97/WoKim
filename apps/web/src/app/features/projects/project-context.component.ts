import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ProjectNavComponent } from '../../shared/project-nav.component';
import {
  Entry,
  EvidenceSet,
  Person,
  Project,
  ProjectActivity,
  ProjectAssociations,
  ProjectOverview,
  Team,
  Task,
  WorkMemoryService,
} from '../../core/work-memory.service';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink, ProjectNavComponent],
  templateUrl: './project-context.component.html',
  styleUrl: './project-context.component.scss',
})
export class ProjectContextComponent implements OnInit {
  readonly decisions = signal<Entry[]>([]);
  readonly history = signal<ProjectActivity[]>([]);
  readonly overview = signal<ProjectOverview | null>(null);
  readonly project = signal<Project | null>(null);
  readonly evidence = signal<EvidenceSet[]>([]);
  readonly associations = signal<ProjectAssociations | null>(null);
  readonly people = signal<Person[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly tasks = signal<Task[]>([]);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly newerId = new FormControl('', { nonNullable: true });
  readonly olderId = new FormControl('', { nonNullable: true });
  readonly reason = new FormControl('', { nonNullable: true });
  readonly from = new FormControl('', { nonNullable: true });
  readonly to = new FormControl('', { nonNullable: true });
  readonly personId = new FormControl('', { nonNullable: true });
  readonly roleLabel = new FormControl('', { nonNullable: true });
  readonly teamId = new FormControl('', { nonNullable: true });
  readonly evidenceTaskId = new FormControl('', { nonNullable: true });
  readonly evidenceTitle = new FormControl('', { nonNullable: true });
  readonly projectForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    description: new FormControl('', { nonNullable: true }),
    targetDate: new FormControl('', { nonNullable: true }),
    repositoryUrl: new FormControl('', { nonNullable: true }),
  });
  projectId = '';
  mode: 'overview' | 'history' | 'decisions' | 'evidence' | 'people' = 'overview';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly memory: WorkMemoryService,
  ) {}

  async ngOnInit() {
    this.projectId = this.route.snapshot.paramMap.get('projectId')!;
    this.mode = this.route.snapshot.data['mode'] as typeof this.mode;
    await this.reload();
  }

  async reload() {
    this.error.set('');
    try {
      if (this.mode === 'decisions') this.decisions.set(await this.memory.projectDecisions(this.projectId));
      else if (this.mode === 'history') {
        const [project, history] = await Promise.all([
          this.memory.project(this.projectId),
          this.memory.projectHistory(
            this.projectId,
            this.from.value || undefined,
            this.to.value || undefined,
          ),
        ]);
        this.project.set(project);
        this.history.set(history);
      }
      else if (this.mode === 'evidence') {
        const [project, evidence, tasks] = await Promise.all([
          this.memory.project(this.projectId),
          this.memory.projectEvidenceSets(this.projectId),
          this.memory.tasks(this.projectId),
        ]);
        this.project.set(project);
        this.evidence.set(evidence);
        this.tasks.set(tasks);
      } else if (this.mode === 'people') {
        const [project, associations, people, teams] = await Promise.all([
          this.memory.project(this.projectId),
          this.memory.projectAssociations(this.projectId),
          this.memory.people(),
          this.memory.teams(),
        ]);
        this.project.set(project);
        this.associations.set(associations);
        this.people.set(people);
        this.teams.set(teams);
      } else {
        const overview = await this.memory.projectOverview(this.projectId);
        this.overview.set(overview);
        this.project.set(overview.project);
        this.projectForm.setValue({
          name: overview.project.name,
          description: overview.project.description || '',
          targetDate: overview.project.targetDate || '',
          repositoryUrl: overview.project.repositoryUrl || '',
        });
      }
    } catch {
      this.error.set(`The project ${this.mode} could not be loaded.`);
    }
  }

  async saveProject() {
    const project = this.project();
    if (!project || this.projectForm.invalid) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const value = this.projectForm.getRawValue();
      await this.memory.updateProject(project, {
        name: value.name.trim(),
        description: value.description.trim() || null,
        targetDate: value.targetDate || null,
        repositoryUrl: value.repositoryUrl.trim() || null,
      });
      await this.reload();
    } catch {
      this.error.set('Project details were not saved. Reload if this project changed elsewhere.');
    } finally {
      this.saving.set(false);
    }
  }

  async range(days: 1 | 7 | 31) {
    const to = new Date(), from = new Date(); from.setDate(to.getDate() - days + 1);
    this.from.setValue(from.toISOString().slice(0, 10)); this.to.setValue(to.toISOString().slice(0, 10)); await this.reload();
  }

  async linkReplacement() {
    const newer = this.decisions().find((item) => item.id === this.newerId.value);
    const older = this.olderId.value;
    if (!newer || !older || newer.id === older) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await this.memory.addSupersession(newer, older, this.reason.value || undefined);
      this.newerId.setValue('');
      this.olderId.setValue('');
      this.reason.setValue('');
      await this.reload();
    } catch {
      this.error.set('The replacement link was rejected. Reload and check that it does not form a cycle.');
    } finally {
      this.saving.set(false);
    }
  }

  async addPerson() {
    const project = this.project(), personId = this.personId.value;
    if (!project || !personId) return;
    await this.changeAssociation(() => this.memory.addProjectPerson(project, personId, this.roleLabel.value || undefined));
    this.personId.setValue('');
    this.roleLabel.setValue('');
  }

  async createEvidence() {
    if (!this.evidenceTaskId.value || !this.evidenceTitle.value.trim()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      await this.memory.createEvidenceSet(
        this.evidenceTaskId.value,
        this.evidenceTitle.value.trim(),
      );
      this.evidenceTitle.setValue('');
      this.evidence.set(await this.memory.projectEvidenceSets(this.projectId));
    } catch {
      this.error.set('The evidence set was not created. Reload and retry.');
    } finally {
      this.saving.set(false);
    }
  }

  async removePerson(personId: string) {
    const project = this.project();
    if (project) await this.changeAssociation(() => this.memory.removeProjectPerson(project, personId));
  }

  async addTeam() {
    const project = this.project(), teamId = this.teamId.value;
    if (!project || !teamId) return;
    await this.changeAssociation(() => this.memory.addProjectTeam(project, teamId));
    this.teamId.setValue('');
  }

  async removeTeam(teamId: string) {
    const project = this.project();
    if (project) await this.changeAssociation(() => this.memory.removeProjectTeam(project, teamId));
  }

  imageUrl(id: string) { return `/api/v1/attachments/${encodeURIComponent(id)}/thumbnail`; }

  eventLabel(value: string) {
    return value.replaceAll('.', ' ').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  eventSummary(event: ProjectActivity) {
    const payload = event.payload;
    return String(
      payload['title'] ||
        payload['reason'] ||
        payload['status'] ||
        'A project record changed and was preserved in the activity stream.',
    );
  }

  private async changeAssociation(change: () => Promise<Project>) {
    this.error.set('');
    try {
      const project = await change();
      this.project.set(project);
      this.associations.set(await this.memory.projectAssociations(project.id));
    } catch {
      this.error.set('Project context changed elsewhere. Reload and retry.');
    }
  }
}
