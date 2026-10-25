import { describe, expect, it } from 'vitest';
import { greetingFor } from './today.component';

describe('greetingFor', () => {
  it.each([
    ['2026-10-25T19:38:00.000Z', 'Good night'],
    ['2026-10-26T01:00:00.000Z', 'Good morning'],
    ['2026-10-26T08:00:00.000Z', 'Good afternoon'],
    ['2026-10-26T13:00:00.000Z', 'Good evening'],
  ])('uses the saved Karachi hour at %s', (value, expected) => {
    expect(greetingFor(new Date(value), 'Asia/Karachi')).toBe(expected);
  });
});
