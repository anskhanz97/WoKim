# Phase 6 progress

Phase 6's local product and recovery slices are implemented and verified against the D-drive MariaDB and private-storage stack.

## Completed

- Search uses database FULLTEXT indexes for eligible queries and a literal `INSTR` fallback for short or punctuation-heavy terms. Task/entry project filters, entry person/date filters, task status filters, bounded results, snippets, and application links are available.
- Project history has day/week/month controls, and the overview route returns task counts, recent activity, decisions, and project people for deterministic re-entry.
- Authenticated project/all-data ZIP exports include a versioned manifest, JSON, Markdown guidance, and original files. Bundles expire after the configurable 24-hour default.
- Entries, tasks, and attachments appear in trash and can be version-safely restored. Permanent purge requires an explicit `PURGE` confirmation and rejects dependency-breaking deletes.
- Reconciliation reports missing and unreferenced private files. Retention removes expired export records/bundles, reports cleanup failures, and reports 30-day trash purge candidates without silently destroying user work.
- A live backup was created at `D:\Code\5. Projects\WoKim\storage\backups\wokim-20261022-172726.zip`. Its SQL was restored into a temporary MariaDB database on port 3307, the migration table was queried, and SHA-256 checksums for 20 private originals/derivatives were verified. The scratch database was then dropped. Backup and restore scratch data stayed on D.
- The Phase 6 running-stack test covers FULLTEXT/literal recall, project overview, anonymous export rejection, authenticated ZIP retrieval, restore, confirmed purge plus physical deletion, task restore, reconciliation, and expired-export retention.

## Still open

- The real-personal-work pilot is intentionally not represented by synthetic fixtures. It requires the owner to use the application for a short period and report capture friction or missing resume context.
- Remote access and two-device observation are postponed by user choice. They are not part of the current local-PC completion target.
