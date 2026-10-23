import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Query,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { createReadStream } from 'node:fs';
import {
  CreateExportDto,
  PurgeDto,
  SearchQueryDto,
  TrashCommandDto,
} from './data-management.dto';
import { DataManagementService } from './data-management.service';

@ApiCookieAuth()
@ApiTags('data management')
@Controller()
export class DataManagementController {
  constructor(private readonly service: DataManagementService) {}
  @Get('search') async search(@Query() query: SearchQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const results = await this.service.search(query);
    const start = (page - 1) * limit;
    return {
      data: results.slice(start, start + limit),
      page: { number: page, limit, hasMore: start + limit < results.length },
    };
  }
  @Get('projects/:id/overview') async overview(@Param('id') id: string) {
    return { data: await this.service.overview(id) };
  }
  @Post('exports') async createExport(
    @Body() input: CreateExportDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    response.status(202);
    return { data: await this.service.createExport(input) };
  }
  @Get('exports/:id/content')
  @Header('Cache-Control', 'private, no-store')
  async exportContent(@Param('id') id: string, @Res() response: Response) {
    const file = await this.service.exportContent(id);
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Length', file.size);
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.filename}"`,
    );
    createReadStream(file.path).pipe(response);
  }
  @Delete('exports/:id') @HttpCode(204) async cancelExport(
    @Param('id') id: string,
  ) {
    await this.service.cancelExport(id);
  }
  @Get('trash') async trash() {
    return { data: await this.service.trash() };
  }
  @Delete('tasks/:id') async trashTask(
    @Param('id') id: string,
    @Body() input: TrashCommandDto,
  ) {
    return {
      data: await this.service.trashTask(
        id,
        input.expectedVersion,
        input.expectedFocusVersion,
      ),
    };
  }
  @Post('trash/:kind/:id/restore') async restore(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body() input: TrashCommandDto,
  ) {
    return {
      data: await this.service.restore(kind, id, input.expectedVersion),
    };
  }
  @Delete('trash/:kind/:id') async purge(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body() input: PurgeDto,
  ) {
    return { data: await this.service.purge(kind, id, input) };
  }
  @Get('data/summary') async summary() {
    return { data: await this.service.summary() };
  }
  @Post('maintenance/reconcile') async reconcile() {
    return { data: await this.service.reconcile() };
  }
  @Post('maintenance/retention') async retention() {
    return { data: await this.service.retention() };
  }
}
