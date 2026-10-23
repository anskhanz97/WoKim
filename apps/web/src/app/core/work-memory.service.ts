import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { firstValueFrom, map, Observable } from 'rxjs';
import { AuthService } from './auth/auth.service';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  targetDate: string | null;
  repositoryUrl?: string | null;
  version: number;
}
export interface Attachment {
  id: string;
  originalName: string;
  mimeType: string;
  byteSize: number;
  mediaState: string;
  purpose: string;
  caption: string | null;
  ocrEnabled: boolean;
}
export interface Entry {
  id: string;
  title: string | null;
  contentText: string | null;
  originalText?: string | null;
  entryType: string;
  inboxState: string;
  projectId: string | null;
  taskId?: string | null;
  senderPersonId?: string | null;
  sourceUrl?: string | null;
  sourceLabel?: string | null;
  occurredAt?: string | null;
  sourceKind?: string;
  processingState?: string | null;
  createdAt: string;
  version: number;
  attachments?: Attachment[];
  replaces?: SupersessionLink[];
  replacedBy?: SupersessionLink | null;
}
export interface SupersessionLink {
  id: string;
  reason: string | null;
}
export interface EntryRevision {
  id: string;
  entryId: string;
  revisionNo: number;
  title: string | null;
  contentText: string | null;
  changeReason: string | null;
  createdAt: string;
}
export interface ProjectActivity {
  id: string;
  eventType: string;
  taskId: string | null;
  entryId: string | null;
  payload: Record<string, unknown>;
  createdAt: string;
}
export interface SearchHit {
  id: string;
  kind: 'task' | 'entry' | 'person' | 'team' | 'derived';
  title: string | null;
  snippet: string;
  projectId: string | null;
  occurredAt: string;
  attachmentId?: string | null;
  derivedTextId?: string | null;
}
export interface DerivedText {
  id: string;
  attachmentId: string;
  kind: 'ocr' | 'transcript';
  revisionNo: number;
  machineText: string;
  reviewedText: string | null;
  language: string | null;
  modelId: string | null;
  segments: Array<{ startMs: number; endMs: number; text: string }> | null;
  isCurrent: boolean;
  createdAt: string;
  version: number;
}
export interface ProcessingJob {
  id: string;
  kind: 'ocr' | 'transcribe';
  attachmentId: string;
  status: string;
  attempts: number;
  maxAttempts: number;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: string;
}
export interface ProcessingSettings {
  transcriptionEnabled: boolean;
  ocrLanguages: string;
  transcriptionLanguage: string | null;
  modelId: string;
  version: number;
  availability: {
    ocr: boolean;
    transcription: boolean;
    modelCached: boolean;
    cacheRoot: string;
  };
}
export interface ProjectOverview {
  project: Project;
  taskCounts: Array<{ status: string; count: number }>;
  recent: ProjectActivity[];
  decisions: Array<{ id: string; title: string | null; contentText: string | null; createdAt: string }>;
  people: Array<{ id: string; displayName: string; roleLabel: string | null }>;
  currentTasks: Array<{ id: string; title: string; status: string; nextAction: string | null; dueDate: string | null; dueAt: string | null }>;
  openFollowUps: Array<{ id: string; question: string; followUpOn: string | null; personId: string | null; taskId: string | null }>;
  lastCheckpoint: { id: string; title: string | null; contentText: string | null; createdAt: string } | null;
}
export interface TaskDeadline {
  kind: 'hard' | 'target';
  date?: string;
  at?: string;
  timezone?: string;
}
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  requestedByPersonId: string | null;
  sourceEntryId: string | null;
  nextAction: string | null;
  branchName: string | null;
  links: Array<{ kind: string; label: string; url: string }> | null;
  deadline: TaskDeadline | null;
  createdAt: string;
  updatedAt: string;
  version: number;
}
export interface FocusSession {
  id: string;
  taskId: string;
  startedAt: string;
  endedAt?: string | null;
  endReason?: string | null;
  checkpointEntryId?: string | null;
}
export interface FocusSnapshot {
  focusVersion: number;
  session: FocusSession | null;
  task: Task | null;
}
export interface CheckIn {
  id: string;
  localDate: string;
  timezone: string;
  intendedOutcome: string | null;
  interruptionNotes: string | null;
  deadlineNotes: string | null;
  waitingNotes: string | null;
  reflection: string | null;
  version: number;
  items: Array<{ section: string; taskId: string | null; projectId: string | null; snapshot: Record<string, unknown> }>;
}
export interface TodayView {
  localDate: string;
  timezone: string;
  focus: FocusSnapshot;
  paused: Task[];
  due: Task[];
  waiting: FollowUp[];
  checkIn: CheckIn | null;
}
export interface FollowUp {
  id: string;
  projectId: string | null;
  taskId: string | null;
  personId: string | null;
  sourceEntryId: string | null;
  question: string;
  status: 'waiting' | 'answered' | 'cancelled';
  followUpOn: string | null;
  resolution: string | null;
  version: number;
}
export interface EvidenceItem {
  id: string;
  attachmentId: string;
  side: 'before' | 'after' | 'reference';
  caption: string | null;
  viewportLabel: string | null;
  sortOrder: number;
  attachment?: Attachment;
}
export interface EvidenceSet {
  id: string;
  taskId: string;
  title: string;
  notes: string | null;
  version: number;
  items: EvidenceItem[];
}
export interface Person {
  id: string;
  displayName: string;
  email: string | null;
  handle: string | null;
  notes: string | null;
  version: number;
  archivedAt?: string | null;
  teams?: Array<{ id: string; name: string; roleLabel: string | null }>;
  projects?: Array<{ id: string; name: string; status: string; roleLabel: string | null }>;
}
export interface Team {
  id: string;
  name: string;
  notes: string | null;
  version: number;
  archivedAt?: string | null;
}
export interface ProjectAssociations {
  people: Array<Person & { roleLabel: string | null }>;
  teams: Team[];
}
interface DataResponse<T> {
  data: T;
}
interface SearchResponse extends DataResponse<SearchHit[]> {
  page: { number: number; limit: number; hasMore: boolean };
}

@Injectable({ providedIn: 'root' })
export class WorkMemoryService {
  readonly captureOpen = signal(false);
  readonly focus = signal<FocusSnapshot>({ focusVersion: 0, session: null, task: null });
  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService,
  ) {}
  async projects(status = 'active', q?: string): Promise<Project[]> {
    const params = new URLSearchParams({ status, limit: '100' });
    if (q) params.set('q', q);
    return (
      await firstValueFrom(
        this.http.get<DataResponse<Project[]>>(`/api/v1/projects?${params}`, {
          withCredentials: true,
        }),
      )
    ).data;
  }
  async createProject(input: {
    name: string;
    description?: string;
    targetDate?: string;
  }): Promise<Project> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<Project>>('/api/v1/projects', input, { withCredentials: true }),
      )
    ).data;
  }
  async project(id: string): Promise<Project> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<Project>>(`/api/v1/projects/${encodeURIComponent(id)}`, {
          withCredentials: true,
        }),
      )
    ).data;
  }
  async transitionProject(project: Project, action: string): Promise<Project> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<Project>>(
          `/api/v1/projects/${encodeURIComponent(project.id)}/transitions`,
          { action },
          { headers: { 'If-Match': `"${project.version}"` }, withCredentials: true },
        ),
      )
    ).data;
  }
  async updateProject(project: Project, input: Partial<Project>): Promise<Project> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.patch<DataResponse<Project>>(
          `/api/v1/projects/${encodeURIComponent(project.id)}`,
          input,
          { headers: { 'If-Match': `"${project.version}"` }, withCredentials: true },
        ),
      )
    ).data;
  }
  async people(q?: string, archived = false): Promise<Person[]> {
    const params = new URLSearchParams({ archived: String(archived), limit: '100' });
    if (q) params.set('q', q);
    return (
      await firstValueFrom(
        this.http.get<DataResponse<Person[]>>(`/api/v1/people?${params}`, { withCredentials: true }),
      )
    ).data;
  }
  async person(id: string): Promise<Person> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<Person>>(`/api/v1/people/${encodeURIComponent(id)}`, {
          withCredentials: true,
        }),
      )
    ).data;
  }
  async teams(q?: string, archived = false): Promise<Team[]> {
    const params = new URLSearchParams({ archived: String(archived), limit: '100' });
    if (q) params.set('q', q);
    return (
      await firstValueFrom(
        this.http.get<DataResponse<Team[]>>(`/api/v1/teams?${params}`, { withCredentials: true }),
      )
    ).data;
  }
  async createPerson(input: {
    displayName: string;
    email?: string;
    handle?: string;
  }): Promise<Person> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<Person>>('/api/v1/people', input, { withCredentials: true }),
      )
    ).data;
  }
  async createTeam(input: { name: string }): Promise<Team> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<Team>>('/api/v1/teams', input, { withCredentials: true }),
      )
    ).data;
  }
  async updatePerson(person: Person, input: Partial<Person> & { archived?: boolean }): Promise<Person> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.patch<DataResponse<Person>>(
          `/api/v1/people/${encodeURIComponent(person.id)}`,
          input,
          { headers: { 'If-Match': `"${person.version}"` }, withCredentials: true },
        ),
      )
    ).data;
  }
  async updateTeam(team: Team, input: Partial<Team> & { archived?: boolean }): Promise<Team> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.patch<DataResponse<Team>>(
          `/api/v1/teams/${encodeURIComponent(team.id)}`,
          input,
          { headers: { 'If-Match': `"${team.version}"` }, withCredentials: true },
        ),
      )
    ).data;
  }
  async projectAssociations(id: string): Promise<ProjectAssociations> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<ProjectAssociations>>(
          `/api/v1/projects/${encodeURIComponent(id)}/people`,
          { withCredentials: true },
        ),
      )
    ).data;
  }
  async addProjectPerson(project: Project, personId: string, roleLabel?: string): Promise<Project> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.put<DataResponse<Project>>(
          `/api/v1/projects/${encodeURIComponent(project.id)}/people/${encodeURIComponent(personId)}`,
          { roleLabel },
          { headers: { 'If-Match': `"${project.version}"` }, withCredentials: true },
        ),
      )
    ).data;
  }
  async removeProjectPerson(project: Project, personId: string): Promise<Project> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.delete<DataResponse<Project>>(
          `/api/v1/projects/${encodeURIComponent(project.id)}/people/${encodeURIComponent(personId)}`,
          { headers: { 'If-Match': `"${project.version}"` }, withCredentials: true },
        ),
      )
    ).data;
  }
  async addProjectTeam(project: Project, teamId: string): Promise<Project> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.put<DataResponse<Project>>(
          `/api/v1/projects/${encodeURIComponent(project.id)}/teams/${encodeURIComponent(teamId)}`,
          {},
          { headers: { 'If-Match': `"${project.version}"` }, withCredentials: true },
        ),
      )
    ).data;
  }
  async removeProjectTeam(project: Project, teamId: string): Promise<Project> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.delete<DataResponse<Project>>(
          `/api/v1/projects/${encodeURIComponent(project.id)}/teams/${encodeURIComponent(teamId)}`,
          { headers: { 'If-Match': `"${project.version}"` }, withCredentials: true },
        ),
      )
    ).data;
  }
  async entries(
    state = 'unprocessed',
    filters: { projectId?: string; taskId?: string; personId?: string; type?: string; from?: string; to?: string } = {},
  ): Promise<Entry[]> {
    const params = new URLSearchParams({ state, limit: '100' });
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    return (
      await firstValueFrom(
        this.http.get<DataResponse<Entry[]>>(`/api/v1/entries?${params}`, {
          withCredentials: true,
        }),
      )
    ).data;
  }
  async personEntries(personId: string): Promise<Entry[]> {
    const groups = await Promise.all(
      ['unprocessed', 'organized', 'dismissed'].map(async (state) =>
        (
          await firstValueFrom(
            this.http.get<DataResponse<Entry[]>>(
              `/api/v1/entries?state=${state}&personId=${encodeURIComponent(personId)}&limit=100`,
              { withCredentials: true },
            ),
          )
        ).data,
      ),
    );
    return groups.flat().sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
  async entry(id: string): Promise<{ data: Entry; etag: string | null }> {
    const response = await firstValueFrom(
      this.http.get<DataResponse<Entry>>(`/api/v1/entries/${encodeURIComponent(id)}`, {
        observe: 'response',
        withCredentials: true,
      }),
    );
    return { data: response.body!.data, etag: response.headers.get('etag') };
  }
  async entryRevisions(id: string): Promise<EntryRevision[]> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<EntryRevision[]>>(
          `/api/v1/entries/${encodeURIComponent(id)}/revisions?limit=100`,
          { withCredentials: true },
        ),
      )
    ).data;
  }
  async updateEntry(id: string, etag: string, input: Partial<Entry>): Promise<Entry> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.patch<DataResponse<Entry>>(`/api/v1/entries/${encodeURIComponent(id)}`, input, {
          headers: { 'If-Match': etag },
          withCredentials: true,
        }),
      )
    ).data;
  }
  async trashEntry(id: string, version: number): Promise<void> {
    await this.auth.ensureCsrf();
    await firstValueFrom(
      this.http.delete(`/api/v1/entries/${encodeURIComponent(id)}`, {
        headers: { 'If-Match': `"${version}"` },
        withCredentials: true,
      }),
    );
  }
  async addAttachments(id: string, version: number, files: File[]): Promise<Entry> {
    await this.auth.ensureCsrf();
    const form = new FormData();
    for (const file of files) form.append('files', file, file.name);
    return (
      await firstValueFrom(
        this.http.post<DataResponse<Entry>>(
          `/api/v1/entries/${encodeURIComponent(id)}/attachments`,
          form,
          {
            headers: { 'If-Match': `"${version}"` },
            withCredentials: true,
          },
        ),
      )
    ).data;
  }
  async updateAttachment(
    id: string,
    parentVersion: number,
    input: { purpose?: string; caption?: string | null; ocrEnabled?: boolean },
  ): Promise<Entry> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.patch<DataResponse<Entry>>(
          `/api/v1/attachments/${encodeURIComponent(id)}`,
          input,
          {
            headers: { 'If-Match': `"${parentVersion}"` },
            withCredentials: true,
          },
        ),
      )
    ).data;
  }
  async trashAttachment(id: string, parentVersion: number): Promise<Entry> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.delete<DataResponse<Entry>>(`/api/v1/attachments/${encodeURIComponent(id)}`, {
          headers: { 'If-Match': `"${parentVersion}"` },
          withCredentials: true,
        }),
      )
    ).data;
  }
  async capture(metadata: Record<string, unknown>, files: File[]): Promise<Entry> {
    await this.auth.ensureCsrf();
    const form = new FormData();
    form.set('metadata', JSON.stringify(metadata));
    for (const file of files) form.append('files', file, file.name);
    return (
      await firstValueFrom(
        this.http.post<DataResponse<Entry>>('/api/v1/entries', form, {
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          withCredentials: true,
        }),
      )
    ).data;
  }
  async tasks(
    projectId?: string,
    status?: string,
    personId?: string,
    filters: { type?: string; priority?: string; dueFrom?: string; dueTo?: string } = {},
  ): Promise<Task[]> {
    const params = new URLSearchParams({ limit: '100' });
    if (projectId) params.set('projectId', projectId);
    if (status) params.set('status', status);
    if (personId) params.set('personId', personId);
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    return (
      await firstValueFrom(
        this.http.get<DataResponse<Task[]>>(`/api/v1/tasks?${params}`, { withCredentials: true }),
      )
    ).data;
  }
  async task(id: string): Promise<{ data: Task; etag: string | null }> {
    const response = await firstValueFrom(
      this.http.get<DataResponse<Task>>(`/api/v1/tasks/${encodeURIComponent(id)}`, {
        observe: 'response',
        withCredentials: true,
      }),
    );
    return { data: response.body!.data, etag: response.headers.get('etag') };
  }
  async taskSessions(id: string): Promise<FocusSession[]> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<FocusSession[]>>(
          `/api/v1/tasks/${encodeURIComponent(id)}/sessions?limit=100`,
          { withCredentials: true },
        ),
      )
    ).data;
  }
  async createTask(input: Record<string, unknown>): Promise<Task> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<Task>>('/api/v1/tasks', input, { withCredentials: true }),
      )
    ).data;
  }
  async updateTask(id: string, etag: string, input: Record<string, unknown>): Promise<Task> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.patch<DataResponse<Task>>(`/api/v1/tasks/${encodeURIComponent(id)}`, input, {
          headers: { 'If-Match': etag },
          withCredentials: true,
        }),
      )
    ).data;
  }
  async transitionTask(task: Task, action: string): Promise<Task> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<Task>>(
          `/api/v1/tasks/${encodeURIComponent(task.id)}/transitions`,
          { action },
          {
            headers: { 'If-Match': `"${task.version}"`, 'Idempotency-Key': crypto.randomUUID() },
            withCredentials: true,
          },
        ),
      )
    ).data;
  }
  async refreshFocus(): Promise<FocusSnapshot> {
    const data = (
      await firstValueFrom(
        this.http.get<DataResponse<FocusSnapshot>>('/api/v1/focus', { withCredentials: true }),
      )
    ).data;
    this.focus.set(data);
    return data;
  }
  async focusCommand(
    action: 'start' | 'switch' | 'pause' | 'finish',
    input: Record<string, unknown>,
  ): Promise<FocusSnapshot> {
    await this.auth.ensureCsrf();
    const data = (
      await firstValueFrom(
        this.http.post<DataResponse<FocusSnapshot>>(`/api/v1/focus/${action}`, input, {
          headers: { 'Idempotency-Key': crypto.randomUUID() },
          withCredentials: true,
        }),
      )
    ).data;
    this.focus.set(data);
    return data;
  }
  async today(date?: string): Promise<TodayView> {
    const suffix = date ? `?date=${encodeURIComponent(date)}` : '';
    const data = (
      await firstValueFrom(
        this.http.get<DataResponse<TodayView>>(`/api/v1/today${suffix}`, { withCredentials: true }),
      )
    ).data;
    this.focus.set(data.focus);
    return data;
  }
  async saveCheckIn(
    date: string,
    input: Record<string, unknown>,
  ): Promise<CheckIn> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.put<DataResponse<CheckIn>>(`/api/v1/check-ins/${encodeURIComponent(date)}`, input, {
          withCredentials: true,
        }),
      )
    ).data;
  }
  async followUps(filters: { personId?: string; taskId?: string; projectId?: string; status?: string } = {}): Promise<FollowUp[]> {
    const params = new URLSearchParams(filters as Record<string, string>);
    params.set('limit', '100');
    return (
      await firstValueFrom(
        this.http.get<DataResponse<FollowUp[]>>(`/api/v1/follow-ups?${params}`, { withCredentials: true }),
      )
    ).data;
  }
  async createFollowUp(input: Record<string, unknown>): Promise<FollowUp> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<FollowUp>>('/api/v1/follow-ups', input, { withCredentials: true }),
      )
    ).data;
  }
  async updateFollowUp(item: FollowUp, input: Record<string, unknown>): Promise<FollowUp> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.patch<DataResponse<FollowUp>>(`/api/v1/follow-ups/${encodeURIComponent(item.id)}`, input, {
          headers: { 'If-Match': `"${item.version}"` }, withCredentials: true,
        }),
      )
    ).data;
  }
  async evidenceSets(taskId: string): Promise<EvidenceSet[]> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<EvidenceSet[]>>(`/api/v1/evidence-sets?taskId=${encodeURIComponent(taskId)}&limit=100`, { withCredentials: true }),
      )
    ).data;
  }
  async projectEvidenceSets(projectId: string): Promise<EvidenceSet[]> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<EvidenceSet[]>>(
          `/api/v1/evidence-sets?projectId=${encodeURIComponent(projectId)}&limit=100`,
          { withCredentials: true },
        ),
      )
    ).data;
  }
  async taskEvidenceImages(taskId: string): Promise<Attachment[]> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<Attachment[]>>(`/api/v1/tasks/${encodeURIComponent(taskId)}/evidence-images?limit=100`, { withCredentials: true }),
      )
    ).data;
  }
  async createEvidenceSet(taskId: string, title: string): Promise<EvidenceSet> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<EvidenceSet>>('/api/v1/evidence-sets', { taskId, title }, { withCredentials: true }),
      )
    ).data;
  }
  async addEvidenceItem(set: EvidenceSet, attachmentId: string, side: string, caption?: string): Promise<EvidenceSet> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<EvidenceSet>>(
          `/api/v1/evidence-sets/${encodeURIComponent(set.id)}/items`,
          { attachmentId, side, caption },
          { headers: { 'If-Match': `"${set.version}"` }, withCredentials: true },
        ),
      )
    ).data;
  }
  async convertEntryToTask(entry: Entry, input: Record<string, unknown>): Promise<Task> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<Task>>(
          `/api/v1/entries/${encodeURIComponent(entry.id)}/convert-to-task`,
          { ...input, expectedEntryVersion: entry.version },
          { headers: { 'Idempotency-Key': crypto.randomUUID() }, withCredentials: true },
        ),
      )
    ).data;
  }
  async projectDecisions(projectId: string): Promise<Entry[]> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<Entry[]>>(
          `/api/v1/projects/${encodeURIComponent(projectId)}/decisions?limit=100`,
          { withCredentials: true },
        ),
      )
    ).data;
  }
  async projectHistory(projectId: string, from?: string, to?: string): Promise<ProjectActivity[]> {
    const params = new URLSearchParams({ limit: '100' });
    if (from) params.set('from', from);
    if (to) params.set('to', to);
    return (
      await firstValueFrom(
        this.http.get<DataResponse<ProjectActivity[]>>(
          `/api/v1/projects/${encodeURIComponent(projectId)}/history?${params}`,
          { withCredentials: true },
        ),
      )
    ).data;
  }
  async projectOverview(projectId: string): Promise<ProjectOverview> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<ProjectOverview>>(`/api/v1/projects/${encodeURIComponent(projectId)}/overview`, { withCredentials: true }),
      )
    ).data;
  }
  searchPage$(query: string, filters: { type?: string; projectId?: string; personId?: string; status?: string; from?: string; to?: string } = {}, page = 1): Observable<SearchResponse> {
    const params = new URLSearchParams({ q: query });
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    params.set('page', String(page));
    params.set('limit', '20');
    return this.http.get<SearchResponse>(`/api/v1/search?${params}`, { withCredentials: true });
  }
  search$(query: string, filters: { type?: string; projectId?: string; personId?: string; status?: string; from?: string; to?: string } = {}): Observable<SearchHit[]> {
    return this.searchPage$(query, filters).pipe(map((response) => response.data));
  }
  async createExport(projectId?: string): Promise<{ id: string }> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<{ id: string }>>('/api/v1/exports', projectId ? { scope: 'project', projectId } : { scope: 'all' }, { withCredentials: true }),
      )
    ).data;
  }
  async trash(): Promise<Record<'entries' | 'tasks' | 'attachments', Array<Record<string, unknown>>>> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<Record<'entries' | 'tasks' | 'attachments', Array<Record<string, unknown>>>>>('/api/v1/trash', { withCredentials: true }),
      )
    ).data;
  }
  async dataSummary(): Promise<{
    storedBytes: number;
    disk: { freeBytes: number; totalBytes: number };
    backup: { lastSuccessfulAt: string; ageHours: number; lastFailureAt: string | null; lastFailure: string | null } | null;
    processingJobs: Array<{ status: string; count: number }>;
  }> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<{
          storedBytes: number;
          disk: { freeBytes: number; totalBytes: number };
          backup: { lastSuccessfulAt: string; ageHours: number; lastFailureAt: string | null; lastFailure: string | null } | null;
          processingJobs: Array<{ status: string; count: number }>;
        }>>('/api/v1/data/summary', { withCredentials: true }),
      )
    ).data;
  }
  async restore(kind: string, id: string, expectedVersion: number): Promise<void> {
    await this.auth.ensureCsrf();
    await firstValueFrom(this.http.post(`/api/v1/trash/${kind}/${encodeURIComponent(id)}/restore`, { expectedVersion }, { withCredentials: true }));
  }
  async purge(kind: string, id: string, expectedVersion: number): Promise<void> {
    await this.auth.ensureCsrf();
    await firstValueFrom(
      this.http.delete(`/api/v1/trash/${kind}/${encodeURIComponent(id)}`, {
        body: { confirm: 'PURGE', expectedVersion },
        withCredentials: true,
      }),
    );
  }
  async processingSettings(): Promise<ProcessingSettings> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<ProcessingSettings>>('/api/v1/processing/settings', {
          withCredentials: true,
        }),
      )
    ).data;
  }
  async updateProcessingSettings(
    settings: ProcessingSettings,
    input: Partial<ProcessingSettings>,
  ): Promise<ProcessingSettings> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.patch<DataResponse<ProcessingSettings>>(
          '/api/v1/processing/settings',
          { ...input, availability: undefined, expectedVersion: settings.version },
          { withCredentials: true },
        ),
      )
    ).data;
  }
  async requestProcessing(
    attachmentId: string,
    kind: 'ocr' | 'transcribe',
  ): Promise<{ id: string; status: string }> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<{ id: string; status: string }>>(
          `/api/v1/attachments/${encodeURIComponent(attachmentId)}/jobs?limit=100`,
          { kind },
          { withCredentials: true },
        ),
      )
    ).data;
  }
  async processingJobs(attachmentId: string): Promise<ProcessingJob[]> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<ProcessingJob[]>>(
          `/api/v1/attachments/${encodeURIComponent(attachmentId)}/jobs`,
          { withCredentials: true },
        ),
      )
    ).data;
  }
  async retryProcessingJob(id: string): Promise<ProcessingJob> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<ProcessingJob>>(
          `/api/v1/jobs/${encodeURIComponent(id)}/retry`,
          {},
          { withCredentials: true },
        ),
      )
    ).data;
  }
  async derivedTexts(attachmentId: string): Promise<DerivedText[]> {
    return (
      await firstValueFrom(
        this.http.get<DataResponse<DerivedText[]>>(
          `/api/v1/attachments/${encodeURIComponent(attachmentId)}/derived-texts?limit=100`,
          { withCredentials: true },
        ),
      )
    ).data;
  }
  async reviewDerivedText(item: DerivedText, text: string): Promise<DerivedText> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.patch<DataResponse<DerivedText>>(
          `/api/v1/derived-texts/${encodeURIComponent(item.id)}`,
          { expectedVersion: item.version, text },
          { withCredentials: true },
        ),
      )
    ).data;
  }
  async addSupersession(newer: Entry, olderEntryId: string, reason?: string): Promise<Entry> {
    await this.auth.ensureCsrf();
    return (
      await firstValueFrom(
        this.http.post<DataResponse<Entry>>(
          `/api/v1/entries/${encodeURIComponent(newer.id)}/supersessions`,
          { olderEntryIds: [olderEntryId], reason },
          { headers: { 'If-Match': `"${newer.version}"` }, withCredentials: true },
        ),
      )
    ).data;
  }
}
