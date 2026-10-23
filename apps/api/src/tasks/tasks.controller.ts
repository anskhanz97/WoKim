import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { entityTag, parseIfMatch } from '../common/http-version';
import { paginate } from '../common/pagination';
import {
  ConvertEntryToTaskDto,
  CreateTaskDto,
  HistoryQueryDto,
  SupersessionDto,
  TaskQueryDto,
  TaskTransitionDto,
  UpdateTaskDto,
} from './tasks.dto';
import { TasksService } from './tasks.service';

@ApiCookieAuth()
@ApiTags('tasks')
@Controller()
export class TasksController {
  constructor(private readonly service: TasksService) {}
  @Get('tasks') async list(@Query() query: TaskQueryDto) {
    return paginate(await this.service.list(query), query);
  }
  @Post('tasks') async create(
    @Body() input: CreateTaskDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.create(input);
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Get('tasks/:id') async get(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.get(id);
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Patch('tasks/:id') async update(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: UpdateTaskDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.update(id, parseIfMatch(tag), input);
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Post('tasks/:id/transitions') @HttpCode(200) async transition(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Headers('idempotency-key') key: string | undefined,
    @Body() input: TaskTransitionDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.transition(
      id,
      parseIfMatch(tag),
      key || '',
      input,
    );
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Post('entries/:id/convert-to-task') async convert(
    @Param('id') id: string,
    @Headers('idempotency-key') key: string | undefined,
    @Body() input: ConvertEntryToTaskDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.convert(id, key || '', input);
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Post('entries/:id/supersessions') async supersede(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: SupersessionDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.addSupersessions(
      id,
      parseIfMatch(tag),
      input,
    );
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Delete('entries/:id/supersessions/:olderId') async unlink(
    @Param('id') id: string,
    @Param('olderId') olderId: string,
    @Headers('if-match') tag: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.removeSupersession(
      id,
      olderId,
      parseIfMatch(tag),
    );
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Get('projects/:id/decisions') async decisions(
    @Param('id') id: string,
    @Query() query: HistoryQueryDto,
  ) {
    return paginate(await this.service.decisions(id), query);
  }
  @Get('projects/:id/history') async history(
    @Param('id') id: string,
    @Query() query: HistoryQueryDto,
  ) {
    return paginate(
      await this.service.history(id, query.from, query.to),
      query,
    );
  }
}
