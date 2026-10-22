# Decisions, assumptions, and validation gates

Baseline: 22 October 2026. These are planning decisions; no runtime, hosting provider, or processing benchmark has been validated in this workspace.

## Decision register

| ID | Decision | Status and reason |
|---|---|---|
| D01 | Personal work memory, not a shared team tracker | User confirmed; teammates need not adopt it |
| D02 | Angular + Node.js/NestJS + MySQL | User confirmed; structured learning and hosted persistence |
| D03 | Private hosted access from laptop and phone | User confirmed; hosting provider/domain/budget remain open |
| D04 | Keep received 3–5 minute voice messages and own dictation | User confirmed; original retained alongside transcript |
| D05 | Today asks four clarity questions | User confirmed; combine explicit answers with live prefilled records |
| D06 | One owner account, separate installation per developer | Proposed default fitting personal use; shared SaaS is deferred |
| D07 | Nest modular monolith + separate worker process | Proposed default; shared code/deployment, isolated heavy work |
| D08 | TypeORM + mysql2; migration-managed schema | Proposed default; fits Nest/MySQL without assuming an ORM's latest release supports every database |
| D09 | Same-origin cookie sessions + CSRF | Proposed default; avoids browser token persistence and needless cross-origin complexity |
| D10 | MySQL job queue initially | Proposed default for low-volume personal processing; leases/idempotent output required |
| D11 | Private filesystem storage with off-host backups | Proposed default for one server; no ephemeral container storage |
| D12 | Local open OCR/transcription candidates | Validate Tesseract.js/whisper.cpp; no paid AI dependency in core |
| D13 | No automatic Slack ingestion/outbound messages | Deferred integration; manual source capture works now |
| D14 | Online responsive app; local text drafts only | Proposed default; no full offline edits/sync in R1 |
| D15 | Plain-text source/notes; derived text distinct | Proposed default; safe rendering and simple export |
| D16 | No machine-generated facts promoted automatically | Source integrity; summaries remain optional R2 drafts |

## Validation gates and defaults

| Gate | Concrete work | When it blocks |
|---|---|---|
| G01 Framework compatibility | Install/build chosen stable Angular/Nest/Node/TypeScript/ORM versions; test a migration | Before scaffolding is considered stable |
| G02 Hosting and budget | Compare actual durable storage, RAM/CPU, backup cost/region, TLS/domain, upload/time limits | Before purchasing/deploying private production |
| G03 Audio samples/languages | Test received and recorded audio in expected languages/formats; review technical names | Before claiming R1 transcription acceptance |
| G04 Processing resource limits | Measure model memory/latency and HTTP responsiveness on candidate host | Before shipping worker configuration |
| G05 Target browser devices | Test Android Chrome and iPhone Safari where available, plus desktop Chromium/Firefox; document actual coverage | Before claiming mobile audio compatibility |
| G06 Recovery | Restore SQL + original files into an isolated deployment | Before retaining irreplaceable data/declaring R0 recoverable |
| G07 Visual implementation | Choose coherent visual identity and save DESIGN.md; respect functional page rules | Before UI build, not before finishing this plan |

If user-specific samples/devices are unavailable, label the gap and continue unrelated development. Do not replace evidence with assumptions. Exact dependency versions are deliberately pinned at implementation time using official compatibility data, rather than frozen in this prose before install testing.

## Default configuration proposals

One owner, English UI, owner-selected timezone, seven-day idle/thirty-day absolute sessions, 30-day recoverable trash, 24-hour exports, seven-day command receipts/local text drafts, 20 files/entry, 10-MiB images, 50-MiB audio, 75-MiB upload aggregate, ten-minute processing limit, one transcription worker initially. These values are configurable and must be reconciled with measured host limits before release.

Free software is feasible. Always-on hosting, increasing audio storage, off-host backups, and model inference still use resources; no permanent free-host guarantee is part of the scope.

## Main risks and response

| Risk | Design response / evidence needed |
|---|---|
| Tracker becomes another administrative burden | Optional capture metadata, prefilled check-in, quick organization; observe real capture time |
| New instruction erases old context | Immutable originals, revisions, explicit supersession chain |
| Two devices corrupt active-work state | Singleton lock, focus version, unique open session, idempotent commands; real concurrent tests |
| Audio errors become apparent facts | Original playback, immutable machine output, separate reviewed text; no automatic deadline/decision extraction |
| Media exhausts small host | Bounded input, private worker resource limits, disk alerts, cleanup/retention, measured model selection |
| Backup misses referenced files | Consistent write barrier/snapshot, file manifest/checksums, isolated restore |
| Private work appears in logs/public assets | Authenticated media, safe logs, no public storage paths, fictional fixtures |
| Scope expands into a Jira/Slack clone | R0/R1 matrix and R2 backlog; new features need an observed workflow reason |

## Sources checked for planning

Primary technical references are linked here for implementation revalidation. Search results and package versions can change; follow the supported stable documentation chosen at Phase 0.

- [Angular version compatibility](https://angular.dev/reference/versions) — check compatible Node.js and TypeScript ranges before pinning.
- [Angular HTTP client](https://angular.dev/guide/http) — browser-to-backend HTTP boundary.
- [NestJS first steps](https://docs.nestjs.com/first-steps) — Node/TypeScript framework setup.
- [NestJS database integrations](https://docs.nestjs.com/data/overview) — database integration options, including TypeORM.
- [TypeORM getting started](https://typeorm.io/docs/getting-started/) — database/driver setup; confirm mysql2 compatibility for selected release.
- [MySQL 8.4 manual](https://dev.mysql.com/doc/refman/8.4/en/) — LTS database baseline and engine behavior.
- [Tesseract.js maintained project](https://github.com/naptha/tesseract.js) — browser/Node OCR candidate.
- [whisper.cpp maintained project](https://github.com/ggml-org/whisper.cpp) — local speech-processing candidate and model/runtime tradeoffs.
- [MediaRecorder format support](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/MediaRecorder) — runtime media-type detection; test actual target browsers.

These sources support technology feasibility, not claims that this application's benchmarks, privacy controls, hosting cost, or transcription quality have already passed.

## Handoff rule

Start execution with Phase 0, then Phase 1. Do not generate every planned table/controller/page in one pass before validating the first vertical slice. Keep completed acceptance evidence beside the phase checklist, and update this register when an experiment changes a default.
