import { CommonModule } from '@angular/common';
import { Component, computed, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../core/auth/auth.service';
import { DailyActivity, Task, TodayView, WorkMemoryService } from '../../core/work-memory.service';
import { LucideArrowRight, LucideAudioLines, LucideCalendarDays, LucideCamera, LucideCirclePause, LucideClock3, LucideFolderKanban, LucideListChecks, LucideMessageCircleQuestionMark, LucidePlay, LucideSparkles, LucideX, LucideZap } from '@lucide/angular';
import { DatePickerDirective } from '../../shared/date-picker.directive';

export function greetingFor(date: Date, timeZone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone }).format(date),
  );
  if (hour < 5) return 'Good night';
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  if (hour < 21) return 'Good evening';
  return 'Good night';
}

@Component({
  imports: [CommonModule, ReactiveFormsModule, RouterLink, LucideArrowRight, LucideAudioLines, LucideCalendarDays, LucideCamera, LucideCirclePause, LucideClock3, LucideFolderKanban, LucideListChecks, LucideMessageCircleQuestionMark, LucidePlay, LucideSparkles, LucideX, LucideZap, DatePickerDirective],
  templateUrl: './today.component.html',
  styleUrl: './today.component.scss',
})
export class TodayComponent implements OnInit {
  readonly Boolean = Boolean;
  readonly view = signal<TodayView | null>(null);
  readonly error = signal('');
  readonly saved = signal(false);
  readonly historyTask = signal<Task | null>(null);
  readonly historyTaskLoading = signal(false);
  readonly historyDate = new FormControl('', { nonNullable: true });
  readonly form = new FormGroup({
    intendedOutcome: new FormControl('', { nonNullable: true }),
    interruptionNotes: new FormControl('', { nonNullable: true }),
    deadlineNotes: new FormControl('', { nonNullable: true }),
    waitingNotes: new FormControl('', { nonNullable: true }),
    reflection: new FormControl('', { nonNullable: true }),
  });
  readonly greeting = computed(() => greetingFor(new Date(), this.auth.owner()?.timezone ?? 'UTC'));
  readonly todayLabel = computed(() =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      timeZone: this.auth.owner()?.timezone ?? 'UTC',
    }).format(new Date()),
  );

  constructor(
    readonly auth: AuthService,
    readonly memory: WorkMemoryService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe((params) => void this.load(params.get('date') || undefined));
  }

  isHistoric() { return Boolean(this.route.snapshot.paramMap.get('date')); }

  activityLabel(value: string) {
    return value.replaceAll('.', ' ').replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  activitySummary(activity: DailyActivity) {
    return String(
      activity.payload['title'] ||
        activity.payload['reason'] ||
        activity.payload['status'] ||
        activity.entryTitle ||
        activity.taskTitle ||
        'This change was preserved in the work timeline.',
    );
  }

  async openHistoryTask(taskId: string) {
    this.historyTaskLoading.set(true);
    try {
      this.historyTask.set((await this.memory.task(taskId)).data);
    } catch {
      this.error.set('Task details could not be opened. Reload and try again.');
    } finally {
      this.historyTaskLoading.set(false);
    }
  }

  async load(date?: string) {
    this.error.set('');
    try {
      const view = await this.memory.today(date);
      this.view.set(view);
      this.historyDate.setValue(view.localDate);
      this.form.patchValue({
        intendedOutcome: view.checkIn?.intendedOutcome || '',
        interruptionNotes: view.checkIn?.interruptionNotes || '',
        deadlineNotes: view.checkIn?.deadlineNotes || '',
        waitingNotes: view.checkIn?.waitingNotes || '',
        reflection: view.checkIn?.reflection || '',
      });
    } catch {
      this.error.set('Today could not be loaded.');
    }
  }

  async focusTask(task: Task) {
    const focus = this.memory.focus();
    try {
      await this.memory.focusCommand(
        focus.task ? 'switch' : 'start',
        focus.task
          ? { targetTaskId: task.id, expectedFocusVersion: focus.focusVersion }
          : { taskId: task.id, expectedFocusVersion: focus.focusVersion },
      );
      await this.load(this.view()?.localDate);
    } catch {
      this.error.set('Focus changed elsewhere. The current state has been refreshed.');
      await this.load(this.view()?.localDate);
    }
  }

  async save() {
    const view = this.view();
    if (!view) return;
    this.error.set('');
    this.saved.set(false);
    try {
      const items = [
        ...(view.focus.task ? [{ section: 'current', taskId: view.focus.task.id }] : []),
        ...view.paused.map((task) => ({ section: 'paused', taskId: task.id })),
        ...view.due.map((task) => ({ section: 'due', taskId: task.id })),
        ...view.waiting.map((item) => ({ section: 'waiting', followUpId: item.id })),
      ];
      const checkIn = await this.memory.saveCheckIn(view.localDate, {
        expectedVersion: view.checkIn?.version ?? null,
        timezone: view.timezone,
        ...this.form.getRawValue(),
        items,
      });
      this.view.set({ ...view, checkIn });
      this.saved.set(true);
    } catch {
      this.error.set('The check-in changed elsewhere or contains an unavailable item. Reload and retry.');
    }
  }
}
