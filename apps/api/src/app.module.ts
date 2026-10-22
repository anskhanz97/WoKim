import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { environment } from './config/environment';
import { AppDataSource } from './database/data-source';
import { HealthModule } from './health/health.module';
import { MeModule } from './me/me.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, load: [environment] }),
    TypeOrmModule.forRoot(AppDataSource.options),
    AuthModule,
    MeModule,
    HealthModule,
  ],
})
export class AppModule {}
