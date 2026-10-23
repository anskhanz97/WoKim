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
import { ListQueryDto, paginate } from '../common/pagination';
import {
  CreateEvidenceSetDto,
  CreateFollowUpDto,
  EvidenceItemDto,
  EvidenceSetQueryDto,
  FollowUpQueryDto,
  UpdateEvidenceItemDto,
  UpdateEvidenceSetDto,
  UpdateFollowUpDto,
} from './follow-ups.dto';
import { FollowUpsService } from './follow-ups.service';

@ApiCookieAuth()
@ApiTags('follow-ups and evidence')
@Controller()
export class FollowUpsController {
  constructor(private readonly service: FollowUpsService) {}
  @Get('follow-ups') async list(@Query() query: FollowUpQueryDto) {
    return paginate(await this.service.list(query), query);
  }
  @Post('follow-ups') async create(
    @Body() input: CreateFollowUpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.createFollowUp(input);
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Get('follow-ups/:id') async get(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.getFollowUp(id);
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Patch('follow-ups/:id') async update(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: UpdateFollowUpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.updateFollowUp(
      id,
      parseIfMatch(tag),
      input,
    );
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Get('evidence-sets') async sets(@Query() query: EvidenceSetQueryDto) {
    return paginate(
      await this.service.listSets(query.taskId, query.projectId),
      query,
    );
  }
  @Get('tasks/:id/evidence-images') async taskImages(
    @Param('id') id: string,
    @Query() query: ListQueryDto,
  ) {
    return paginate(await this.service.taskImages(id), query);
  }
  @Post('evidence-sets') async createSet(
    @Body() input: CreateEvidenceSetDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.createSet(input);
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Get('evidence-sets/:id') async evidence(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.evidence(id);
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Patch('evidence-sets/:id') async updateSet(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: UpdateEvidenceSetDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.updateSet(id, parseIfMatch(tag), input);
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Delete('evidence-sets/:id') @HttpCode(204) async deleteSet(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
  ) {
    await this.service.deleteSet(id, parseIfMatch(tag));
  }
  @Post('evidence-sets/:id/items') async addItem(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: EvidenceItemDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.addItem(id, parseIfMatch(tag), input);
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Patch('evidence-sets/:id/items/:itemId') async updateItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: UpdateEvidenceItemDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.updateItem(
      id,
      itemId,
      parseIfMatch(tag),
      input,
    );
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
  @Delete('evidence-sets/:id/items/:itemId') async removeItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Headers('if-match') tag: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    const data = await this.service.removeItem(id, itemId, parseIfMatch(tag));
    response.setHeader('ETag', entityTag(data.version));
    return { data };
  }
}
