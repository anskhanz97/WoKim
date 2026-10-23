import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Entry, FollowUp, Person, Task, Team, WorkMemoryService } from '../../core/work-memory.service';
import { PromptDialogService } from '../../core/prompt-dialog.service';

@Component({ imports: [ReactiveFormsModule, RouterLink], templateUrl: './people.component.html', styleUrl: './people.component.scss' })
export class PeopleComponent implements OnInit {
  readonly people = signal<Person[]>([]);
  readonly teams = signal<Team[]>([]);
  readonly selected = signal<Person | null>(null);
  readonly followUps = signal<FollowUp[]>([]);
  readonly relatedEntries = signal<Entry[]>([]);
  readonly requestedTasks = signal<Task[]>([]);
  readonly error = signal('');
  readonly directoryQuery = new FormControl('', { nonNullable: true });
  readonly showArchived = new FormControl(false, { nonNullable: true });
  readonly personForm = new FormGroup({
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    email: new FormControl('', { nonNullable: true }),
    handle: new FormControl('', { nonNullable: true }),
  });
  readonly teamForm = new FormGroup({ name: new FormControl('', { nonNullable: true, validators: [Validators.required] }) });
  readonly followUpForm = new FormGroup({
    question: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    followUpOn: new FormControl('', { nonNullable: true }),
  });
  constructor(private readonly memory: WorkMemoryService, private readonly route: ActivatedRoute, private readonly prompts: PromptDialogService) {}
  async ngOnInit() {
    await this.reload();
    const id = this.route.snapshot.paramMap.get('id');
    const person = this.people().find((item) => item.id === id);
    if (person) await this.open(person);
    else if (id) this.error.set('That contact is unavailable or archived.');
  }
  async reload() {
    try {
      const query = this.directoryQuery.value.trim() || undefined;
      const [people, teams] = await Promise.all([
        this.memory.people(query, this.showArchived.value),
        this.memory.teams(query, this.showArchived.value),
      ]);
      this.people.set(people); this.teams.set(teams);
    } catch { this.error.set('Contacts could not be loaded.'); }
  }
  async addPerson() {
    if (this.personForm.invalid) return;
    try {
      await this.memory.createPerson({ displayName: this.personForm.value.displayName!, email: this.personForm.value.email || undefined, handle: this.personForm.value.handle || undefined });
      this.personForm.reset({ displayName: '', email: '', handle: '' }); await this.reload();
    } catch { this.error.set('Contact was not saved.'); }
  }
  async addTeam() {
    if (this.teamForm.invalid) return;
    try { await this.memory.createTeam({ name: this.teamForm.value.name! }); this.teamForm.reset({ name: '' }); await this.reload(); }
    catch { this.error.set('Team was not saved.'); }
  }
  async editPerson(person: Person) {
    const displayName = (await this.prompts.ask({ title: 'Edit person', label: 'Display name', value: person.displayName, confirmLabel: 'Save changes' }))?.trim();
    if (!displayName) return;
    try { await this.memory.updatePerson(person, { displayName }); await this.reload(); }
    catch { this.error.set('Contact was not updated. Reload if it changed elsewhere.'); }
  }
  async togglePerson(person: Person) {
    try { await this.memory.updatePerson(person, { archived: !person.archivedAt }); await this.reload(); }
    catch { this.error.set('Contact archive state was not changed.'); }
  }
  async editTeam(team: Team) {
    const name = (await this.prompts.ask({ title: 'Edit team', label: 'Team name', value: team.name, confirmLabel: 'Save changes' }))?.trim();
    if (!name) return;
    try { await this.memory.updateTeam(team, { name }); await this.reload(); }
    catch { this.error.set('Team was not updated. Reload if it changed elsewhere.'); }
  }
  async toggleTeam(team: Team) {
    try { await this.memory.updateTeam(team, { archived: !team.archivedAt }); await this.reload(); }
    catch { this.error.set('Team archive state was not changed.'); }
  }
  async open(person: Person) {
    try {
      const [detail, followUps, entries, tasks] = await Promise.all([
        this.memory.person(person.id),
        this.memory.followUps({ personId: person.id }),
        this.memory.personEntries(person.id),
        this.memory.tasks(undefined, undefined, person.id),
      ]);
      this.selected.set(detail);
      this.followUps.set(followUps);
      this.relatedEntries.set(entries);
      this.requestedTasks.set(tasks);
    }
    catch { this.error.set('Outstanding questions could not be loaded.'); }
  }
  async addFollowUp() {
    const person = this.selected();
    if (!person || this.followUpForm.invalid) return;
    try {
      await this.memory.createFollowUp({ personId: person.id, question: this.followUpForm.value.question!, followUpOn: this.followUpForm.value.followUpOn || undefined });
      this.followUpForm.reset({ question: '', followUpOn: '' }); await this.open(person);
    } catch { this.error.set('Follow-up was not saved.'); }
  }
  async resolve(item: FollowUp) {
    const resolution = (await this.prompts.ask({ title: 'Resolve follow-up', message: item.question, label: 'Resolution', placeholder: 'Optional note about the answer', confirmLabel: 'Mark answered' })) || undefined;
    try { await this.memory.updateFollowUp(item, { status: 'answered', resolution }); if (this.selected()) await this.open(this.selected()!); }
    catch { this.error.set('Follow-up changed elsewhere. Reload and retry.'); }
  }
}
