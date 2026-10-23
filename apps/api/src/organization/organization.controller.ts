import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { entityTag, parseIfMatch } from '../common/http-version';
import { paginate } from '../common/pagination';
import {
  AssociationRoleDto,
  CreatePersonDto,
  CreateProjectDto,
  CreateTeamDto,
  DirectoryQueryDto,
  ProjectQueryDto,
  ProjectTransitionDto,
  UpdatePersonDto,
  UpdateProjectDto,
  UpdateTeamDto,
} from './organization.dto';
import { OrganizationService } from './organization.service';

const tagged = <T extends { version: number }>(
  value: T,
  response: Response,
) => {
  response.setHeader('ETag', entityTag(value.version));
  return { data: value };
};

@ApiCookieAuth()
@ApiTags('organization')
@Controller()
export class OrganizationController {
  constructor(private readonly service: OrganizationService) {}
  @Get('people') async people(@Query() query: DirectoryQueryDto) {
    return paginate(await this.service.listPeople(query), query);
  }
  @Post('people') async createPerson(
    @Body() input: CreatePersonDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(await this.service.createPerson(input), response);
  }
  @Get('people/:id') async person(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(await this.service.person(id), response);
  }
  @Patch('people/:id') async updatePerson(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: UpdatePersonDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(
      await this.service.updatePerson(id, parseIfMatch(tag), input),
      response,
    );
  }
  @Put('people/:id/teams/:teamId') async setPersonTeam(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: AssociationRoleDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(
      await this.service.setPersonTeam(
        id,
        teamId,
        parseIfMatch(tag),
        input.roleLabel,
      ),
      response,
    );
  }
  @Delete('people/:id/teams/:teamId') async removePersonTeam(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Headers('if-match') tag: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(
      await this.service.removePersonTeam(id, teamId, parseIfMatch(tag)),
      response,
    );
  }
  @Get('teams') async teams(@Query() query: DirectoryQueryDto) {
    return paginate(await this.service.listTeams(query), query);
  }
  @Post('teams') async createTeam(
    @Body() input: CreateTeamDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(await this.service.createTeam(input), response);
  }
  @Get('teams/:id') async team(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(await this.service.team(id), response);
  }
  @Patch('teams/:id') async updateTeam(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: UpdateTeamDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(
      await this.service.updateTeam(id, parseIfMatch(tag), input),
      response,
    );
  }
  @Get('projects') async projects(@Query() query: ProjectQueryDto) {
    return paginate(await this.service.listProjects(query), query);
  }
  @Post('projects') async createProject(
    @Body() input: CreateProjectDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(await this.service.createProject(input), response);
  }
  @Get('projects/:id') async project(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(await this.service.project(id), response);
  }
  @Patch('projects/:id') async updateProject(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: UpdateProjectDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(
      await this.service.updateProject(id, parseIfMatch(tag), input),
      response,
    );
  }
  @Post('projects/:id/transitions') async transition(
    @Param('id') id: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: ProjectTransitionDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(
      await this.service.transitionProject(id, parseIfMatch(tag), input),
      response,
    );
  }
  @Get('projects/:id/people') async associations(@Param('id') id: string) {
    return { data: await this.service.projectAssociations(id) };
  }
  @Put('projects/:id/people/:personId') async setProjectPerson(
    @Param('id') id: string,
    @Param('personId') personId: string,
    @Headers('if-match') tag: string | undefined,
    @Body() input: AssociationRoleDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(
      await this.service.setProjectPerson(
        id,
        personId,
        parseIfMatch(tag),
        input.roleLabel,
      ),
      response,
    );
  }
  @Delete('projects/:id/people/:personId') async removeProjectPerson(
    @Param('id') id: string,
    @Param('personId') personId: string,
    @Headers('if-match') tag: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(
      await this.service.removeProjectPerson(id, personId, parseIfMatch(tag)),
      response,
    );
  }
  @Put('projects/:id/teams/:teamId') async setProjectTeam(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Headers('if-match') tag: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(
      await this.service.setProjectTeam(id, teamId, parseIfMatch(tag)),
      response,
    );
  }
  @Delete('projects/:id/teams/:teamId') async removeProjectTeam(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Headers('if-match') tag: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    return tagged(
      await this.service.removeProjectTeam(id, teamId, parseIfMatch(tag)),
      response,
    );
  }
}
