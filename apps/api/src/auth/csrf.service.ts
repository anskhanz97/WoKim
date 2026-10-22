import { Injectable } from '@nestjs/common';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { environment } from '../config/environment';

@Injectable()
export class CsrfService {
  private readonly secret = environment().auth.csrfSecret;

  issue(): { token: string; cookieValue: string } {
    const token = randomBytes(32).toString('base64url');
    return { token, cookieValue: `${token}.${this.sign(token)}` };
  }

  verify(headerToken: unknown, cookieValue: unknown): boolean {
    if (typeof headerToken !== 'string' || typeof cookieValue !== 'string')
      return false;
    const separator = cookieValue.lastIndexOf('.');
    if (separator < 1) return false;
    const cookieToken = cookieValue.slice(0, separator);
    const signature = cookieValue.slice(separator + 1);
    return (
      this.safeEqual(headerToken, cookieToken) &&
      this.safeEqual(signature, this.sign(cookieToken))
    );
  }

  private sign(token: string): string {
    return createHmac('sha256', this.secret).update(token).digest('base64url');
  }

  private safeEqual(left: string, right: string): boolean {
    const leftBuffer = Buffer.from(left);
    const rightBuffer = Buffer.from(right);
    return (
      leftBuffer.length === rightBuffer.length &&
      timingSafeEqual(leftBuffer, rightBuffer)
    );
  }
}
