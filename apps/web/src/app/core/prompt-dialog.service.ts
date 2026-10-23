import { Injectable, signal } from '@angular/core';

export interface PromptDialogRequest {
  title: string;
  message?: string;
  label?: string;
  value?: string;
  placeholder?: string;
  confirmLabel?: string;
  destructive?: boolean;
  requiredText?: string;
  multiline?: boolean;
}

interface ActivePrompt extends PromptDialogRequest { resolve: (value: string | null) => void; }

@Injectable({ providedIn: 'root' })
export class PromptDialogService {
  readonly active = signal<ActivePrompt | null>(null);

  ask(request: PromptDialogRequest): Promise<string | null> {
    this.cancel();
    return new Promise((resolve) => this.active.set({ ...request, resolve }));
  }

  async confirm(request: Omit<PromptDialogRequest, 'label' | 'value'>): Promise<boolean> {
    return (await this.ask(request)) !== null;
  }

  complete(value: string): void {
    const request = this.active();
    if (!request) return;
    this.active.set(null);
    request.resolve(value);
  }

  cancel(): void {
    const request = this.active();
    if (!request) return;
    this.active.set(null);
    request.resolve(null);
  }
}
