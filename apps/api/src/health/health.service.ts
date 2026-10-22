import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { access, mkdir } from 'node:fs/promises';
import { constants } from 'node:fs';
import { resolve } from 'node:path';
import { DataSource } from 'typeorm';
import { environment } from '../config/environment';

@Injectable()
export class HealthService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async readiness() {
    await this.dataSource.query('SELECT 1');
    const storageRoot = resolve(environment().storageRoot);
    await mkdir(storageRoot, { recursive: true });
    await access(storageRoot, constants.R_OK | constants.W_OK);
    return { status: 'ready', database: 'reachable', storage: 'writable' };
  }
}
