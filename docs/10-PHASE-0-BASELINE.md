# Phase 0 baseline

Recorded: 22 October 2026. This document records decisions that have been checked in the implementation repository. Items labelled **pending validation** remain gates for the feature they affect.

## Product and repository

- Product name: **WoKim**.
- Repository: npm workspaces with `apps/web` and `apps/api`; no monorepo framework.
- Development routing: Angular dev server proxies `/api` to NestJS.
- Local routing: the Angular development server proxies `/api` to loopback NestJS.
- Uploaded originals, SQL, models, and backups live under D:-resident storage and are backed up together.

## Runtime and dependency matrix

| Area | Baseline | Reason/status |
|---|---:|---|
| Node.js | 24.x | Current supported runtime; local machine is 24.13.0 |
| npm | 11.x | Local machine is 11.6.2 |
| Angular / CLI | 21.2.x | Supports Node 24.0+; Angular 22 requires Node 24.15+ and does not match the installed runtime |
| TypeScript | Angular-managed 5.9.x | Pinned by the generated Angular workspace |
| NestJS | 11.1.x | Supports Node 20+ |
| TypeORM | 1.1.x | Node 24-compatible baseline |
| MySQL driver | mysql2 3.24.x | TypeORM-supported MySQL/MariaDB driver |
| Compatibility database | MySQL 8.4 LTS | Optional portable D:-resident engine used for migration/API verification |
| Local XAMPP database | MariaDB 10.4.32 | Detected at `C:\xampp\mysql\bin\mysql.exe`; the running application uses separate D:-resident data on port 3307 |

The application accepts `DB_TYPE=mysql` and `DB_TYPE=mariadb`. Migrations use their common subset. All migrations and critical API tests pass on both the local MariaDB instance and portable MySQL 8.4.

## Migration strategy

- TypeORM synchronization is disabled in every environment.
- Every schema change is an ordered migration committed with the feature.
- The API never runs migrations implicitly on startup. Run the migration command explicitly before starting an updated API.
- Rollback uses a database/file backup for destructive or data-shaping migrations. `migration:revert` is only a developer convenience for a migration whose reverse operation is known to preserve data.
- Schema, OpenAPI contract, backend behavior, and Angular flow change in the same vertical slice.

## Security baseline

- A single owner is created or recovered from a local CLI; there is no public registration route.
- Passwords use Argon2id. Session secrets and CSRF tokens are random and stored or checked as hashes/signatures.
- Authentication uses `HttpOnly`, `SameSite=Lax` cookies. Production cookies are secure and use the `__Host-` prefix.
- Mutations require a matching CSRF header/cookie and reject an unexpected `Origin`.
- Private APIs deny anonymous requests by default. Health liveness and the login bootstrap endpoints are explicit exceptions.
- Secrets come from environment variables and are excluded from Git.

## Interface direction

The approved direction is the **working ledger** recorded in [`DESIGN.md`](../DESIGN.md): quiet paper/sheet surfaces, IBM Plex typography, a cobalt current-work thread, and amber interruption/resume state. Desktop uses a narrow rail and focused reading column. Mobile uses a single column, bottom navigation, and touch targets at least 44 px high.

## Local-machine decision

The current target is this PC. API, worker, web app, MariaDB data, private files, models, fixtures, reports, and backups are operated locally, with generated state on D:. Hosting choices are postponed and are not part of the local completion gate.

## OCR and voice processing gate

No representative private samples have been supplied yet, so OCR and transcription quality are **pending validation**. Phase 1 and the capture features can proceed without this result.

Before Phase 7 implementation, test:

1. One clear UI screenshot and one dense or cropped UI screenshot.
2. One self-recorded mobile clip and at least two received developer voice notes, each three to five minutes where available.
3. The actual languages and code-switching used by the team.
4. Common browser and messaging formats: WebM/Opus, Ogg/Opus, M4A/AAC, MP3, and WAV as available.
5. Word accuracy for names, identifiers, ticket numbers, and technical phrases; processing time; peak memory; and output size.

The private pipeline is FFmpeg normalization plus a local Whisper-compatible worker in a separate process and queue. Synthetic verification measured the local pipeline; representative personal samples still determine useful language/name accuracy. No paid transcription API is used.

## Phase 0 status

Completed decisions: repository conventions, dependency selection, database compatibility policy, migration policy, security baseline, interface direction, and the D:-resident local topology. The baseline is installed, compiled, and exercised against the isolated XAMPP MariaDB instance.

Verified evidence: a fresh dependency install, lint, unit tests, API build, optimized frontend build, and desktop/phone login layout checks all pass.

Pending evidence: representative personal voice accuracy and real-device microphone behavior. Portable MySQL 8.4 verification is complete; these remaining observations do not block storing and replaying local voice notes.
