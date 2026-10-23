import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { environment } from './config/environment';
import { AppDataSource } from './database/data-source';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';
import { OrganizationModule } from './organization/organization.module';
import { EntriesModule } from './entries/entries.module';
import { TasksModule } from './tasks/tasks.module';
import { FocusModule } from './focus/focus.module';
import { FollowUpsModule } from './follow-ups/follow-ups.module';
import { DataManagementModule } from './data-management/data-management.module';
import { ProcessingModule } from './processing/processing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, load: [environment] }),
    TypeOrmModule.forRoot(AppDataSource.options),
    AuthModule,
    MeModule,
    HealthModule,
    OrganizationModule,
    EntriesModule,
    TasksModule,
    FocusModule,
    FollowUpsModule,
    DataManagementModule,
    ProcessingModule,
  ],
})
export class AppModule {}
