import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ListQueryDto, paginate } from '../common/pagination';
import {
  FocusFinishDto,
  FocusPauseDto,
  FocusStartDto,
  FocusSwitchDto,
  SaveCheckInDto,
  TodayQueryDto,
} from './focus.dto';
import { FocusService } from './focus.service';

@ApiCookieAuth()
@ApiTags('focus')
@Controller()
export class FocusController {
  constructor(private readonly service: FocusService) {}

  @Get('focus') async focus() {
    return { data: await this.service.get() };
  }
  @Post('focus/start') @HttpCode(200) async start(
    @Headers('idempotency-key') key: string | undefined,
    @Body() input: FocusStartDto,
  ) {
    return { data: await this.service.start(key || '', input) };
  }
  @Post('focus/switch') @HttpCode(200) async switch(
    @Headers('idempotency-key') key: string | undefined,
    @Body() input: FocusSwitchDto,
  ) {
    return { data: await this.service.switch(key || '', input) };
  }
  @Post('focus/pause') @HttpCode(200) async pause(
    @Headers('idempotency-key') key: string | undefined,
    @Body() input: FocusPauseDto,
  ) {
    return { data: await this.service.pause(key || '', input) };
  }
  @Post('focus/finish') @HttpCode(200) async finish(
    @Headers('idempotency-key') key: string | undefined,
    @Body() input: FocusFinishDto,
  ) {
    return { data: await this.service.finish(key || '', input) };
  }
  @Get('tasks/:id/sessions') async sessions(
    @Param('id') id: string,
    @Query() query: ListQueryDto,
  ) {
    return paginate(await this.service.sessions(id), query);
  }
  @Get('today') async today(@Query() query: TodayQueryDto) {
    return { data: await this.service.today(query.date) };
  }
  @Get('check-ins/:date') async checkIn(@Param('date') date: string) {
    return { data: await this.service.checkIn(date) };
  }
  @Put('check-ins/:date') async saveCheckIn(
    @Param('date') date: string,
    @Body() input: SaveCheckInDto,
  ) {
    return { data: await this.service.saveCheckIn(date, input) };
  }
}
