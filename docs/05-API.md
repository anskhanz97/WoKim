# API contract intent

REST prefix `/api/v1`. Same-origin HTTPS. Cookie authentication and CSRF header for mutations. This is a design contract; Phase 1 creates machine-validated OpenAPI and examples. Endpoints below must be typed before their implementation slice begins.

## Conventions

- camelCase JSON, UUID string IDs; database snake_case is internal.
- UTC instants: ISO 8601 with Z. Calendar dates: `YYYY-MM-DD`. IANA timezone separate where required.
- Create: 201; reads/updates/commands: 200; deletion/logout: 204; queued jobs: 202. Replayed idempotent commands return the original stored status/result.
- Entity reads/updates return `ETag: "<version>"`; PATCH/DELETE require matching If-Match. Missing precondition → 428; stale entity → 412. Focus commands use focusVersion instead.
- Omitted PATCH property means unchanged; null means clear only when the field is nullable. Reject unknown fields.
- Ordinary reads return `{data: ...}`. Lists return `{data: [...], page: {nextCursor: string|null}}`; default limit 25, max 100. Opaque cursors bind sort/filter and stable ID; invalid cursor → 400.
- Search alone uses page/limit with max page 50 and limit 20 by default, max 50, because relevance pagination is bounded and can shift after edits. It returns `{data, page: {number, limit, hasMore}}`.
- Global request ID in response header and errors. Do not return raw storage keys, password/session hashes, or internal exception traces.
- Idempotency-Key: client UUID required for capture, source conversion, focus commands, and task transitions. Seven-day receipt retention. Reusing a key with different content → 409. Exception to successful replay: permanently purged source results become 410 tombstones without returning deleted text or recreating the source.
- Versioned entity update with an unknown result is recovered by GET, not by blindly resending a stale If-Match. Focus/capture retries reuse their key.

## Errors

```json
{
  "error": {
    "code": "FOCUS_CONFLICT",
    "message": "Your active task changed on another device.",
    "requestId": "request-id",
    "details": {"currentFocusVersion": 12, "activeTaskId": "uuid"}
  }
}
```

400 VALIDATION_ERROR (safe field errors); 401 AUTH_REQUIRED; 403 CSRF_INVALID; 404 NOT_FOUND; 409 FOCUS_CONFLICT/INVALID_TRANSITION/IDEMPOTENCY_CONFLICT/DEPENDENT_RECORDS; 410 SOURCE_PURGED; 412 VERSION_CONFLICT; 413 UPLOAD_TOO_LARGE; 415 UNSUPPORTED_MEDIA; 422 RELATIONSHIP_INVALID; 428 PRECONDITION_REQUIRED; 429 RATE_LIMITED; 503 PROCESSING_UNAVAILABLE. Unexpected failures → 500 with requestId only. A background transcription failure is a job result, not a later HTTP error on the already saved capture.

## Route inventory

`*` marks an idempotent command-key requirement; `V` marks If-Match. Authentication applies unless marked public.

| Method and path | Request intent | Result |
|---|---|---|
| GET `/auth/csrf` (public) | Establish CSRF cookie/header token | token |
| POST `/auth/login` (public, CSRF) | email, password | owner summary; rotated session |
| POST `/auth/logout` | Revoke current session | 204 |
| GET `/me` | Profile and current session | profile |
| PATCH `/me` V | displayName, timezone | profile |
| POST `/me/password` | currentPassword, newPassword | rotated current session; others revoked |
| GET `/me/sessions` | Active devices/times | list without secrets |
| DELETE `/me/sessions/:id` V | Revoke other/current session | 204 |
| GET/POST `/people` | q/archive filter or create contact | list/contact |
| GET/PATCH `/people/:id` V on PATCH | Read/edit/archive contact | contact |
| GET/POST `/teams` | List/create | list/team |
| GET/PATCH `/teams/:id` V on PATCH | Read/edit/archive | team |
| PUT `/people/:id/teams/:teamId` V | Upsert roleLabel; person ETag | updated person |
| DELETE `/people/:id/teams/:teamId` V | Remove association; person ETag | updated person |
| GET/POST `/projects` | Filter status/q or create | list/project |
| GET/PATCH `/projects/:id` V on PATCH | Description/name/dates; no lifecycle shortcuts | project |
| POST `/projects/:id/transitions` V | action: complete/archive/reactivate/restore | project |
| GET `/projects/:id/overview` | Re-entry read model | overview |
| GET `/projects/:id/history` | date range, cursor | mixed entry/event timeline |
| GET `/projects/:id/decisions` | current/all and cursor | source entries with replacement links |
| GET `/projects/:id/people` | Contacts/teams | associations |
| PUT/DELETE `/projects/:id/people/:personId` V | Role association; project ETag | updated project |
| PUT/DELETE `/projects/:id/teams/:teamId` V | Team association; project ETag | updated project |
| GET/POST `/tasks` | project/status/type/person/due filters or create | list/task |
| GET/PATCH `/tasks/:id` V on PATCH | Task content/metadata, no status or project changes | task |
| POST `/tasks/:id/transitions` * | ready/wait/done/cancel/reopen plus versions | task + focus snapshot |
| DELETE `/tasks/:id` * | expectedVersion, expectedFocusVersion; trash via transition service | tombstone + focus snapshot |
| GET `/tasks/:id/sessions` | Recorded work history | list |
| GET `/focus` | Current task, session and focusVersion | focus snapshot |
| POST `/focus/start` * | taskId, expectedFocusVersion | new or unchanged focus snapshot |
| POST `/focus/switch` * | targetTaskId, checkpoint?, nextAction?, expectedFocusVersion | focus + paused task |
| POST `/focus/pause` * | reason pause/wait, checkpoint?, nextAction?, expectedFocusVersion | cleared focus |
| GET `/today` | date optional; default owner local today | live sections + saved check-in |
| GET `/check-ins/:date` | Historic check-in | saved snapshot or 404 |
| PUT `/check-ins/:date` | Answers and selected references, expectedVersion (null=create) | saved check-in |
| GET `/entries` | inbox/project/task/person/type/date filters | list |
| POST `/entries` * | Multipart capture; see below | saved entry + attachments |
| GET/PATCH `/entries/:id` V on PATCH | Read/current content/source metadata; originalText read-only | entry |
| POST `/entries/:id/convert-to-task` * | projectId, task fields, expectedEntryVersion | existing/new linked task |
| GET `/entries/:id/revisions` | Prior editable content | list |
| DELETE `/entries/:id` V | Trash; reject destructive relationship conflicts | 204 |
| POST `/entries/:id/supersessions` V | olderEntryIds[], reason; newer entry ETag | updated entry + links |
| DELETE `/entries/:id/supersessions/:olderId` V | Explicit unlink; newer entry ETag | updated entry |
| POST `/entries/:id/attachments` V | Multipart additional file(s); entry ETag | updated entry + files |
| PATCH `/attachments/:id` | purpose, caption, ocrEnabled; parent entry If-Match | updated entry + attachment |
| DELETE `/attachments/:id` | Parent entry If-Match; trash dependent evidence explicitly | updated entry |
| GET `/attachments/:id/content` | Authenticated original, Range supported | bytes |
| GET `/attachments/:id/thumbnail` | Authenticated available image derivative | bytes or 404 |
| GET `/attachments/:id/playback` | Ready derivative or supported original, Range | audio bytes or 409 not ready |
| POST `/attachments/:id/processing` | kind ocr/transcribe, language? | 202 job; active duplicate returns same job |
| GET `/attachments/:id/texts` | Current and historical outputs | output revisions |
| PATCH `/derived-texts/:id` V | reviewedText, reviewState | reviewed output |
| GET `/jobs/:id` | Queued/running/succeeded/failed/cancelled | safe status/result references |
| POST `/jobs/:id/retry` | Retry failed retryable job | 202 new job |
| GET/POST `/follow-ups` | Filters or question/person/source/date | list/follow-up |
| GET/PATCH `/follow-ups/:id` V on PATCH | Edit, answer, cancel, reschedule | follow-up |
| GET/POST `/evidence-sets` | task/project filter or title/task | list/set |
| GET/PATCH/DELETE `/evidence-sets/:id` V on mutations | Group details/lifecycle | set or 204 |
| POST `/evidence-sets/:id/items` V | attachmentId, side, caption/viewport; set ETag | set |
| PATCH/DELETE `/evidence-sets/:id/items/:itemId` V | Item labels/order; set ETag | set |
| GET `/search` | q + type/project/person/status/date filters | bounded results |
| GET `/data/summary` | Used storage, trash, backup status, processing availability | summary |
| POST `/exports` | all/project scope | 202 export job |
| GET `/exports/:jobId/content` | Finished, unexpired authenticated ZIP | download |
| GET `/trash` | Trashed entries/tasks/attachments | list |
| POST `/trash/:kind/:id/restore` | kind entry/task/attachment; expectedVersion from trash item | restored record |
| DELETE `/trash/:kind/:id` | expectedVersion; explicit permanent confirmation; dependencies checked | 202 cleanup job |
| GET `/health/live` (public) | Minimal process liveness | status only |
| GET `/health/ready` | SQL/storage readiness | restricted status |

Association updates lock/version the parent. Attachments inherit the parent entry version; session revocation uses an expiry/revoked-state ETag calculated from its state (sessions do not need the common version column). Unknown query fields are rejected. Date range endpoints cap span to 366 days per request and paginate.

## Task representation and deadline contract

```json
{
  "data": {
    "id": "task-uuid",
    "projectId": "project-uuid",
    "title": "Handle expired invitation tokens",
    "type": "bug",
    "status": "paused",
    "priority": "normal",
    "requestedByPersonId": "person-uuid",
    "nextAction": "Add an expired-token integration case",
    "deadline": {"kind": "hard", "date": "2026-10-30"},
    "version": 4
  }
}
```

Deadline is null, `{kind,date}` for date-only, or `{kind,at,timezone}` for an exact instant. Reject mixed date/at or an invalid timezone. Clients never transform a date-only deadline to UTC. Plain links/branch metadata are optional. Task type/status/priority enums match the database scope exactly.

## Capture contract

`POST /entries`: multipart form with `metadata` JSON and optional repeated `files`. Metadata: contentText?, title?, entryType (default note), sourceKind, sourceUrl?, sourceLabel?, projectId?, taskId?, senderPersonId?, occurredAt?, occurredTimezone?, and a per-file purpose/ocrEnabled mapping. Require nonblank contentText OR at least one accepted file. Server initializes originalText and contentText from the initial text; originalText is never PATCHable.

Return entry ID, current editable content, preserved source fields, attachment IDs/media states, and inspection job IDs. OCR/transcription requests occur after save, except an explicit capture option may enqueue them behind successful inspection. File ordering and per-file metadata must be keyed by client file IDs, not fragile filename matching. Duplicate filename uploads are valid.

For a network retry, resend the same key/content. Server returns the original entry instead of writing a duplicate. If the first upload has not committed, serialize attempts using the capture command key, then return the eventual receipt or a retryable conflict. Clean unused staging files from losing attempts.

## Focus command example

```http
POST /api/v1/focus/switch
Idempotency-Key: <client-generated-uuid>
X-CSRF-Token: <token>
Content-Type: application/json
```

```json
{
  "targetTaskId": "another-task-uuid",
  "expectedFocusVersion": 11,
  "checkpoint": "Happy path works; expired-token behavior remains.",
  "nextAction": "Add an expired-token integration case"
}
```

Response includes focusVersion 12, closed session ID, new session, paused task ID, and checkpoint entry ID when supplied. Switching to the already active task is a no-op receipt; it does not create another session. Start requires no active task; switch requires one. A stale version returns 409 without side effects. Completing/trashing the active task uses its version plus focusVersion and clears focus in the same transaction.

Task transition request: `{action, expectedVersion, expectedFocusVersion, checkpoint?, resolution?}`. Focus version is always supplied, even when the client believes the task is inactive. A generic PATCH cannot move project or set status. Project lifecycle changes use If-Match and are rejected if any child task is active.

## Check-in save example

```json
{
  "expectedVersion": null,
  "timezone": "Asia/Karachi",
  "intendedOutcome": "Finish invitation validation",
  "interruptionNotes": "Resume checkout after the invitation fix",
  "deadlineNotes": null,
  "waitingNotes": "Need confirmation about token lifetime",
  "reflection": null,
  "items": [
    {"section": "current", "taskId": "task-uuid", "followUpId": null},
    {"section": "waiting", "taskId": null, "followUpId": "follow-up-uuid"}
  ]
}
```

Each item references exactly one taskId, followUpId, or projectId; project references are allowed in the due section. The server reads current references and constructs snapshots; it never trusts client-supplied snapshot labels/statuses. Concurrent first saves conflict rather than overwrite. Existing saves require expectedVersion. No focus transition occurs as a side effect.

## Required executable examples during implementation

Generate OpenAPI schemas/examples for successful login, wrong credentials, CSRF rejection, text-only and multipart capture, stale task edit, stale focus command, idempotent replay, supersession cycle, unsupported file, failed transcription, range playback, expired export, and protected attachment denial. Include null/omitted-field semantics, enum values, lengths, and defaults.

OpenAPI is generated from the Nest DTOs and committed. Postman requests may be generated from it; hand-maintained assertions remain separate and are not overwritten on regeneration. Run against the local stack without publishing to a shared workspace.
