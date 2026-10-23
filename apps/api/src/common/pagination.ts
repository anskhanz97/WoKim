import { BadRequestException } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { environment } from '../config/environment';

export class ListQueryDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  cursor?: string;
}

const fingerprint = (query: ListQueryDto): string => {
  const filters = Object.fromEntries(
    Object.entries(query)
      .filter(
        ([key, value]) =>
          key !== 'cursor' && key !== 'limit' && value !== undefined,
      )
      .sort(([left], [right]) => left.localeCompare(right)),
  );
  return createHash('sha256')
    .update(JSON.stringify(filters))
    .digest('base64url');
};

const invalidCursor = () =>
  new BadRequestException({
    code: 'INVALID_CURSOR',
    message: 'The list cursor is invalid for these filters.',
  });

export const paginate = <T extends { id: string }>(
  items: T[],
  query: ListQueryDto,
) => {
  // shortcut: lists are materialized in memory; move cursor predicates into repositories before allowing 10,000+ rows.
  const limit = query.limit || 25;
  const filterHash = fingerprint(query);
  let start = 0;
  if (query.cursor) {
    try {
      const [body, signature] = query.cursor.split('.');
      if (!body || !signature) throw invalidCursor();
      const expected = createHmac('sha256', environment().auth.csrfSecret)
        .update(body)
        .digest();
      const supplied = Buffer.from(signature, 'base64url');
      if (
        supplied.length !== expected.length ||
        !timingSafeEqual(supplied, expected)
      )
        throw invalidCursor();
      const payload = JSON.parse(
        Buffer.from(body, 'base64url').toString('utf8'),
      ) as {
        after?: string;
        filters?: string;
      };
      if (!payload.after || payload.filters !== filterHash)
        throw invalidCursor();
      const index = items.findIndex((item) => item.id === payload.after);
      if (index < 0) throw invalidCursor();
      start = index + 1;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      throw invalidCursor();
    }
  }
  const data = items.slice(start, start + limit);
  const last = data.at(-1);
  let nextCursor: string | null = null;
  if (last && start + data.length < items.length) {
    const body = Buffer.from(
      JSON.stringify({ after: last.id, filters: filterHash }),
    ).toString('base64url');
    const signature = createHmac('sha256', environment().auth.csrfSecret)
      .update(body)
      .digest('base64url');
    nextCursor = `${body}.${signature}`;
  }
  return { data, page: { nextCursor } };
};
