# Development phases and execution checklist

Build vertical slices: migration + Nest service/API + typed Angular page + risk-based verification. Each phase leaves a usable capability. Do not build the entire backend in isolation before connecting the frontend.

No fixed completion dates are claimed. Estimate each phase after Phase 0 and the first working slice, accounting for the user's Angular/Nest learning time. Keep scope tied to acceptance, not an invented calendar promise.

## Phase 0 — validate choices and freeze the build baseline

Dependencies: none. Deliverables:

- [x] Copy this package into the implementation repo; keep a root PRODUCT.md.
- [x] Pin mutually compatible stable Angular/CLI, NestJS, Node LTS, TypeScript, TypeORM/mysql2, and MySQL versions in the lockfile and local runtime configuration.
- [x] Record the dependency matrix and migrations strategy. Use MySQL 8.4 LTS unless the host or driver validation identifies a documented reason to change.
- [x] Select local conventions: npm workspaces, Angular dev proxy, isolated XAMPP MariaDB, D:-resident files/models/backups, and loopback services.
- [x] Confirm the current target is the user's PC; future hosting and backup-copy destinations are deliberately postponed.
- [ ] Test representative screenshots and three-to-five-minute voice samples; include expected languages, audio formats, and a mobile-recorded clip. If samples are unavailable, mark transcription quality unvalidated; continue unrelated work.
- [x] Use one separate local worker process with concurrency one and the D:-cached private model. Synthetic transcription peaked around 481 MiB; representative personal audio remains an accuracy check, not an infrastructure decision.
- [x] Establish functional page layouts from the UX document and record a coherent visual direction before UI coding.

Exit: the stack installs/builds against the local database; core architecture and any unresolved processing gate are recorded.

## Phase 1 — repository, secure shell, and operational foundation

Features: F01, foundations of F15/F16. Dependencies: Phase 0 stack baseline.

- [x] Scaffold Angular and Nest workspaces, formatting/linting/typecheck, CI, environment examples without secrets. Clean install, lint, tests, and production builds pass locally.
- [x] Create initial migrations, MySQL connection, owner-bootstrap/recovery CLI, sessions, CSRF, login/logout/password change. Verified against XAMPP MariaDB 10.4.
- [x] Add app shell, route guards, backend guards, profile timezone, active-session management. Verified in desktop and phone browser layouts, including rotation and revocation.
- [x] Set up Angular-to-API local routing plus persistent D:-resident database/file/model paths.
- [x] Add minimal health endpoints, structured request IDs/logging, and an explicit migration command. Verified against the running API.
- [x] Establish backup script skeleton and an early restore smoke test before real work data enters the system. A local SQL backup was restored into an isolated scratch database and checked before removal.
- [x] Generate initial OpenAPI; configure generated Angular API client and local Postman smoke requests. The live contract is committed and code generation runs before web start/build/test/lint; all six Postman assertions pass.

Exit: owner logs in from phone-sized and desktop layouts; private APIs/files reject anonymous access; logout/session revocation works; database survives service restart; CI checks pass.

## Phase 2 — capture, source storage, contacts, and project organization

Features: F02/F03/F08/F09/F12 basics. Dependencies: Phase 1.

- [x] Create people/teams/project tables and association CRUD with version checking. Project associations are available in the UI and covered by the running-stack smoke test.
- [x] Create entries/attachments/revisions/activity/jobs/receipts migrations.
- [x] Build text/image/audio-file capture, server validation, durable originals, input limits, idempotent retries, and Inbox. Image upload, replay, protected rendering, and byte ranges are verified against the D-drive MariaDB/storage stack.
- [x] Add media-inspection worker, thumbnail generation, protected originals and supported playback derivatives. The worker verifies hashes/signatures, decodes image/audio metadata, enforces the ten-minute audio limit, and retains failed originals.
- [x] Add entry detail/revision view, source metadata, project organization/dismiss/trash actions.
- [x] Add drafts/save-state UX and global Capture access. Owner-scoped text drafts expire after seven days and unload/close paths warn before discarding work.

Exit: capture without metadata, organize later, open original, edit note without losing source. Repeated capture submission produces one entry. Failed processing retains original. Restart preserves bytes and SQL records. Test invalid/oversized/duplicate-filename files and private audio range requests.

## Phase 3 — tasks, dates, and requirement history

Features: F04/F09. Dependencies: Phase 2.

- [x] Add tasks and source-conversion transaction; optional deadline/requester/links/next action.
- [x] Add list/detail forms, task creation, editing, filters, done/cancel/reopen transitions through the domain service.
- [x] Implement source-to-task conversion with durable linkage and idempotent replay.
- [x] Implement instructions/decisions/supersession with graph validation and revision history.
- [x] Add project task/history/decisions tabs and archived/completed state rules.

Exit: typed/pasted requirement becomes a task while original remains; changed requirement shows predecessor/successor; date-only deadlines survive timezone changes; stale task edits conflict; invalid cross-project links/cycles reject.

## Phase 4 — focus, interruptions, and Today

Features: F05/F06. Dependencies: Phase 3.

- [x] Add focus sessions/interruption edges, singleton active pointer, uniqueness constraints, and focusVersion.
- [x] Centralize all active-task status changes in the focus transaction service.
- [x] Implement start/switch/pause/wait/finish and optional checkpoint/next action.
- [x] Add current-focus strip, switch sheet, paused list, and explicit return action.
- [x] Add Today live aggregation, four-question check-in, dated snapshots, and history.
- [x] Add visibility refresh/polling and multi-device conflict UX.

Exit: A→B→C then direct resume A preserves correct history. Simultaneous device commands never create two active sessions/tasks. Idempotent retries do not duplicate sessions/checkpoints. Saving intentions does not start focus. Unsuccessful switch rolls back every related write.

## Phase 5 — follow-ups and UI evidence

Features: F07/F10. Dependencies: Phases 2–4.

- [x] Add follow-ups with contact/source/task links, dates, resolutions, and Today integration.
- [x] Add contact context pages and project people associations.
- [x] Add evidence sets/items, reference existing images without copying, labels/captions/order.
- [x] Implement side-by-side desktop and stacked mobile comparison.

Exit: unresolved questions appear under the right contact and Today; resolving does not silently complete/start a task. Evidence original remains available; incomplete comparisons are allowed. Trash/purge cannot silently break attached evidence.

## Phase 6 — search, export, restore, and R0 personal alpha

Features: F11/F15 and R0 verification. Dependencies: Phases 1–5.

- [x] Add bounded FULLTEXT/literal search, project/person/date/status filters, snippets and source links.
- [x] Add timeline date/week/month range controls and deterministic project re-entry overview.
- [x] Add export jobs, versioned manifests, Markdown/JSON/originals, expiry and authenticated downloads.
- [x] Complete trash restore, explicit purge, job cancellation, file reconciliation and retention.
- [x] Run an isolated backup restore with SQL + original-image/audio integrity checks.
- [ ] Use the app on real personal work for a short pilot; record capture friction and missing resume context.

Exit: all R0 acceptance scenarios pass on the local stack, excluding OCR/transcription-specific scenarios. Local records and originals are recoverable. R0 is not the end of the agreed R1 scope.

## Phase 7 — OCR, browser voice, and transcription

Features: F13/F14 and full F12. Dependencies: media capture/worker + Phase 0 processing experiment. Can prototype worker quality earlier without blocking the core app.

- [x] Implement explicitly enabled OCR with extracted-text revisions and review.
- [x] Add browser recording with runtime MIME support detection, permission/error UI, playback and save/discard.
- [x] Add transcription jobs, language settings, private model/runtime installation, retries, leases/timeouts.
- [x] Preserve audio, machine output, reviewed text, old extraction revisions, and approximate timestamp links.
- [x] Include reviewed/extracted text in search and exports; add processing settings/availability state.
- [x] Exercise server restart, expired lease, duplicate job, invalid codec, oversized duration, and purge-during-processing.

Exit: synthetic recorded and received clips transcribe on this PC with measured latency; failures do not lose originals or publish stale output. No main-thread UI blocking; original playback works in the tested desktop/mobile layouts. Personal language and name accuracy remains an optional user observation.

## Phase 8 — local release hardening and handoff

Features: all R1. Dependencies: Phases 0–7.

- [x] Finish local mobile/keyboard/accessibility checks and bounded desktop/mobile visual review. Physical-device recording remains an optional observation, not a local release gate.
- [x] Run critical integration/e2e/API/security checks on actual MySQL 8.4.13 using an isolated D:-resident instance.
- [x] Repeat the release smoke on the running local XAMPP/D: stack.
- [x] Measure initial load, Today/search latency, upload size handling, worker memory, local disk footprint, and backup duration.
- [x] Configure private local credentials, owner account, upload/resource limits, storage monitoring, and D:-resident backups.
- [x] Test local update/recovery procedure, session revocation, process restart, isolated restore, and backup-failure reporting.
- [x] Write local setup/recovery/user guide, architecture decisions, screenshots using fictional data, and known limits.
- [x] Reconcile the feature matrix and all critical acceptance scenarios; optional personal-device/audio observations are recorded explicitly and no unresolved data-loss/security issue is waived as polish.

Exit: the local release checklist passes and restore is demonstrated. Voice can always be retained and replayed; transcription accuracy limitations are documented without risking the original.

## Definition of done for each slice

Migration and API contract agree; input validation and errors are documented; real frontend flow works; appropriate risk-based tests pass; schema upgrades preserve prior data; no secrets/private source content in fixtures/logs; responsive and empty/error/conflict states work; relevant docs updated. Do not add tests that simply duplicate framework getters or trivial markup.

## Traceability

| Features | Database areas | API areas | Phases |
|---|---|---|---|
| F01 | users, sessions | auth/me | 1, 8 |
| F02/F09 | entries, revisions, supersessions, attachments, events, receipts | entries/attachments | 2, 3 |
| F03/F08 | projects, people, teams, association tables | projects/people/teams | 2, 5 |
| F04/F05 | tasks, focus_sessions, interruptions, users pointer | tasks/focus | 3, 4 |
| F06/F07 | check-ins/items, follow_ups | today/check-ins/follow-ups | 4, 5 |
| F10 | evidence_sets/items | evidence-sets | 5 |
| F11 | indexed source tables and derived_texts | search/history | 6, 7 |
| F12/F13/F14 | attachments, derived_texts, processing_jobs | attachments/jobs | 2, 7 |
| F15 | source tables, jobs, private storage manifests | data/exports/trash | 1, 6, 8 |
| F16 | no separate table | all user journeys | every phase, 8 |
