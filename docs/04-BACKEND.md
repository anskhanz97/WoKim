# Backend implementation plan

## Structure

One NestJS application, TypeScript, REST under `/api/v1`, MariaDB/MySQL through TypeORM + mysql2, and private D:-resident file storage. One worker entry point in the same codebase processes durable database jobs. Run HTTP and worker as separate local processes so long audio does not block API handling.

Proposed modules:

| Module | Responsibility |
|---|---|
| Auth / Owner | Owner bootstrap, credentials, sessions, CSRF, profile/timezone |
| People / Teams | Contact records and associations |
| Projects | Lifecycle, project associations, overview aggregation |
| Tasks | Task fields, validation, source conversion |
| Focus | Sole authority for active work, switching, pausing, waiting, completion |
| Entries | Inbox, source metadata, editable notes, revisions, supersession |
| Attachments | Private uploads, original delivery, previews and integrity |
| FollowUps | Questions, waiting, answers, follow-up dates |
| Today / CheckIns | Live Today aggregation and dated snapshot saves |
| Evidence | Before/after groupings and attachment references |
| Search | Cross-record text queries and filters |
| Activity | Transactional event-writing helper and timeline reads |
| Processing | Durable queue, worker leases, OCR/transcription/media inspection |
| Data | Exports, trash/purge workflow, storage summary |
| Health | Minimal liveness and restricted readiness checks |

Controllers parse/validate and call services. Services own business rules/transactions. Repositories perform queries. Reuse TypeORM rather than introduce a generic repository wrapper. Modules communicate through injected services; avoid circular dependencies by placing focus orchestration in Focus and reusable transaction/event helpers in a small shared internal module.

## Authentication and single-owner setup

- Create the initial owner using a server-side CLI command requiring interactive password input. No default password and no public setup/signup endpoint.
- Passwords use a maintained Argon2id implementation with measured settings and a documented library baseline. Never invent a password hashing scheme.
- Use a cryptographically random opaque server-session cookie, hash its secret in MySQL, and rotate on login. Production cookie: `__Host-wm_session`, Secure, HttpOnly, SameSite=Lax, Path=/, no Domain.
- Proposed session limits: seven-day idle expiry and thirty-day absolute expiry; optional shorter sessions later. Throttle last_seen updates to avoid a write on every media range request.
- Same-origin frontend and API. Require CSRF protection on every mutation, including login/logout. Use a maintained signed double-submit middleware: `/auth/csrf` establishes the signed secure cookie and returns the matching header token. Validate token plus Origin; reject cross-site/missing-invalid origins for browser mutations. Rotate on login/logout. Verify final behavior with Angular's configured header/cookie handling.
- Do not store login credentials/session secrets in localStorage. An Angular route guard is navigation assistance; the backend guard protects every private endpoint.
- Password change requires current password, rotates session, and revokes all other sessions. Operator password recovery revokes all sessions. Recovery is documented CLI work, not email infrastructure.
- Rate-limit login by IP and account, return generic credential errors, avoid account-enumeration messages, and never log passwords, cookies, or full request bodies.

## Validation and concurrency

Use DTO allowlists and reject unknown fields. Bound text sizes, page sizes, date ranges, file counts/sizes, URL lengths, and JSON item counts. Validate HTTP(S) URLs without fetching them. Keep database credentials exclusively server-side.

All mutable-resource PATCH/DELETE operations require the latest entity ETag via If-Match. Stale edits return 412 with the current version. Focus mutations use expectedFocusVersion and Idempotency-Key, returning 409 if focus is stale. Never let a generic status PATCH bypass Focus. Tasks use a separate transition command for status changes.

Multi-record writes use one explicit transaction manager. Follow the database lock order; bound deadlock retries. Do not publish a successful response/event before commit. Generate command receipts inside the transaction to make safe client retries concrete.

## Capture and attachment storage

Initial upload defaults: 20 files per entry, 10 MiB per image, 50 MiB per audio file, 75 MiB aggregate request, ten minutes of audio for automated processing. Set matching proxy/API limits. Accept JPEG/PNG/WebP images and supported MP3/M4A/AAC/OGG/Opus/WAV/WebM audio after extension/MIME/signature checks. Do not accept HTML/SVG/executables as images. Limits are configurable and must be visible before upload.

Pipeline:

1. Stream incoming bytes to a private temporary directory with a request byte cap.
2. Check allowed signatures and compute SHA-256; never trust filename or browser MIME alone.
3. Generate opaque server keys; safely move validated originals into durable storage.
4. In one SQL transaction create entry, attachment rows, media-inspection jobs, activity, and command receipt.
5. On SQL failure remove newly moved files or enqueue/reconcile cleanup; on success return IDs immediately.

The filesystem and SQL cannot share one ACID transaction. A bounded reconciliation job removes old staging/orphan files only after verifying they are not referenced or currently in use. Never expose an entry as saved if its original file is not durable.

Audio duration/decodability inspection and thumbnail/playback generation run in the worker with time/resource bounds. Over-duration or undecodable audio remains preserved with an explanatory processing state and downloadable original; no transcription job is started. Never overwrite originals with normalized audio. Normalize a private playback derivative when necessary, using ffmpeg; preserve the original filename/hash for export.

Private paths are outside the web root. Attachment GET resolves a database ID to a server key after authentication, supports audio byte ranges, and sets safe content types and no-sniff headers. Downloads use sanitized Content-Disposition names. All private media and exports use `Cache-Control: private, no-store`; the public proxy serves only application assets. Do not accept user-supplied filesystem paths or arbitrary remote-download URLs.

Use process argument arrays for ffmpeg/whisper; never construct shell commands from filenames or text. Constrain dimensions, decode memory, duration, execution time, and concurrency. Media inspection/processing failures must not crash the HTTP process.

## Durable background work

Initial implementation uses processing_jobs in MySQL; no separate broker required. Worker claims queued work with a short transaction and locking read, assigns a lease token, commits, then performs processing outside the transaction. Proposed concurrency: one transcription job per worker until measured. Heartbeats extend leases; workers publish results only if their token is still current.

Expired leases can be reclaimed. At-least-once execution is expected; output publication must be idempotent. Write derived files to temporary keys, then atomically rename and publish DB references. Recover abandoned temporary outputs through reconciliation.

- Transient resource/worker errors: retry at most three total attempts with bounded backoff.
- Invalid format, excessive duration, missing model: clear nonretryable failure; retain original.
- Manual retry creates a new job after the previous active job ends.
- Trash cancels queued work; running workers check eligibility before publication.
- Error responses/logs expose a safe code and explanation, not raw host paths or model credentials.

Use `inspect_media` before playback/transcription availability. OCR/transcription job requests declare engine/language options from a server allowlist. Queue polling does not require Redis. R1 progress is queued/running/result, not a fabricated percentage.

## OCR and transcription

Candidate OCR: Tesseract.js in a worker. Candidate transcription: whisper.cpp executable in a constrained worker process. Both are validation choices until tested with representative screenshots and the user's three-to-five-minute audio.

Acceptance experiment: English, expected mixed-language audio, quiet/noisy recordings, names, and code terms. Record model size, peak memory, CPU, elapsed time, output errors, and file-format behavior on the intended host. A local open model has no per-minute API fee, but its server compute is not free.

Processing produces immutable machine output revisions. User-reviewed text is distinct and searchable. R1 does not automatically infer deadlines, decide requirements, or summarize messages into authoritative facts. No external AI service receives work content unless the user later explicitly configures that feature.

## Search and Today read models

Search reads current tasks, entries, current derived text, people, and teams with bounded queries and metadata filters. Prefer reviewed text when present. Use FULLTEXT where appropriate; escape fallback LIKE metacharacters and bound broad queries. Do not include trashed records, expired export data, or superseded extraction revisions in default results. Superseded instructions remain searchable with a clear label.

Today aggregation computes current focus, paused tasks, overdue/upcoming task deadlines and project target dates, due follow-ups, inbox count, and any saved check-in. Resolve date-only deadlines using the selected timezone; compare exact deadlines as instants. Read live sections consistently within a transaction or a coordinated snapshot; return serverTime and focusVersion. Do not persist redundant “is overdue” columns.

Project overview re-entry combines last checkpoint, recent source changes, current decisions, and unfinished work. It is deterministic retrieval initially, not an AI-generated narrative.

## Export and retention

Export job produces a private ZIP containing versioned JSON manifest, readable Markdown per project/task, derived/reviewed text, original files, and checksums. It is a portability export, not a guaranteed one-click import format. Operator backups are the supported exact-restore mechanism.

Proposed export expiry: 24 hours. Include it in storage quotas and authenticated downloads. Build exports from a consistent metadata snapshot and protected original-file references; coordinate purge while bundling. Unrelated edits may continue after the snapshot. Trash retention defaults to 30 days. Purge SQL visibility/relationships first, then delete files with a retryable cleanup job. Keep a local admin-visible cleanup failure list.

## Contract/tooling and observability

Use Nest OpenAPI DTO metadata as the executable contract during implementation. Generate and commit OpenAPI; generate the Angular client from that artifact. Keep manual examples/collection assertions outside generated files. Postman CLI is available: run a local collection covering auth, capture, focus conflicts, and protected attachments. No workspace publication is required by this plan.

Structured logs carry requestId, route, status, duration, safe entity/job IDs. Exclude source message text and tokens by default. Track pending/failed jobs, available disk, last successful backup, error rate, and slow queries. `/health/live` is minimal; readiness checks SQL and writable storage without exposing configuration publicly.
