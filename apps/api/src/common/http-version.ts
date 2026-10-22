import { HttpException, PreconditionFailedException } from '@nestjs/common';

export const parseIfMatch = (value: string | undefined): number => {
  if (!value) {
    throw new HttpException(
      {
        code: 'PRECONDITION_REQUIRED',
        message: 'Reload this record before changing it.',
      },
      428,
    );
  }
  const match = /^"(\d+)"$/.exec(value.trim());
  if (!match) {
    throw new PreconditionFailedException({
      code: 'VERSION_CONFLICT',
      message: 'The record version is invalid.',
    });
  }
  return Number(match[1]);
};

export const entityTag = (version: number): string => `"${version}"`;
