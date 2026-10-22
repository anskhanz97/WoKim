import { CsrfService } from './csrf.service';

describe('CsrfService', () => {
  const service = new CsrfService();

  it('accepts only the token paired with its signed cookie', () => {
    const first = service.issue();
    const second = service.issue();
    expect(service.verify(first.token, first.cookieValue)).toBe(true);
    expect(service.verify(first.token, second.cookieValue)).toBe(false);
    expect(service.verify('tampered', first.cookieValue)).toBe(false);
  });
});
