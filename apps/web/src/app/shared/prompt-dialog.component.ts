import { Component, ElementRef, ViewChild, effect } from '@angular/core';
import { PromptDialogService } from '../core/prompt-dialog.service';

@Component({
  selector: 'app-prompt-dialog',
  template: `
    <dialog #dialog (cancel)="cancel($event)" (close)="closed()">
      @if (prompts.active(); as request) {
        <form method="dialog" (submit)="submit($event)">
          <header><p class="eyebrow">Confirm action</p><h2>{{ request.title }}</h2></header>
          @if (request.message) { <p class="message">{{ request.message }}</p> }
          @if (request.label) {
            <label>{{ request.label }}
              @if (request.multiline) {<textarea #input rows="6" [value]="value" (input)="value = $any($event.target).value" [placeholder]="request.placeholder || ''"></textarea>}
              @else {<input #input [value]="value" (input)="value = $any($event.target).value" [placeholder]="request.placeholder || ''" autocomplete="off" />}
            </label>
          }
          <footer>
            <button type="button" class="secondary" (click)="prompts.cancel()">Cancel</button>
            <button type="submit" [class.danger]="request.destructive" [disabled]="request.requiredText && value !== request.requiredText">{{ request.confirmLabel || 'Confirm' }}</button>
          </footer>
        </form>
      }
    </dialog>
  `,
  styles: [`
    dialog{width:min(30rem,calc(100% - 2rem));margin:auto;padding:0;border:1px solid var(--rule);border-radius:var(--radius-md);background:var(--sheet);box-shadow:var(--shadow-lg)}
    form{padding:1.4rem}header{padding-bottom:1rem;border-bottom:1px solid var(--rule)}h2{margin:0;font-size:1.35rem;letter-spacing:-.02em}.message{margin:1rem 0;color:var(--slate);line-height:1.55;white-space:pre-wrap}label{display:grid;gap:.45rem;margin-top:1rem;font-weight:650}input,textarea{width:100%;min-height:2.75rem;padding:.65rem .75rem;border:1px solid var(--rule-strong);border-radius:var(--radius-sm);background:white}textarea{resize:vertical}footer{display:flex;justify-content:flex-end;gap:.65rem;margin-top:1.4rem}button{min-height:2.75rem;padding:0 1rem;border:1px solid var(--cobalt);border-radius:var(--radius-sm);color:white;background:var(--cobalt);font-weight:700}.secondary{color:var(--ink);border-color:var(--rule-strong);background:white}.danger{border-color:var(--danger);background:var(--danger)}
  `],
})
export class PromptDialogComponent {
  @ViewChild('dialog') dialog?: ElementRef<HTMLDialogElement>;
  @ViewChild('input') input?: ElementRef<HTMLInputElement | HTMLTextAreaElement>;
  value = '';

  constructor(readonly prompts: PromptDialogService) {
    effect(() => {
      const request = prompts.active();
      if (request) {
        this.value = request.value || '';
        queueMicrotask(() => {
          const dialog = this.dialog?.nativeElement;
          if (dialog && !dialog.open) dialog.showModal();
          this.input?.nativeElement.focus();
          this.input?.nativeElement.select();
        });
      } else if (this.dialog?.nativeElement.open) this.dialog.nativeElement.close();
    });
  }

  submit(event: Event): void {
    event.preventDefault();
    const request = this.prompts.active();
    if (!request || (request.requiredText && this.value !== request.requiredText)) return;
    this.prompts.complete(request.label ? this.value.trim() : 'confirmed');
  }
  cancel(event: Event): void { event.preventDefault(); this.prompts.cancel(); }
  closed(): void { if (this.prompts.active()) this.prompts.cancel(); }
}
