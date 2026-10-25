import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

let nextSelectId = 0;

@Directive({ selector: 'select:not([multiple])' })
export class SelectMenuDirective implements AfterViewInit, OnDestroy {
  private readonly element: HTMLSelectElement = inject(ElementRef<HTMLSelectElement>).nativeElement;
  private readonly control = inject(NgControl, { self: true, optional: true });
  private readonly trigger = document.createElement('button');
  private readonly menu = document.createElement('div');
  private readonly observer = new MutationObserver(() => this.render());
  private subscription?: Subscription;
  private wrapper?: HTMLSpanElement;
  private readonly id = `wk-select-${++nextSelectId}`;

  ngAfterViewInit(): void {
    const parent = this.element.parentNode;
    if (!parent) return;

    this.wrapper = document.createElement('span');
    this.wrapper.className = 'wk-select';
    parent.insertBefore(this.wrapper, this.element);
    this.wrapper.append(this.element, this.trigger);

    this.element.classList.add('wk-select__native');
    this.trigger.type = 'button';
    this.trigger.className = 'wk-select__trigger';
    this.trigger.setAttribute('role', 'combobox');
    this.trigger.setAttribute('aria-haspopup', 'listbox');
    this.trigger.setAttribute('aria-controls', this.id);
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.setAttribute('aria-label', this.fieldLabel());
    this.trigger.innerHTML = '<span class="wk-select__value"></span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m7 10 5 5 5-5"/></svg>';

    this.menu.id = this.id;
    this.menu.className = 'wk-select__menu';
    this.menu.setAttribute('role', 'listbox');
    this.menu.setAttribute('popover', 'auto');
    document.body.append(this.menu);

    this.trigger.addEventListener('click', this.toggle);
    this.trigger.addEventListener('keydown', this.onTriggerKeydown);
    this.menu.addEventListener('keydown', this.onMenuKeydown);
    this.menu.addEventListener('toggle', this.onToggle);
    this.element.addEventListener('change', this.render);
    this.element.addEventListener('focus', this.forwardFocus);
    this.observer.observe(this.element, { childList: true, subtree: true, characterData: true });
    this.subscription = this.control?.valueChanges?.subscribe(() => queueMicrotask(() => this.render()));
    this.render();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.observer.disconnect();
    this.trigger.removeEventListener('click', this.toggle);
    this.trigger.removeEventListener('keydown', this.onTriggerKeydown);
    this.menu.removeEventListener('keydown', this.onMenuKeydown);
    this.menu.removeEventListener('toggle', this.onToggle);
    this.element.removeEventListener('change', this.render);
    this.element.removeEventListener('focus', this.forwardFocus);
    this.menu.remove();
  }

  private readonly toggle = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    this.isOpen() ? this.close() : this.open(false);
  };

  private readonly onToggle = () => {
    this.trigger.setAttribute('aria-expanded', String(this.isOpen()));
  };

  private readonly onTriggerKeydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.open(true);
    } else if (event.key === 'Escape') {
      this.close();
    }
  };

  private readonly onMenuKeydown = (event: KeyboardEvent) => {
    const options = Array.from(this.menu.querySelectorAll<HTMLButtonElement>('[role="option"]:not(:disabled)'));
    const index = options.indexOf(document.activeElement as HTMLButtonElement);
    let next = index;
    if (event.key === 'ArrowDown') next = Math.min(options.length - 1, index + 1);
    else if (event.key === 'ArrowUp') next = Math.max(0, index - 1);
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = options.length - 1;
    else if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      this.trigger.focus();
      return;
    } else return;
    event.preventDefault();
    options[next]?.focus();
  };

  private readonly forwardFocus = () => this.trigger.focus();

  private open(focusOption: boolean): void {
    if (this.trigger.disabled || this.isOpen()) return;
    this.render();
    this.menu.showPopover();
    const rect = this.trigger.getBoundingClientRect();
    const width = Math.max(rect.width, 180);
    this.menu.style.width = `${Math.min(width, window.innerWidth - 16)}px`;
    this.menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
    const menuHeight = Math.min(this.menu.scrollHeight, 320);
    const below = window.innerHeight - rect.bottom;
    this.menu.style.top = `${below >= menuHeight + 12 ? rect.bottom + 6 : Math.max(8, rect.top - menuHeight - 6)}px`;
    if (focusOption) {
      requestAnimationFrame(() => {
        const option = this.menu.querySelector<HTMLElement>('[aria-selected="true"]') || this.menu.querySelector<HTMLElement>('[role="option"]');
        option?.focus();
      });
    }
  }

  private close(): void {
    if (this.isOpen()) this.menu.hidePopover();
  }

  private isOpen(): boolean {
    return this.menu.matches(':popover-open');
  }

  private readonly render = () => {
    const selected = this.element.selectedOptions[0];
    const value = this.trigger.querySelector<HTMLElement>('.wk-select__value');
    if (value) value.textContent = selected?.textContent?.trim() || 'Choose an option';
    this.trigger.disabled = this.element.disabled;
    this.menu.replaceChildren();
    Array.from(this.element.querySelectorAll<HTMLOptionElement>('option')).forEach((option, index) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'wk-select__option';
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(option.selected));
      item.disabled = option.disabled;
      item.innerHTML = `<span></span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"/></svg>`;
      item.querySelector('span')!.textContent = option.textContent?.trim() || '';
      item.addEventListener('click', () => {
        this.element.selectedIndex = index;
        this.element.dispatchEvent(new Event('input', { bubbles: true }));
        this.element.dispatchEvent(new Event('change', { bubbles: true }));
        this.close();
        this.trigger.focus();
      });
      this.menu.append(item);
    });
  };

  private fieldLabel(): string {
    const explicit = this.element.getAttribute('aria-label');
    if (explicit) return explicit;
    const label = this.element.closest('label');
    let text = '';
    if (label) {
      for (const node of label.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          text = node.textContent?.trim() || '';
          if (text) break;
        }
      }
    }
    return text || 'Choose an option';
  }
}
