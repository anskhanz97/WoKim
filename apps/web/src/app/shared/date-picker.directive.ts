import { AfterViewInit, Directive, ElementRef, OnDestroy, inject } from '@angular/core';
import { NgControl } from '@angular/forms';
import { Subscription } from 'rxjs';

let nextDateId = 0;

@Directive({ selector: 'input[type=date]' })
export class DatePickerDirective implements AfterViewInit, OnDestroy {
  private readonly element: HTMLInputElement = inject(ElementRef<HTMLInputElement>).nativeElement;
  private readonly control = inject(NgControl, { self: true, optional: true });
  private readonly trigger = document.createElement('button');
  private readonly popover = document.createElement('div');
  private readonly id = `wk-date-${++nextDateId}`;
  private viewDate = new Date();
  private subscription?: Subscription;

  ngAfterViewInit(): void {
    const parent = this.element.parentNode;
    if (!parent) return;
    const wrapper = document.createElement('span');
    wrapper.className = 'wk-date';
    parent.insertBefore(wrapper, this.element);
    wrapper.append(this.element, this.trigger);
    this.element.classList.add('wk-date__native');

    this.trigger.type = 'button';
    this.trigger.className = 'wk-date__trigger';
    this.trigger.setAttribute('aria-haspopup', 'dialog');
    this.trigger.setAttribute('aria-controls', this.id);
    this.trigger.setAttribute('aria-expanded', 'false');
    this.trigger.setAttribute('aria-label', this.fieldLabel());
    this.trigger.innerHTML = '<span></span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M8 2v4m8-4v4M3 10h18M5 4h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z"/></svg>';

    this.popover.id = this.id;
    this.popover.className = 'wk-calendar';
    this.popover.setAttribute('popover', 'auto');
    this.popover.setAttribute('role', 'dialog');
    this.popover.setAttribute('aria-label', this.fieldLabel());
    document.body.append(this.popover);

    this.trigger.addEventListener('click', this.toggle);
    this.trigger.addEventListener('keydown', this.onTriggerKeydown);
    this.popover.addEventListener('toggle', this.onToggle);
    this.element.addEventListener('change', this.sync);
    this.element.addEventListener('focus', this.forwardFocus);
    this.subscription = this.control?.valueChanges?.subscribe(() => queueMicrotask(this.sync));
    this.sync();
  }

  ngOnDestroy(): void {
    this.subscription?.unsubscribe();
    this.trigger.removeEventListener('click', this.toggle);
    this.trigger.removeEventListener('keydown', this.onTriggerKeydown);
    this.popover.removeEventListener('toggle', this.onToggle);
    this.element.removeEventListener('change', this.sync);
    this.element.removeEventListener('focus', this.forwardFocus);
    this.popover.remove();
  }

  private readonly toggle = (event: Event) => {
    event.preventDefault();
    event.stopPropagation();
    if (this.popover.matches(':popover-open')) this.popover.hidePopover();
    else this.open();
  };

  private readonly onToggle = () => this.trigger.setAttribute('aria-expanded', String(this.popover.matches(':popover-open')));
  private readonly forwardFocus = () => this.trigger.focus();
  private readonly onTriggerKeydown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.open();
    } else if (event.key === 'Escape' && this.popover.matches(':popover-open')) {
      this.popover.hidePopover();
    }
  };

  private open(): void {
    if (this.trigger.disabled) return;
    this.viewDate = this.parse(this.element.value) || new Date();
    this.renderCalendar();
    this.popover.showPopover();
    const rect = this.trigger.getBoundingClientRect();
    const width = Math.min(326, window.innerWidth - 16);
    this.popover.style.width = `${width}px`;
    this.popover.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - width - 8))}px`;
    const height = Math.min(this.popover.scrollHeight, 390);
    this.popover.style.top = `${window.innerHeight - rect.bottom >= height + 12 ? rect.bottom + 6 : Math.max(8, rect.top - height - 6)}px`;
  }

  private renderCalendar(): void {
    this.popover.replaceChildren();
    const header = document.createElement('header');
    const previous = this.iconButton('Previous month', 'm15 18-6-6 6-6');
    const next = this.iconButton('Next month', 'm9 18 6-6-6-6');
    const heading = document.createElement('strong');
    heading.textContent = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(this.viewDate);
    previous.addEventListener('click', () => this.changeMonth(-1));
    next.addEventListener('click', () => this.changeMonth(1));
    header.append(previous, heading, next);
    this.popover.append(header);

    const grid = document.createElement('div');
    grid.className = 'wk-calendar__grid';
    const week = new Date(2026, 0, 4);
    for (let day = 0; day < 7; day += 1) {
      const label = document.createElement('span');
      const date = new Date(week);
      date.setDate(week.getDate() + day);
      label.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date).slice(0, 2);
      grid.append(label);
    }

    const first = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    const selected = this.element.value;
    const today = this.format(new Date());
    for (let index = 0; index < 42; index += 1) {
      const date = new Date(start);
      date.setDate(start.getDate() + index);
      const value = this.format(date);
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = String(date.getDate());
      button.className = 'wk-calendar__day';
      button.dataset['outside'] = String(date.getMonth() !== this.viewDate.getMonth());
      if (value === today) button.dataset['today'] = 'true';
      if (value === selected) button.setAttribute('aria-current', 'date');
      button.setAttribute('aria-label', new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date));
      button.disabled = (!!this.element.min && value < this.element.min) || (!!this.element.max && value > this.element.max);
      button.addEventListener('click', () => this.select(value));
      grid.append(button);
    }
    this.popover.append(grid);

    const footer = document.createElement('footer');
    const todayButton = document.createElement('button');
    todayButton.type = 'button';
    todayButton.textContent = 'Today';
    todayButton.addEventListener('click', () => this.select(today));
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.textContent = 'Clear';
    clear.disabled = !this.element.value;
    clear.addEventListener('click', () => this.select(''));
    footer.append(todayButton, clear);
    this.popover.append(footer);
  }

  private changeMonth(offset: number): void {
    this.viewDate = new Date(this.viewDate.getFullYear(), this.viewDate.getMonth() + offset, 1);
    this.renderCalendar();
  }

  private select(value: string): void {
    this.element.value = value;
    this.element.dispatchEvent(new Event('input', { bubbles: true }));
    this.element.dispatchEvent(new Event('change', { bubbles: true }));
    this.popover.hidePopover();
    this.trigger.focus();
  }

  private readonly sync = () => {
    const value = this.trigger.querySelector('span');
    const date = this.parse(this.element.value);
    if (value) value.textContent = date ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date) : 'Choose a date';
    this.trigger.disabled = this.element.disabled;
  };

  private parse(value: string): Date | null {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }

  private format(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  private iconButton(label: string, path: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.setAttribute('aria-label', label);
    button.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${path}"/></svg>`;
    return button;
  }

  private fieldLabel(): string {
    const field = this.element.closest('label');
    let text = '';
    if (field) {
      for (const node of field.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          text = node.textContent?.trim() || '';
          if (text) break;
        }
      }
    }
    const label = this.element.getAttribute('aria-label') || text;
    return label || 'Choose a date';
  }
}
