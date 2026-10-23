import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { ListQueryDto, paginate } from '../common/pagination';
import {
  RequestProcessingDto,
  ReviewDerivedTextDto,
  UpdateProcessingSettingsDto,
} from './processing.dto';
import { ProcessingService } from './processing.service';

@ApiCookieAuth()
@ApiTags('processing')
@Controller()
export class ProcessingController {
  constructor(private readonly service: ProcessingService) {}
  @Get('processing/settings') async settings() {
    return { data: await this.service.settings() };
  }
  @Patch('processing/settings') async updateSettings(
    @Body() input: UpdateProcessingSettingsDto,
  ) {
    return { data: await this.service.updateSettings(input) };
  }
  @Post(['attachments/:id/jobs', 'attachments/:id/processing']) async request(
    @Param('id') id: string,
    @Body() input: RequestProcessingDto,
  ) {
    return { data: await this.service.request(id, input) };
  }
  @Get('attachments/:id/jobs') async jobs(
    @Param('id') id: string,
    @Query() query: ListQueryDto,
  ) {
    return paginate(await this.service.jobsFor(id), query);
  }
  @Get(['attachments/:id/derived-texts', 'attachments/:id/texts']) async texts(
    @Param('id') id: string,
    @Query() query: ListQueryDto,
  ) {
    return paginate(await this.service.texts(id), query);
  }
  @Patch('derived-texts/:id') async review(
    @Param('id') id: string,
    @Body() input: ReviewDerivedTextDto,
  ) {
    return {
      data: await this.service.review(id, input.expectedVersion, input.text),
    };
  }
  @Post('jobs/:id/retry') @HttpCode(202) async retry(@Param('id') id: string) {
    return { data: await this.service.retry(id) };
  }
}
