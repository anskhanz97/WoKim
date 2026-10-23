import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  OnInit,
  ViewChild,
  effect,
  signal,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Person, Project, Task, WorkMemoryService } from '../../core/work-memory.service';
import { CaptureDraftService } from '../../core/capture-draft.service';
import { AuthService } from '../../core/auth/auth.service';
import { PromptDialogService } from '../../core/prompt-dialog.service';
import { Subscription, debounceTime } from 'rxjs';
import { LucideMic, LucidePaperclip, LucideSparkles, LucideX } from '@lucide/angular';

@Component({
  selector: 'app-capture',
  imports: [CommonModule, ReactiveFormsModule, LucideMic, LucidePaperclip, LucideSparkles, LucideX],
  templateUrl: './capture.component.html',
  styleUrl: './capture.component.scss',
})
export class CaptureComponent implements OnInit, OnDestroy {
  @ViewChild('dialog') dialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('noteInput') noteInput?: ElementRef<HTMLTextAreaElement>;
  readonly projects = signal<Project[]>([]);
  readonly tasks = signal<Task[]>([]);
  readonly people = signal<Person[]>([]);
  readonly files = signal<File[]>([]);
  readonly saving = signal(false);
  readonly error = signal('');
  readonly recording = signal(false);
  readonly recordedUrl = signal('');
  readonly recordingSupported =
    typeof MediaRecorder !== 'undefined' &&
    Boolean(navigator.mediaDevices?.getUserMedia);
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true }),
    contentText: new FormControl('', { nonNullable: true }),
    entryType: new FormControl('note', { nonNullable: true }),
    projectId: new FormControl('', { nonNullable: true }),
    taskId: new FormControl('', { nonNullable: true }),
    senderPersonId: new FormControl('', { nonNullable: true }),
    occurredAt: new FormControl('', { nonNullable: true }),
    attachmentPurpose: new FormControl('reference', { nonNullable: true }),
    transcribeAudio: new FormControl(false, { nonNullable: true }),
  });
  private subscription?: Subscription;
  private recorder?: MediaRecorder;
  private recordingStream?: MediaStream;
  private recordingChunks: Blob[] = [];
  private previousFocus?: HTMLElement;
  constructor(
    readonly memory: WorkMemoryService,
    private readonly router: Router,
    private readonly drafts: CaptureDraftService,
    private readonly auth: AuthService,
    private readonly prompts: PromptDialogService,
  ) {
    effect(() => {
      if (this.memory.captureOpen()) void this.prepare();
    });
  }
  async ngOnInit() {
    const [projects, people] = await Promise.all([
      this.memory.projects().catch(() => []),
      this.memory.people().catch(() => []),
    ]);
    this.projects.set(projects);
    this.people.set(people);
    this.subscription = this.form.valueChanges
      .pipe(debounceTime(300))
      .subscribe(() => void this.saveDraft());
  }
  ngOnDestroy() {
    this.subscription?.unsubscribe();
    this.releaseRecording();
  }
  private async loadProjects() {
    const [projects, people] = await Promise.all([
      this.memory.projects().catch(() => []),
      this.memory.people().catch(() => []),
    ]);
    this.projects.set(projects);
    this.people.set(people);
  }
  async projectChanged() {
    const projectId = this.form.controls.projectId.value;
    this.form.controls.taskId.setValue('');
    this.tasks.set(projectId ? await this.memory.tasks(projectId).catch(() => []) : []);
  }
  private async prepare() {
    this.previousFocus = document.activeElement as HTMLElement;
    await this.loadProjects();
    const owner = this.auth.owner();
    if (owner && !this.form.dirty && !this.form.value.contentText) {
      const draft = await this.drafts.load(owner.id).catch(() => null);
      if (draft && Date.now() - draft.updatedAt < 7 * 86400000) {
        this.form.patchValue(draft, { emitEvent: false });
        if (draft.projectId)
          this.tasks.set(await this.memory.tasks(draft.projectId).catch(() => []));
      }
    }
    setTimeout(() => {
      const dialog = this.dialog?.nativeElement;
      if (dialog && !dialog.open) dialog.showModal();
      (this.noteInput?.nativeElement || dialog?.querySelector<HTMLTextAreaElement>('[formcontrolname="contentText"]'))?.focus();
    }, 0);
  }
  private async saveDraft() {
    const owner = this.auth.owner();
    if (!owner) return;
    const value = this.form.getRawValue();
    if (!value.contentText.trim() && !value.title.trim()) return;
    await this.drafts.save(owner.id, { ...value, updatedAt: Date.now() }).catch(() => undefined);
  }
  choose(event: Event) {
    this.releaseRecording();
    this.files.set(Array.from((event.target as HTMLInputElement).files || []));
  }
  async startRecording() {
    if (!this.recordingSupported) {
      this.error.set('Audio recording is not supported by this browser. You can upload an audio file instead.');
      return;
    }
    this.error.set('');
    try {
      this.releaseRecording();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const candidates = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'];
      const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      this.recordingStream = stream;
      this.recorder = recorder;
      this.recordingChunks = [];
      recorder.ondataavailable = (event) => {
        if (event.data.size) this.recordingChunks.push(event.data);
      };
      recorder.start(1000);
      this.recording.set(true);
    } catch {
      this.error.set('Microphone access was denied or no microphone is available. Your draft is unchanged.');
    }
  }
  stopRecording() {
    const recorder = this.recorder;
    if (!recorder || recorder.state === 'inactive') return;
    recorder.onstop = () => {
      const type = recorder.mimeType || this.recordingChunks[0]?.type || 'audio/webm';
      const blob = new Blob(this.recordingChunks, { type });
      const extension = type.includes('ogg') ? 'ogg' : type.includes('mp4') ? 'm4a' : 'webm';
      this.files.set([new File([blob], `recording-${Date.now()}.${extension}`, { type })]);
      this.recordedUrl.set(URL.createObjectURL(blob));
      this.recordingStream?.getTracks().forEach((track) => track.stop());
      this.recordingStream = undefined;
      this.recorder = undefined;
      this.recording.set(false);
    };
    recorder.stop();
  }
  discardRecording() {
    this.releaseRecording();
    this.files.set([]);
  }
  @HostListener('window:beforeunload', ['$event'])
  confirmUnload(event: BeforeUnloadEvent) {
    if (this.memory.captureOpen() && (this.form.dirty || this.files().length))
      event.preventDefault();
  }
  async close() {
    if ((this.form.value.contentText || this.files().length) && !(await this.prompts.confirm({
      title: 'Discard this capture?',
      message: 'Your unsaved note and selected files will be removed.',
      confirmLabel: 'Discard capture',
      destructive: true,
    }))) return;
    const owner = this.auth.owner();
    if (owner) void this.drafts.clear(owner.id);
    this.resetForm();
    this.files.set([]);
    this.releaseRecording();
    this.dialog?.nativeElement.close();
    this.memory.captureOpen.set(false);
    setTimeout(() => {
      const fallback = Array.from(
        document.querySelectorAll<HTMLElement>('[data-capture-trigger]'),
      ).find((element) => element.getClientRects().length > 0);
      const target =
        this.previousFocus?.isConnected &&
        this.previousFocus.getClientRects().length > 0
          ? this.previousFocus
          : fallback;
      target?.focus();
    }, 0);
  }
  cancel(event: Event) { event.preventDefault(); void this.close(); }
  removeFile(index: number) { this.files.update((items) => items.filter((_, itemIndex) => itemIndex !== index)); }
  async save() {
    if (!this.form.value.contentText?.trim() && !this.files().length) {
      this.error.set('Add a note or choose at least one image or audio file.');
      return;
    }
    this.saving.set(true);
    this.error.set('');
    try {
      const entry = await this.memory.capture(
        {
          ...this.form.getRawValue(),
          projectId: this.form.value.projectId || undefined,
          taskId: this.form.value.taskId || undefined,
          senderPersonId: this.form.value.senderPersonId || undefined,
          occurredAt: this.form.value.occurredAt
            ? new Date(this.form.value.occurredAt).toISOString()
            : undefined,
          occurredTimezone: this.form.value.occurredAt
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : undefined,
          sourceKind: this.recordedUrl() ? 'recording' : this.files().length ? 'upload' : 'typed',
        },
        this.files(),
      );
      const owner = this.auth.owner();
      if (owner) await this.drafts.clear(owner.id);
      this.resetForm();
      this.files.set([]);
      this.releaseRecording();
      this.dialog?.nativeElement.close();
      this.memory.captureOpen.set(false);
      await this.router.navigate(['/entries', entry.id]);
    } catch (error) {
      this.error.set(
        'Capture was not saved. Your text and selected files are still here; please retry.',
      );
    } finally {
      this.saving.set(false);
    }
  }
  private releaseRecording() {
    if (this.recorder?.state && this.recorder.state !== 'inactive') this.recorder.stop();
    this.recordingStream?.getTracks().forEach((track) => track.stop());
    const url = this.recordedUrl();
    if (url) URL.revokeObjectURL(url);
    this.recordedUrl.set('');
    this.recording.set(false);
    this.recorder = undefined;
    this.recordingStream = undefined;
    this.recordingChunks = [];
  }
  private resetForm() {
    this.form.reset({
      title: '',
      contentText: '',
      entryType: 'note',
      projectId: '',
      taskId: '',
      senderPersonId: '',
      occurredAt: '',
      attachmentPurpose: 'reference',
      transcribeAudio: false,
    });
  }
}
