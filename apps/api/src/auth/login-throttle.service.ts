import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

interface AttemptBucket {
  count: number;
  resetAt: number;
}

@Injectable()
export class LoginThrottleService {
  private readonly attempts = new Map<string, AttemptBucket>();

  consume(key: string): void {
    const now = Date.now();
    const current = this.attempts.get(key);
    const bucket =
      !current || current.resetAt <= now
        ? { count: 0, resetAt: now + 15 * 60 * 1000 }
        : current;
    bucket.count += 1;
    this.attempts.set(key, bucket);
    if (bucket.count > 5) {
      throw new HttpException(
        {
          code: 'RATE_LIMITED',
          message: 'Too many login attempts. Try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  clear(key: string): void {
    this.attempts.delete(key);
  }
}
