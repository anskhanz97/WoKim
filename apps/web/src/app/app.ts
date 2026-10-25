import { Component, ElementRef, HostListener, ViewChild, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  template: `
    <router-outlet />
    <dialog
      #imageDialog
      class="image-lightbox"
      aria-labelledby="image-lightbox-title"
      (click)="onDialogClick($event)"
      (close)="closeLightbox()"
    >
      @if (lightbox(); as image) {
        <div class="image-lightbox__surface">
          <header>
            <div>
              <span class="image-lightbox__eyebrow">Image preview</span>
              <h2 id="image-lightbox-title">{{ image.alt }}</h2>
            </div>
            <button type="button" aria-label="Close image preview" (click)="imageDialog.close()">
              <svg aria-hidden="true" viewBox="0 0 24 24">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </header>
          <div class="image-lightbox__canvas">
            <img [src]="image.src" [alt]="image.alt" data-no-zoom />
          </div>
          <p>Press Esc or click outside the image to close.</p>
        </div>
      }
    </dialog>
  `,
  styleUrl: './app.scss',
})
export class App {
  @ViewChild('imageDialog', { static: true }) private imageDialog!: ElementRef<HTMLDialogElement>;
  readonly lightbox = signal<{ src: string; alt: string } | null>(null);
  private lightboxTrigger: HTMLElement | null = null;

  @HostListener('document:click', ['$event'])
  onImageClick(event: MouseEvent) {
    const target = event.target;
    if (!(target instanceof Element)) return;
    const image = target.closest('img');
    if (!(image instanceof HTMLImageElement) || image.hasAttribute('data-no-zoom')) return;
    event.preventDefault();
    this.openImage(image);
  }

  @HostListener('document:keydown', ['$event'])
  onImageKeydown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const image = event.target;
    if (!(image instanceof HTMLImageElement) || image.hasAttribute('data-no-zoom')) return;
    event.preventDefault();
    this.openImage(image);
  }

  onDialogClick(event: MouseEvent) {
    if (event.target === this.imageDialog.nativeElement) this.imageDialog.nativeElement.close();
  }

  closeLightbox() {
    if (this.imageDialog.nativeElement.open) this.imageDialog.nativeElement.close();
    this.lightbox.set(null);
    this.lightboxTrigger?.focus({ preventScroll: true });
    this.lightboxTrigger = null;
  }

  private openImage(image: HTMLImageElement) {
    const alt = image.alt.trim();
    if (!alt || !image.currentSrc) return;
    this.lightboxTrigger = image;
    this.lightbox.set({
      src: image.currentSrc.replace(/\/thumbnail(?=\?|$)/, '/content'),
      alt,
    });
    if (!this.imageDialog.nativeElement.open) this.imageDialog.nativeElement.showModal();
  }
}
