import { TestBed } from '@angular/core/testing';
import { Router, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { describe, expect, it, vi } from 'vitest';
import { AuthService } from './auth.service';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  it('allows an authenticated owner', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { restore: vi.fn().mockResolvedValue(true) } },
        { provide: Router, useValue: { createUrlTree: vi.fn() } },
      ],
    });

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/today' } as RouterStateSnapshot),
    );

    expect(result).toBe(true);
  });

  it('creates the login redirect before awaiting authentication', async () => {
    const loginTree = { redirected: true };
    const createUrlTree = vi.fn().mockReturnValue(loginTree);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { restore: vi.fn().mockResolvedValue(false) } },
        { provide: Router, useValue: { createUrlTree } },
      ],
    });

    const result = await TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, { url: '/today' } as RouterStateSnapshot),
    );

    expect(result).toBe(loginTree);
    expect(createUrlTree).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/today' } });
  });
});
