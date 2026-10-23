import { BadRequestException } from '@nestjs/common';
import { paginate } from './pagination';

describe('paginate', () => {
  const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];

  it('continues after the last item and binds the cursor to its filters', () => {
    const first = paginate(items, { limit: 2 });

    expect(first.data).toEqual(items.slice(0, 2));
    expect(first.page.nextCursor).toEqual(expect.any(String));
    expect(
      paginate(items, { limit: 2, cursor: first.page.nextCursor! }),
    ).toEqual({
      data: [items[2]],
      page: { nextCursor: null },
    });
    expect(() =>
      paginate(items, {
        limit: 2,
        cursor: first.page.nextCursor!,
        status: 'done',
      } as never),
    ).toThrow(BadRequestException);
  });

  it('rejects a tampered cursor', () => {
    const cursor = paginate(items, { limit: 1 }).page.nextCursor!;

    expect(() => paginate(items, { cursor: `${cursor}x` })).toThrow(
      BadRequestException,
    );
  });

  it('traverses collections larger than the former service caps', () => {
    const many = Array.from({ length: 250 }, (_, index) => ({
      id: `${index}`,
    }));
    const seen: string[] = [];
    let cursor: string | null | undefined;

    do {
      const page = paginate(many, { limit: 100, cursor: cursor || undefined });
      seen.push(...page.data.map((item) => item.id));
      cursor = page.page.nextCursor;
    } while (cursor);

    expect(seen).toEqual(many.map((item) => item.id));
  });
});
