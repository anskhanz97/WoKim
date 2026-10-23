import {
  Injectable,
  NotFoundException,
  PreconditionFailedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import { DataSource, Repository } from 'typeorm';
import { PersonEntity } from '../database/entities/person.entity';
import {
  ProjectEntity,
  type ProjectStatus,
} from '../database/entities/project.entity';
import { TeamEntity } from '../database/entities/team.entity';
import type {
  CreatePersonDto,
  CreateProjectDto,
  CreateTeamDto,
  ProjectTransitionDto,
  UpdatePersonDto,
  UpdateProjectDto,
  UpdateTeamDto,
  DirectoryQueryDto,
  ProjectQueryDto,
} from './organization.dto';

export interface ProjectPersonAssociation {
  id: string;
  displayName: string;
  email: string | null;
  handle: string | null;
  roleLabel: string | null;
}

export interface ProjectTeamAssociation {
  id: string;
  name: string;
}

@Injectable()
export class OrganizationService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(PersonEntity)
    private readonly people: Repository<PersonEntity>,
    @InjectRepository(TeamEntity)
    private readonly teams: Repository<TeamEntity>,
    @InjectRepository(ProjectEntity)
    private readonly projects: Repository<ProjectEntity>,
  ) {}

  listPeople(filters: DirectoryQueryDto = {}) {
    const query = this.people.createQueryBuilder('person');
    query.where(
      filters.archived === 'true'
        ? 'person.archived_at IS NOT NULL'
        : 'person.archived_at IS NULL',
    );
    if (filters.q?.trim())
      query.andWhere(
        "(INSTR(LOWER(person.display_name),LOWER(:q))>0 OR INSTR(LOWER(COALESCE(person.email,'')),LOWER(:q))>0 OR INSTR(LOWER(COALESCE(person.handle,'')),LOWER(:q))>0)",
        { q: filters.q.trim() },
      );
    return query
      .orderBy('person.display_name', 'ASC')
      .addOrderBy('person.id', 'ASC')
      .getMany();
  }
  async person(id: string) {
    const person = await this.find(this.people, id, 'Person');
    const [teams, projects] = await Promise.all([
      this.dataSource.query<
        Array<{ id: string; name: string; roleLabel: string | null }>
      >(
        'SELECT t.id,t.name,pt.role_label roleLabel FROM person_teams pt JOIN teams t ON t.id=pt.team_id WHERE pt.person_id=? ORDER BY t.name',
        [id],
      ),
      this.dataSource.query<
        Array<{
          id: string;
          name: string;
          status: string;
          roleLabel: string | null;
        }>
      >(
        'SELECT p.id,p.name,p.status,pp.role_label roleLabel FROM project_people pp JOIN projects p ON p.id=pp.project_id WHERE pp.person_id=? ORDER BY p.updated_at DESC',
        [id],
      ),
    ]);
    return { ...person, teams, projects };
  }
  createPerson(input: CreatePersonDto) {
    return this.people.save(
      this.people.create({
        id: randomUUID(),
        displayName: input.displayName.trim(),
        email: input.email?.trim() || null,
        handle: input.handle?.trim() || null,
        notes: input.notes?.trim() || null,
        archivedAt: null,
      }),
    );
  }
  updatePerson(id: string, version: number, input: UpdatePersonDto) {
    return this.versionedUpdate(
      this.people,
      id,
      version,
      {
        ...input,
        displayName: input.displayName?.trim(),
        email: input.email?.trim() || null,
        handle: input.handle?.trim() || null,
        notes: input.notes?.trim() || null,
        archivedAt:
          input.archived === undefined
            ? undefined
            : input.archived
              ? new Date()
              : null,
      },
      'Person',
    );
  }

  listTeams(filters: DirectoryQueryDto = {}) {
    const query = this.teams.createQueryBuilder('team');
    query.where(
      filters.archived === 'true'
        ? 'team.archived_at IS NOT NULL'
        : 'team.archived_at IS NULL',
    );
    if (filters.q?.trim())
      query.andWhere(
        "(INSTR(LOWER(team.name),LOWER(:q))>0 OR INSTR(LOWER(COALESCE(team.notes,'')),LOWER(:q))>0)",
        { q: filters.q.trim() },
      );
    return query
      .orderBy('team.name', 'ASC')
      .addOrderBy('team.id', 'ASC')
      .getMany();
  }
  async team(id: string) {
    return this.find(this.teams, id, 'Team');
  }
  createTeam(input: CreateTeamDto) {
    return this.teams.save(
      this.teams.create({
        id: randomUUID(),
        name: input.name.trim(),
        notes: input.notes?.trim() || null,
        archivedAt: null,
      }),
    );
  }
  updateTeam(id: string, version: number, input: UpdateTeamDto) {
    return this.versionedUpdate(
      this.teams,
      id,
      version,
      {
        ...input,
        name: input.name?.trim(),
        notes: input.notes?.trim() || null,
        archivedAt:
          input.archived === undefined
            ? undefined
            : input.archived
              ? new Date()
              : null,
      },
      'Team',
    );
  }

  listProjects(filters: ProjectQueryDto = {}) {
    const query = this.projects.createQueryBuilder('project');
    if (filters.status)
      query.where('project.status=:status', { status: filters.status });
    if (filters.q?.trim())
      query.andWhere(
        "(INSTR(LOWER(project.name),LOWER(:q))>0 OR INSTR(LOWER(COALESCE(project.description,'')),LOWER(:q))>0)",
        { q: filters.q.trim() },
      );
    return query
      .orderBy('project.updated_at', 'DESC')
      .addOrderBy('project.id', 'ASC')
      .getMany();
  }
  async project(id: string) {
    return this.find(this.projects, id, 'Project');
  }
  createProject(input: CreateProjectDto) {
    this.assertDate(input.targetDate);
    return this.projects.save(
      this.projects.create({
        id: randomUUID(),
        name: input.name.trim(),
        description: input.description?.trim() || null,
        status: 'active',
        targetDate: input.targetDate || null,
        repositoryUrl: input.repositoryUrl || null,
        archivedAt: null,
      }),
    );
  }
  updateProject(id: string, version: number, input: UpdateProjectDto) {
    this.assertDate(input.targetDate);
    return this.versionedUpdate(
      this.projects,
      id,
      version,
      {
        ...input,
        name: input.name?.trim(),
        description: input.description?.trim() || null,
        targetDate: input.targetDate || null,
        repositoryUrl: input.repositoryUrl || null,
      },
      'Project',
    );
  }
  async transitionProject(
    id: string,
    version: number,
    input: ProjectTransitionDto,
  ) {
    const current = await this.projects.findOneBy({ id });
    if (!current)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: 'Project not found.',
      });
    const allowed =
      (input.action === 'complete' && current.status === 'active') ||
      (input.action === 'archive' && current.status !== 'archived') ||
      (input.action === 'reactivate' && current.status === 'completed') ||
      (input.action === 'restore' && current.status === 'archived');
    if (!allowed)
      throw new UnprocessableEntityException({
        code: 'INVALID_TRANSITION',
        message: `Project action ${input.action} is not valid from ${current.status}.`,
      });
    if (input.action === 'complete' || input.action === 'archive') {
      const rows = await this.dataSource.query<Array<{ count: string }>>(
        "SELECT COUNT(*) AS count FROM tasks WHERE project_id=? AND status='in_progress' AND trashed_at IS NULL",
        [id],
      );
      if (Number(rows[0]?.count) > 0)
        throw new UnprocessableEntityException({
          code: 'ACTIVE_WORK_EXISTS',
          message:
            'Pause or finish the active project task before changing project state.',
        });
    }
    const status: ProjectStatus =
      input.action === 'complete'
        ? 'completed'
        : input.action === 'archive'
          ? 'archived'
          : 'active';
    const archivedAt = status === 'archived' ? new Date() : null;
    return this.versionedUpdate(
      this.projects,
      id,
      version,
      { status, archivedAt },
      'Project',
    );
  }

  async setPersonTeam(
    personId: string,
    teamId: string,
    version: number,
    roleLabel?: string,
  ) {
    await this.team(teamId);
    return this.associate(
      this.people,
      personId,
      version,
      'person_teams',
      'person_id',
      'team_id',
      teamId,
      roleLabel,
      'Person',
    );
  }
  removePersonTeam(personId: string, teamId: string, version: number) {
    return this.disassociate(
      this.people,
      personId,
      version,
      'person_teams',
      'person_id',
      'team_id',
      teamId,
      'Person',
    );
  }
  async setProjectPerson(
    projectId: string,
    personId: string,
    version: number,
    roleLabel?: string,
  ) {
    await this.person(personId);
    return this.associate(
      this.projects,
      projectId,
      version,
      'project_people',
      'project_id',
      'person_id',
      personId,
      roleLabel,
      'Project',
    );
  }
  removeProjectPerson(projectId: string, personId: string, version: number) {
    return this.disassociate(
      this.projects,
      projectId,
      version,
      'project_people',
      'project_id',
      'person_id',
      personId,
      'Project',
    );
  }
  async setProjectTeam(projectId: string, teamId: string, version: number) {
    await this.team(teamId);
    return this.associate(
      this.projects,
      projectId,
      version,
      'project_teams',
      'project_id',
      'team_id',
      teamId,
      undefined,
      'Project',
    );
  }
  removeProjectTeam(projectId: string, teamId: string, version: number) {
    return this.disassociate(
      this.projects,
      projectId,
      version,
      'project_teams',
      'project_id',
      'team_id',
      teamId,
      'Project',
    );
  }
  async projectAssociations(projectId: string) {
    await this.project(projectId);
    const [people, teams] = await Promise.all([
      this.projects.manager.query<ProjectPersonAssociation[]>(
        'SELECT p.id,p.display_name AS displayName,p.email,p.handle,pp.role_label AS roleLabel FROM project_people pp JOIN people p ON p.id=pp.person_id WHERE pp.project_id=? ORDER BY p.display_name',
        [projectId],
      ),
      this.projects.manager.query<ProjectTeamAssociation[]>(
        'SELECT t.id,t.name FROM project_teams pt JOIN teams t ON t.id=pt.team_id WHERE pt.project_id=? ORDER BY t.name',
        [projectId],
      ),
    ]);
    return { people, teams };
  }

  private async associate<T extends { id: string; version: number }>(
    repository: Repository<T>,
    parentId: string,
    version: number,
    table: string,
    parentColumn: string,
    childColumn: string,
    childId: string,
    roleLabel: string | undefined,
    label: string,
  ): Promise<T> {
    return repository.manager.transaction(async (manager) => {
      const parent = await manager.findOne(repository.target, {
        where: { id: parentId } as never,
        lock: { mode: 'pessimistic_write' },
      });
      if (!parent)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `${label} not found.`,
        });
      if (parent.version !== version)
        throw new PreconditionFailedException({
          code: 'VERSION_CONFLICT',
          message: `${label} changed elsewhere. Reload before saving.`,
        });
      if (table === 'project_teams')
        await manager.query(
          `INSERT INTO ${table} (${parentColumn},${childColumn}) VALUES (?,?) ON DUPLICATE KEY UPDATE ${childColumn}=VALUES(${childColumn})`,
          [parentId, childId],
        );
      else
        await manager.query(
          `INSERT INTO ${table} (${parentColumn},${childColumn},role_label) VALUES (?,?,?) ON DUPLICATE KEY UPDATE role_label=VALUES(role_label)`,
          [parentId, childId, roleLabel?.trim() || null],
        );
      await manager
        .createQueryBuilder()
        .update(repository.target)
        .set({ version: () => 'version + 1' } as never)
        .where('id=:parentId', { parentId })
        .execute();
      return manager.findOneByOrFail<T>(repository.target, {
        id: parentId,
      } as never);
    });
  }
  private async disassociate<T extends { id: string; version: number }>(
    repository: Repository<T>,
    parentId: string,
    version: number,
    table: string,
    parentColumn: string,
    childColumn: string,
    childId: string,
    label: string,
  ): Promise<T> {
    return repository.manager.transaction(async (manager) => {
      const parent = await manager.findOne(repository.target, {
        where: { id: parentId } as never,
        lock: { mode: 'pessimistic_write' },
      });
      if (!parent)
        throw new NotFoundException({
          code: 'NOT_FOUND',
          message: `${label} not found.`,
        });
      if (parent.version !== version)
        throw new PreconditionFailedException({
          code: 'VERSION_CONFLICT',
          message: `${label} changed elsewhere. Reload before saving.`,
        });
      await manager.query(
        `DELETE FROM ${table} WHERE ${parentColumn}=? AND ${childColumn}=?`,
        [parentId, childId],
      );
      await manager
        .createQueryBuilder()
        .update(repository.target)
        .set({ version: () => 'version + 1' } as never)
        .where('id=:parentId', { parentId })
        .execute();
      return manager.findOneByOrFail<T>(repository.target, {
        id: parentId,
      } as never);
    });
  }

  private async find<T extends { id: string }>(
    repository: Repository<T>,
    id: string,
    label: string,
  ): Promise<T> {
    const entity = await repository.findOneBy({ id } as never);
    if (!entity)
      throw new NotFoundException({
        code: 'NOT_FOUND',
        message: `${label} not found.`,
      });
    return entity;
  }
  private async versionedUpdate<T extends { id: string; version: number }>(
    repository: Repository<T>,
    id: string,
    version: number,
    values: Record<string, unknown>,
    label: string,
  ): Promise<T> {
    const cleaned = Object.fromEntries(
      Object.entries(values).filter(
        ([key, value]) => value !== undefined && key !== 'archived',
      ),
    );
    const result = await repository
      .createQueryBuilder()
      .update()
      .set({ ...cleaned, version: () => 'version + 1' } as never)
      .where('id = :id AND version = :version', { id, version })
      .execute();
    if (result.affected !== 1)
      throw new PreconditionFailedException({
        code: 'VERSION_CONFLICT',
        message: `${label} changed elsewhere. Reload before saving.`,
      });
    return this.find(repository, id, label);
  }
  private assertDate(value?: string): void {
    if (value && !/^\d{4}-\d{2}-\d{2}$/.test(value))
      throw new UnprocessableEntityException({
        code: 'VALIDATION_ERROR',
        message: 'targetDate must use YYYY-MM-DD.',
      });
  }
}
