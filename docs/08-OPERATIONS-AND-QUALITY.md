# Operations and quality plan

## Hosting topology

Proposed initial deployment: one private Linux VPS, Angular static build behind a reverse proxy, Nest HTTP process, separate worker process, MySQL, and a durable private file volume. Docker Compose gives reproducible local/staging/production service configuration without requiring Kubernetes.

Public ports: HTTPS and necessary HTTP-to-HTTPS redirect only. MySQL and worker are not internet-facing. Serve Angular and `/api/v1` under one origin. Domain/TLS and host purchasing are later execution decisions, not actions authorized by creating this plan.

Persistent mounts: MySQL data, originals/derivatives, models when needed, and a small backup-status manifest accessible to the data summary service. Upload staging has explicit cleanup. Never rely on container writable layers for retained data. Export bundles are private and expiring.

RAM/CPU selection must include MySQL + HTTP + transcription model peak memory. A cheap API-only host may be unable to run the selected model. Record measured worker resource caps; if necessary place the worker on a separate private machine later. Do not promise a free always-on production deployment.

## Configuration and secrets

Document environment keys without real values: database connection, session/CSRF signing secret, public origin, private storage root, upload limits, worker concurrency/timeouts, OCR languages/model path, log level, timezone default, export/trash retention, and backup destination credentials.

Supply secrets at runtime; never embed them in Angular bundles, Docker image layers, sample files, logs, or Git. Use a least-privilege runtime database account; schema migration account is distinct where practical. Use SSH/operator access for bootstrap/recovery. Validate required configuration and storage permissions at startup.

## Deployment procedure

1. Build/test immutable app/worker images and Angular assets from one commit; record versions.
2. Confirm recent backup and adequate disk.
3. Drain/pause worker and mutations for incompatible migrations; allow safe read-only maintenance screen if needed.
4. Run reviewed migration once using deployment credentials, not independently on every application replica.
5. Start updated services; check readiness, login, Today, original file, and job processing.
6. Resume worker/writes and monitor errors/storage/queue.

Prefer additive, backward-compatible migrations. Rollback is not simply “run down migration”: deploy previous code only if schema compatible; otherwise restore a backup under a declared maintenance procedure. Record possible data loss since backup before a destructive restore. Never run restore automatically on a production host after a failed deploy.

## Backup and restore

Proposed initial objectives: recovery point <=24 hours, recovery time <=4 hours. These are targets to test, not guarantees. Proposed retention: seven daily and four weekly encrypted backups, stored outside the app server. Track last successful backup; warn visibly after 26 hours without success. Failed backups must not be marked successful just because a script exited early.

Backup contents: consistent MySQL dump, original and referenced derivative files, schema/app version, file path/hash manifest, required configuration documentation, and secure separately recoverable secrets. Models can be downloaded again; note exact model checksums/versions. Export ZIPs are not the sole backup.

For the simple first implementation, briefly block mutations/uploads/purge and drain workers; finish or abort in-flight transactions; take a consistent database dump and copy referenced files into an independent snapshot/archive while the write barrier is held. Release the barrier only after the files in the snapshot cannot disappear under purge. Encrypt and transfer off-host; verify decryption/checksums before marking success. Measure downtime; optimize with immutable-file snapshots later if this becomes disruptive.

Restore rehearsal:

1. Use an isolated clean environment with matching MySQL/application versions.
2. Decrypt and verify manifests; restore database and referenced files.
3. Clear old sessions and invalidate CSRF/session secrets; bootstrap/recover owner access securely.
4. Reset abandoned running-job leases; do not rerun destructive jobs until references are checked. Invalidate expired export results and stale command receipts as needed.
5. Verify row counts, representative source relationships, attachment hashes, playback, latest check-in, focus invariants, and derived-text access.
6. Record elapsed time and recovery point; delete rehearsal copies securely when finished.

Deletion policy: purging live data does not rewrite every retained backup immediately. Display retention clearly; if a restored backup predates a purge, operator reconciliation must reapply those deletions before serving it as live data. Keep a separately protected deletion manifest containing opaque IDs/times, not message contents, for that reconciliation.

## Test strategy

| Level | What deserves verification |
|---|---|
| Domain unit tests | Deadline semantics, allowed transitions, supersession cycles, reviewed-text selection, snapshot construction |
| MySQL integration | Migrations/FKs/generated uniqueness, atomic switch, rollback, concurrent commands, receipt replay, output publication leases |
| HTTP/API | Authentication/CSRF, DTO limits, ETags, error shapes, upload constraints, protected range delivery, export expiry |
| Angular component | Check-in does not start work, stale form retains draft, recording failure UI, source/review distinction |
| Browser end-to-end | Capture→organize→task→switch→resume; changed requirement; voice→transcript→search; before/after evidence |
| Operations | Restart persistence, migration upgrade, failed worker recovery, purge/orphan handling, full backup restore |
| Manual usability/accessibility | Phone capture, keyboard navigation, long text, zoom, denied permissions, actual mobile audio formats |

Use real MySQL for transactional/schema tests; SQLite substitutes do not establish MySQL locking/constraint behavior. Run concurrent HTTP commands, not only mocked service calls. Use synthetic fixtures without client/company material. Local Postman CLI checks complement browser flows; do not treat a passing mock as evidence of working storage or audio processing.

## Essential security checks

Verify session rotation/expiry/revocation, CSRF rejection, no public setup/signup, no database port exposure, authenticated originals/previews/exports, file signature/size limits, path traversal rejection, safe filenames, shell-free subprocess arguments, and no source/secret leakage in logs. Render plain text without interpreting user-supplied HTML. Allowlist outbound URL schemes and never fetch arbitrary pasted URLs server-side.

The current app is single-owner; document that public signup cannot be enabled safely without an ownership redesign. Do not claim encrypted-at-rest media unless configured and verified on the chosen host. Off-host backups must be encrypted with recoverable keys.

## Proposed service targets

- Today/detail reads p95 <=500ms server time on representative seeded data, excluding network.
- Search p95 <=1s on 20,000 representative records with bounded filters.
- Ordinary text capture server acknowledgement p95 <=1s; media transfer time excluded.
- Worker stays within measured memory/CPU limits and reports queued/running/failure truthfully.
- No data-loss event in restart/retry/conflict acceptance scenarios.

Record hardware, dataset, network, warm/cold state, and sample size. Do not claim production SLA or unlimited storage from these development targets.

## Monitoring and maintenance

Log request errors/latency with IDs; surface worker backlog/failed jobs, disk high-water mark, backup age, and reconciliation errors. Proposed storage warnings at 80% and 90%; stop new uploads with a clear error before disk exhaustion while allowing safe reads/export where possible. Quotas must cover temp uploads, model files, exports and backups, not just originals.

Review updates and vulnerability reports regularly, test upgrades in staging, rotate secrets after suspected exposure, and rerun restore after material storage/schema changes. Server monitoring alerts and operational checks do not imply this product includes outbound task reminders in R1.

## R1 release gate

All F01–F16 requirements and ten critical scope scenarios pass; representative mobile audio works; pending processing quality limits are documented; chosen deployment survives restart; private attachments are inaccessible anonymously; concurrent focus invariant holds; current backup is verified off-host; isolated restore succeeds; owner setup/recovery and known limitations are documented. No release solely because the UI looks complete.
