import { sessionIdleDays } from './session-duration';

describe('sessionIdleDays', () => {
  it('uses the normal idle limit for a browser session', () => {
    expect(sessionIdleDays(false, 7, 30)).toBe(7);
  });

  it('uses the full lifetime for a remembered session', () => {
    expect(sessionIdleDays(true, 7, 30)).toBe(30);
  });
});
