import { Component, ElementRef, OnDestroy, OnInit, ViewChild, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth/auth.service';
import { WorkMemoryService } from '../core/work-memory.service';
import { CaptureComponent } from '../features/capture/capture.component';
import { CaptureDraftService } from '../core/capture-draft.service';
import { PromptDialogComponent } from '../shared/prompt-dialog.component';
import { LucideDatabaseBackup, LucideEllipsis, LucideFolderKanban, LucideHouse, LucideInbox, LucideLogOut, LucidePlus, LucideSearch, LucideSettings, LucideSparkles, LucideUsers } from '@lucide/angular';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ReactiveFormsModule, CaptureComponent, PromptDialogComponent, LucideHouse, LucideInbox, LucideFolderKanban, LucideSearch, LucidePlus, LucideUsers, LucideSettings, LucideSparkles, LucideDatabaseBackup, LucideLogOut, LucideEllipsis],
  templateUrl: './shell.component.html',
  styleUrl: './shell.component.scss',
})
export class ShellComponent implements OnInit, OnDestroy {
  @ViewChild('resumeDialog') resumeDialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('moreDialog') moreDialog?: ElementRef<HTMLDialogElement>;
  private pollId?: number;
  readonly focusAction = signal<'pause' | 'wait' | 'finish'>('pause');
  readonly focusError = signal('');
  readonly focusSaving = signal(false);
  readonly resumeForm = new FormGroup({
    checkpoint: new FormControl('', { nonNullable: true }),
    nextAction: new FormControl('', { nonNullable: true }),
  });
  private readonly visibilityHandler = () => {
    if (document.visibilityState === 'visible') void this.memory.refreshFocus();
  };
  constructor(
    readonly auth: AuthService,
    readonly memory: WorkMemoryService,
    private readonly drafts: CaptureDraftService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    void this.memory.refreshFocus();
    this.pollId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void this.memory.refreshFocus();
    }, 120000);
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  ngOnDestroy(): void {
    if (this.pollId) window.clearInterval(this.pollId);
    document.removeEventListener('visibilitychange', this.visibilityHandler);
  }

  openCapture(): void { this.memory.captureOpen.set(true); }

  openFocusDialog(action: 'pause' | 'wait' | 'finish'): void {
    const task = this.memory.focus().task;
    this.focusAction.set(action);
    this.focusError.set('');
    this.resumeForm.reset({ checkpoint: '', nextAction: task?.nextAction || '' });
    this.resumeDialog?.nativeElement.showModal();
  }

  async saveFocusChange(): Promise<void> {
    const focus = this.memory.focus();
    if (!focus.task) return;
    this.focusSaving.set(true);
    this.focusError.set('');
    const { checkpoint, nextAction } = this.resumeForm.getRawValue();
    try {
      if (this.focusAction() === 'finish') {
        await this.memory.focusCommand('finish', {
          action: 'done', expectedFocusVersion: focus.focusVersion,
          checkpoint: checkpoint.trim() || undefined,
        });
      } else {
        await this.memory.focusCommand('pause', {
          reason: this.focusAction(), expectedFocusVersion: focus.focusVersion,
          checkpoint: checkpoint.trim() || undefined,
          nextAction: nextAction.trim() || undefined,
        });
      }
      this.resumeDialog?.nativeElement.close();
    } catch {
      this.focusError.set('Focus changed in another window. Review the refreshed state and try again.');
      await this.memory.refreshFocus().catch(() => undefined);
    } finally { this.focusSaving.set(false); }
  }

  openMore(): void { this.moreDialog?.nativeElement.showModal(); }
  closeMore(): void { this.moreDialog?.nativeElement.close(); }

  async logout(): Promise<void> {
    const ownerId = this.auth.owner()?.id;
    if (ownerId) await this.drafts.clear(ownerId).catch(() => undefined);
    await this.auth.logout();
    await this.router.navigateByUrl('/login');
  }
}
