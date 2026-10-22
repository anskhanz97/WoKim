import type { CookieOptions } from 'express';
import { environment } from '../config/environment';

export const authCookieNames = () => {
  const production = environment().nodeEnv === 'production';
  return {
    session: production ? '__Host-wm_session' : 'wm_session',
    csrf: production ? '__Host-wm_csrf' : 'wm_csrf',
  };
};

export const privateCookieOptions = (): CookieOptions => ({
  httpOnly: true,
  secure: environment().nodeEnv === 'production',
  sameSite: 'lax',
  path: '/',
});
