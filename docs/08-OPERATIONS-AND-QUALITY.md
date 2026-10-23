# Local operations and quality plan

## Local topology

WoKim currently runs only on the user's PC: Angular on `localhost:4200`, NestJS on loopback port 3000, a separate local worker process, and the isolated XAMPP MariaDB instance on loopback port 3307. Retained state and generated artifacts live under the repository's D:-resident `storage/` directory.

The worker remains a separate process so OCR/transcription cannot block normal API requests. Portable MySQL 8.4 on port 3308 is an optional compatibility test, not an everyday dependency.

## Configuration and secrets

Document environment keys without real values: database connection, session/CSRF signing secrets, local origin, D:-resident storage/model roots, upload limits, processing languages/model, timezone, and retention. Never embed secrets in Angular bundles, sample files, logs, or Git. Validate required configuration and writable storage during startup/readiness checks.

## Local update procedure

1. Create and verify a current D:-resident backup.
2. Confirm free space and keep npm/TEMP/TMP paths on D:.
3. Install from the lockfile and run migrations once.
4. Run lint, unit tests, production builds, and the risk-based API/browser suites.
5. Restart API, worker, and web processes; verify readiness, login, Today, capture, playback, transcription, focus switching, and search.

Prefer additive migrations. Roll application code back only when it remains compatible with the migrated schema; otherwise verify a backup in an isolated scratch database before restoring live files.

## Backup and restore

The local objective is a recoverable D:-resident archive no more than 24 hours old while important work is being captured. The backup contains a consistent SQL dump, original/derived files, schema/app metadata, hashes, and a deletion manifest. Export ZIPs are not the sole backup.

Restore rehearsal uses a uniquely named scratch database and D:-resident extraction directory. It verifies SQL, migrations, every referenced file checksum, representative playback, and cleanup without touching the live database.

Purging live data does not rewrite older archives. The UI states this explicitly, and a restored older archive must reapply its deletion manifest before replacing current data.

## Test strategy

| Level | What deserves verification |
|---|---|
| Domain unit tests | Deadlines, transitions, supersession, pagination signatures, reviewed-text selection |
| MariaDB/MySQL integration | Migrations, constraints, atomic focus, receipt replay, processing leases |
| HTTP/API | Authentication/CSRF, DTO limits, ETags, uploads, protected ranges, exports, cursor pages |
| Angular component | Draft retention, recording failure UI, source/review distinction, conflicts |
| Browser end-to-end | Capture, organize, switch/resume, voice playback/transcript, evidence comparison |
| Operations | Restart persistence, failed-worker recovery, reconciliation, backup/restore |
| Manual usability | Keyboard/phone layouts, denied microphone permission, real microphone formats |

Use the real local MariaDB stack for transactional checks; portable MySQL verifies engine compatibility. Use fictional fixtures only. Postman checks complement the browser/API suites but do not replace real file/audio processing.

## Essential security checks

Verify session rotation/expiry/revocation, CSRF rejection, no public signup, loopback-only database access, authenticated originals/previews/exports, file signature/size limits, path traversal rejection, safe filenames, shell-free subprocess arguments, and no source/secret leakage in logs. Render captured text without interpreting user-supplied HTML and never fetch arbitrary pasted URLs server-side.

The current app is single-owner. Enabling shared accounts requires an ownership/isolation redesign.

## Local performance targets

- Today/detail reads p95 <=500 ms on representative seeded data.
- Search p95 <=1 s on 20,000 records with bounded filters.
- Ordinary text capture acknowledgement p95 <=1 s; media transfer excluded.
- The worker stays within measured memory limits and reports queue/failure truthfully.
- Restart/retry/conflict checks lose no saved source bytes.

Record hardware, dataset, and warm/cold state. These targets characterize this PC, not every future machine.

## Monitoring and maintenance

Surface request errors/latency, processing backlog, failed jobs, D: high-water state, backup age, and reconciliation errors. Stop new uploads before disk exhaustion while leaving safe reads and exports available. Review dependency advisories and rerun backup/restore tests after storage or schema changes.

## Local completion gate

The local release is ready when all F01–F16 workflows and critical scenarios pass on the running XAMPP/D: stack; private attachments reject anonymous access; focus concurrency remains sound; backup/isolated restore passes; voice recordings remain playable when processing fails; and owner setup/recovery and known limitations are documented. Representative personal audio determines transcription quality but does not prevent storing and replaying voice notes.
