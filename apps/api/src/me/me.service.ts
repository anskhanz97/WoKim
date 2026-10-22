import { Injectable, PreconditionFailedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../database/entities/user.entity';
import type { UpdateProfileDto } from '../auth/dto/update-profile.dto';

@Injectable()
export class MeService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly users: Repository<UserEntity>,
  ) {}

  async update(
    ownerId: number,
    version: number,
    input: UpdateProfileDto,
  ): Promise<UserEntity> {
    if (input.timezone) this.assertTimezone(input.timezone);
    const values: Record<string, unknown> = { version: () => 'version + 1' };
    if (input.displayName !== undefined)
      values.displayName = input.displayName.trim();
    if (input.timezone !== undefined) values.timezone = input.timezone;

    const result = await this.users
      .createQueryBuilder()
      .update(UserEntity)
      .set(values)
      .where('id = :ownerId AND version = :version', { ownerId, version })
      .execute();
    if (result.affected !== 1) {
      throw new PreconditionFailedException({
        code: 'VERSION_CONFLICT',
        message: 'Your profile changed elsewhere. Reload it before saving.',
      });
    }
    return this.users.findOneByOrFail({ id: ownerId });
  }

  private assertTimezone(timezone: string): void {
    try {
      new Intl.DateTimeFormat('en', { timeZone: timezone }).format();
    } catch {
      throw new PreconditionFailedException({
        code: 'TIMEZONE_INVALID',
        message: 'Choose a valid timezone.',
      });
    }
  }
}
