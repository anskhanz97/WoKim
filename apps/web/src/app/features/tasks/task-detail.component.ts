import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Attachment, EvidenceSet, FocusSession, FollowUp, Person, Task, WorkMemoryService } from '../../core/work-memory.service';
import { PromptDialogService } from '../../core/prompt-dialog.service';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './task-detail.component.html',
  styleUrl: './task-detail.component.scss',
})
export class TaskDetailComponent implements OnInit {
  readonly task = signal<Task | null>(null);
  readonly people = signal<Person[]>([]);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly evidence = signal<EvidenceSet[]>([]);
  readonly images = signal<Attachment[]>([]);
  readonly sessions = signal<FocusSession[]>([]);
  readonly followUps = signal<FollowUp[]>([]);
  readonly links = signal<NonNullable<Task['links']>>([]);
  readonly evidenceImageId = new FormControl('', { nonNullable: true });
  readonly evidenceSide = new FormControl('reference', { nonNullable: true });
  readonly followUpQuestion = new FormControl('', { nonNullable: true });
  readonly followUpOn = new FormControl('', { nonNullable: true });
  readonly linkKind = new FormControl('reference', { nonNullable: true });
  readonly linkLabel = new FormControl('', { nonNullable: true });
  readonly linkUrl = new FormControl('', { nonNullable: true });
  private etag = '';
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true }),
    description: new FormControl('', { nonNullable: true }),
    type: new FormControl('feature', { nonNullable: true }),
    priority: new FormControl('normal', { nonNullable: true }),
    requestedByPersonId: new FormControl('', { nonNullable: true }),
    nextAction: new FormControl('', { nonNullable: true }),
    branchName: new FormControl('', { nonNullable: true }),
    deadlineKind: new FormControl('target', { nonNullable: true }),
    dueDate: new FormControl('', { nonNullable: true }),
  });
  constructor(
    private readonly route: ActivatedRoute,
    readonly memory: WorkMemoryService,
    private readonly prompts: PromptDialogService,
  ) {}
  async ngOnInit() {
    try {
      const id = this.route.snapshot.paramMap.get('id')!;
      const [loaded, people, evidence, images, sessions, followUps] = await Promise.all([
        this.memory.task(id),
        this.memory.people(),
        this.memory.evidenceSets(id),
        this.memory.taskEvidenceImages(id),
        this.memory.taskSessions(id),
        this.memory.followUps({ taskId: id }),
      ]);
      this.task.set(loaded.data);
      this.people.set(people);
      this.evidence.set(evidence);
      this.images.set(images);
      this.sessions.set(sessions);
      this.followUps.set(followUps);
      this.etag = loaded.etag || `"${loaded.data.version}"`;
      this.fill(loaded.data);
    } catch {
      this.error.set('Task could not be loaded.');
    }
  }
  async save() {
    const task = this.task();
    if (!task) return;
    this.saving.set(true);
    try {
      const value = this.form.getRawValue();
      const data = await this.memory.updateTask(task.id, this.etag, {
        title: value.title,
        description: value.description || null,
        type: value.type,
        priority: value.priority,
        requestedByPersonId: value.requestedByPersonId || null,
        nextAction: value.nextAction || null,
        branchName: value.branchName || null,
        deadline: value.dueDate ? { kind: value.deadlineKind, date: value.dueDate } : null,
      });
      this.task.set(data);
      this.etag = `"${data.version}"`;
      this.fill(data);
    } catch {
      this.error.set('Task was not saved. Reload to review the current server version.');
    } finally {
      this.saving.set(false);
    }
  }
  async transition(action: string) {
    const task = this.task();
    if (!task) return;
    try {
      const data = await this.memory.transitionTask(task, action);
      this.task.set(data);
      this.etag = `"${data.version}"`;
    } catch {
      this.error.set('Task status was not changed. Reload and retry.');
    }
  }
  async focusTask() {
    const task = this.task();
    if (!task) return;
    const focus = await this.memory.refreshFocus();
    try {
      let checkpoint: string | null = '';
      let nextAction: string | null = '';
      if (focus.task) {
        checkpoint = await this.prompts.ask({ title: `Pause “${focus.task.title}”?`, message: 'Save where you stopped before switching focus.', label: 'Resume point', placeholder: 'What changed or remains unfinished', confirmLabel: 'Continue' });
        if (checkpoint === null) return;
        nextAction = await this.prompts.ask({ title: 'Name the next action', label: 'Next action', value: focus.task.nextAction || '', placeholder: 'The smallest useful step when you return', confirmLabel: 'Switch focus' });
        if (nextAction === null) return;
      }
      const data = focus.task
        ? await this.memory.focusCommand('switch', {
            targetTaskId: task.id,
            expectedFocusVersion: focus.focusVersion,
            checkpoint: checkpoint || undefined,
            nextAction: nextAction || undefined,
          })
        : await this.memory.focusCommand('start', {
            taskId: task.id,
            expectedFocusVersion: focus.focusVersion,
          });
      if (data.task?.id === task.id) {
        this.task.set(data.task);
        this.etag = `"${data.task.version}"`;
      }
    } catch {
      this.error.set('Focus changed elsewhere or this task is no longer eligible. Reload and choose again.');
    }
  }
  async createEvidence() {
    const task = this.task();
    if (!task) return;
    const title = await this.prompts.ask({ title: 'Create evidence set', label: 'Evidence set title', value: 'Before and after', confirmLabel: 'Create set' });
    if (!title) return;
    try {
      await this.memory.createEvidenceSet(task.id, title);
      this.evidence.set(await this.memory.evidenceSets(task.id));
    } catch { this.error.set('Evidence set was not created.'); }
  }
  async addFollowUp() {
    const task = this.task(), question = this.followUpQuestion.value.trim();
    if (!task || !question) return;
    try {
      await this.memory.createFollowUp({
        taskId: task.id,
        question,
        followUpOn: this.followUpOn.value || undefined,
      });
      this.followUpQuestion.setValue('');
      this.followUpOn.setValue('');
      this.followUps.set(await this.memory.followUps({ taskId: task.id }));
    } catch {
      this.error.set('Follow-up was not saved.');
    }
  }
  async resolveFollowUp(item: FollowUp) {
    try {
      await this.memory.updateFollowUp(item, { status: 'answered' });
      const task = this.task();
      if (task) this.followUps.set(await this.memory.followUps({ taskId: task.id }));
    } catch {
      this.error.set('Follow-up changed elsewhere. Reload and retry.');
    }
  }
  async addLink() {
    const label = this.linkLabel.value.trim(), url = this.linkUrl.value.trim();
    if (!label || !url) return;
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      await this.saveLinks([
        ...this.links(),
        { kind: this.linkKind.value.trim() || 'reference', label, url },
      ]);
      this.linkLabel.setValue('');
      this.linkUrl.setValue('');
    } catch {
      this.error.set('Add a complete http or https link.');
    }
  }
  async removeLink(index: number) {
    await this.saveLinks(this.links().filter((_, itemIndex) => itemIndex !== index));
  }
  async addEvidence(set: EvidenceSet) {
    const attachmentId = this.evidenceImageId.value;
    if (!attachmentId) return;
    try {
      const updated = await this.memory.addEvidenceItem(set, attachmentId, this.evidenceSide.value);
      this.evidence.update((items) => items.map((item) => item.id === updated.id ? updated : item));
      this.evidenceImageId.setValue('');
    } catch { this.error.set('Image was not added. It must belong to this task and cannot be duplicated.'); }
  }
  imageUrl(id: string) { return `/api/v1/attachments/${encodeURIComponent(id)}/thumbnail`; }
  private fill(task: Task) {
    this.links.set(task.links || []);
    this.form.patchValue({
      title: task.title,
      description: task.description || '',
      type: task.type,
      priority: task.priority,
      requestedByPersonId: task.requestedByPersonId || '',
      nextAction: task.nextAction || '',
      branchName: task.branchName || '',
      deadlineKind: task.deadline?.kind || 'target',
      dueDate: task.deadline?.date || '',
    });
  }
  private async saveLinks(links: NonNullable<Task['links']>) {
    const task = this.task();
    if (!task) return;
    try {
      const data = await this.memory.updateTask(task.id, this.etag, { links });
      this.task.set(data);
      this.etag = `"${data.version}"`;
      this.links.set(data.links || []);
    } catch {
      this.error.set('Task links were not saved. Reload and retry.');
    }
  }
}
