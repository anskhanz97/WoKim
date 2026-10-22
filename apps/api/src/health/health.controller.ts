import { Controller, Get } from '@nestjs/common';
import { ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/public.decorator';
import { HealthService } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Public()
  @Get('live')
  @ApiOperation({
    summary: 'Report process liveness without exposing configuration',
  })
  live() {
    return { data: { status: 'live' } };
  }

  @ApiCookieAuth()
  @Get('ready')
  @ApiOperation({ summary: 'Check database and private storage readiness' })
  async ready() {
    return { data: await this.health.readiness() };
  }
}
