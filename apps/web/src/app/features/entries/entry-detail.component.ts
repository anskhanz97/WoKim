import { CommonModule } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  Entry,
  EntryRevision,
  DerivedText,
  Person,
  ProcessingJob,
  Project,
  Task,
  WorkMemoryService,
} from '../../core/work-memory.service';
import { PromptDialogService } from '../../core/prompt-dialog.service';

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './entry-detail.component.html',
  styleUrl: './entry-detail.component.scss',
})
export class EntryDetailComponent implements OnInit {
  readonly entry = signal<Entry | null>(null);
  readonly projects = signal<Project[]>([]);
  readonly people = signal<Person[]>([]);
  readonly tasks = signal<Task[]>([]);
  readonly revisions = signal<EntryRevision[]>([]);
  readonly error = signal('');
  readonly saving = signal(false);
  readonly extracted = signal<Record<string, DerivedText[]>>({});
  readonly processing = signal<Record<string, string>>({});
  readonly jobs = signal<Record<string, ProcessingJob[]>>({});
  readonly uploading = signal(false);
  selectedFiles: File[] = [];
  private etag = '';
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true }),
    contentText: new FormControl('', { nonNullable: true }),
    entryType: new FormControl('note', { nonNullable: true }),
    projectId: new FormControl('', { nonNullable: true }),
    taskId: new FormControl('', { nonNullable: true }),
    senderPersonId: new FormControl('', { nonNullable: true }),
    inboxState: new FormControl('unprocessed', { nonNullable: true }),
  });
  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    readonly memory: WorkMemoryService,
    private readonly prompts: PromptDialogService,
  ) {}
  async ngOnInit() {
    try {
      const id = this.route.snapshot.paramMap.get('id')!;
      const [loaded, projects, people, revisions] = await Promise.all([
        this.memory.entry(id),
        this.memory.projects(),
        this.memory.people(),
        this.memory.entryRevisions(id),
      ]);
      this.entry.set(loaded.data);
      this.etag = loaded.etag || `"${loaded.data.version}"`;
      this.projects.set(projects);
      this.people.set(people);
      this.revisions.set(revisions);
      if (loaded.data.projectId)
        this.tasks.set(await this.memory.tasks(loaded.data.projectId));
      await this.loadExtracted(loaded.data);
      this.form.patchValue({
        title: loaded.data.title || '',
        contentText: loaded.data.contentText || '',
        entryType: loaded.data.entryType,
        projectId: loaded.data.projectId || '',
        taskId: loaded.data.taskId || '',
        senderPersonId: loaded.data.senderPersonId || '',
        inboxState: loaded.data.inboxState,
      });
    } catch {
      this.error.set('This capture could not be loaded.');
    }
  }
  async save() {
    const current = this.entry();
    if (!current) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const data = await this.memory.updateEntry(current.id, this.etag, {
        ...this.form.getRawValue(),
        projectId: this.form.value.projectId || null,
        taskId: this.form.value.taskId || null,
        senderPersonId: this.form.value.senderPersonId || null,
      });
      this.entry.set(data);
      this.etag = `"${data.version}"`;
    } catch {
      this.error.set('Your changes were not saved. Reload to review the current server version.');
    } finally {
      this.saving.set(false);
    }
  }
  async projectChanged() {
    const projectId = this.form.controls.projectId.value;
    this.form.controls.taskId.setValue('');
    this.tasks.set(projectId ? await this.memory.tasks(projectId).catch(() => []) : []);
  }
  async dismiss() {
    this.form.controls.inboxState.setValue('dismissed');
    await this.save();
  }
  async trash() {
    const current = this.entry();
    if (
      !current ||
      !(await this.prompts.confirm({ title: 'Move capture to trash?', message: 'The capture and its original source stay recoverable during retention.', confirmLabel: 'Move to trash', destructive: true }))
    )
      return;
    try {
      await this.memory.trashEntry(current.id, current.version);
      await this.router.navigateByUrl('/inbox');
    } catch {
      this.error.set('This capture was not moved to trash. Reload and try again.');
    }
  }
  async convertToTask() {
    const current = this.entry();
    if (!current?.projectId) return;
    const title = await this.prompts.ask({ title: 'Convert capture to task', label: 'Task title', value: current.title || current.contentText?.slice(0, 120) || 'New task', confirmLabel: 'Create task' });
    if (!title) return;
    try {
      const task = await this.memory.convertEntryToTask(current, {
        projectId: current.projectId,
        title,
        type: current.entryType === 'question' ? 'investigation' : 'change',
        priority: 'normal',
        description: current.contentText || undefined,
      });
      await this.router.navigate(['/tasks', task.id]);
    } catch {
      this.error.set('This capture was not converted. Reload and retry.');
    }
  }
  async setPurpose(attachmentId: string, event: Event) {
    const current = this.entry();
    if (!current) return;
    try {
      const data = await this.memory.updateAttachment(attachmentId, current.version, {
        purpose: (event.target as HTMLSelectElement).value,
      });
      this.entry.set(data);
      this.etag = `"${data.version}"`;
    } catch {
      this.error.set('Attachment metadata was not saved. Reload and retry.');
    }
  }
  async editCaption(attachmentId: string, currentCaption: string | null) {
    const current = this.entry();
    if (!current) return;
    const caption = await this.prompts.ask({ title: 'Edit attachment', label: 'Caption', value: currentCaption || '', confirmLabel: 'Save caption' });
    if (caption === null) return;
    try {
      const data = await this.memory.updateAttachment(attachmentId, current.version, { caption });
      this.entry.set(data);
      this.etag = `"${data.version}"`;
    } catch {
      this.error.set('Attachment caption was not saved. Reload and retry.');
    }
  }
  async trashAttachment(attachmentId: string) {
    const current = this.entry();
    if (
      !current ||
      !(await this.prompts.confirm({ title: 'Remove attachment?', message: 'The file remains recoverable during retention.', confirmLabel: 'Move to trash', destructive: true }))
    )
      return;
    try {
      const data = await this.memory.trashAttachment(attachmentId, current.version);
      this.entry.set(data);
      this.etag = `"${data.version}"`;
    } catch {
      this.error.set('Attachment was not moved to trash. Reload and retry.');
    }
  }
  chooseFiles(event: Event) {
    this.selectedFiles = Array.from((event.target as HTMLInputElement).files || []);
  }
  async addAttachments() {
    const current = this.entry();
    if (!current || !this.selectedFiles.length) return;
    this.uploading.set(true);
    this.error.set('');
    try {
      const data = await this.memory.addAttachments(
        current.id,
        current.version,
        this.selectedFiles,
      );
      this.entry.set(data);
      this.etag = `"${data.version}"`;
      this.selectedFiles = [];
      await this.loadExtracted(data);
    } catch {
      this.error.set('Files were not added. Reload if this entry changed elsewhere.');
    } finally {
      this.uploading.set(false);
    }
  }
  fileUrl(id: string) {
    return `/api/v1/attachments/${encodeURIComponent(id)}/content`;
  }
  thumbnailUrl(id: string) {
    return `/api/v1/attachments/${encodeURIComponent(id)}/thumbnail`;
  }
  playbackUrl(id: string) {
    return `/api/v1/attachments/${encodeURIComponent(id)}/playback`;
  }
  async process(fileId: string, kind: 'ocr' | 'transcribe') {
    this.processing.update((state) => ({ ...state, [fileId]: 'Queued…' }));
    try {
      await this.memory.requestProcessing(fileId, kind);
      const jobs = await this.memory.processingJobs(fileId);
      this.jobs.update((state) => ({ ...state, [fileId]: jobs }));
      this.processing.update((state) => ({
        ...state,
        [fileId]: 'Queued. Run the private worker, then refresh this entry.',
      }));
    } catch {
      this.processing.update((state) => ({ ...state, [fileId]: 'Could not queue processing.' }));
    }
  }
  async retry(job: ProcessingJob) {
    this.processing.update((state) => ({ ...state, [job.attachmentId]: 'Retrying…' }));
    try {
      await this.memory.retryProcessingJob(job.id);
      const jobs = await this.memory.processingJobs(job.attachmentId);
      this.jobs.update((state) => ({
        ...state,
        [job.attachmentId]: jobs,
      }));
      this.processing.update((state) => ({ ...state, [job.attachmentId]: 'Retry queued.' }));
    } catch {
      this.processing.update((state) => ({ ...state, [job.attachmentId]: 'Retry could not be queued.' }));
    }
  }
  async review(item: DerivedText) {
    const text = await this.prompts.ask({ title: 'Review extracted text', label: 'Searchable text', value: item.reviewedText ?? item.machineText, multiline: true, confirmLabel: 'Save review' });
    if (text === null) return;
    try {
      await this.memory.reviewDerivedText(item, text);
      const current = this.entry();
      if (current) await this.loadExtracted(current);
    } catch {
      this.error.set('The extracted text changed elsewhere. Refresh before reviewing it.');
    }
  }
  private async loadExtracted(entry: Entry) {
    const rows = await Promise.all(
      (entry.attachments || []).map(async (file) => ({
        id: file.id,
        texts: await this.memory.derivedTexts(file.id),
        jobs: await this.memory.processingJobs(file.id),
      })),
    );
    this.extracted.set(Object.fromEntries(rows.map((row) => [row.id, row.texts])));
    this.jobs.set(Object.fromEntries(rows.map((row) => [row.id, row.jobs])));
  }
}
