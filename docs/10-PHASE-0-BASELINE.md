# Phase 0 baseline

Recorded: 22 October 2026. This document records decisions that have been checked in the implementation repository. Items labelled **pending validation** remain gates for the feature they affect.

## Product and repository

- Product name: **WoKim**.
- Repository: npm workspaces with `apps/web` and `apps/api`; no monorepo framework.
- Development routing: Angular dev server proxies `/api` to NestJS.
- Production routing: one origin through Nginx; `/api` reaches NestJS and every other route falls back to the Angular application.
- Uploaded originals live outside the application image on a persistent volume. SQL and files are backed up together.

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
| Production database | MySQL 8.4 LTS | Target used for release verification |
| Local XAMPP database | MariaDB 10.4.32 | Detected at `C:\xampp\mysql\bin\mysql.exe`; accepted for local learning and development |

The application accepts `DB_TYPE=mysql` and `DB_TYPE=mariadb`. Migrations use the common subset needed by both engines. Before release, migrations and critical API tests must run against MySQL 8.4 because XAMPP's database is MariaDB rather than MySQL.

## Migration strategy

- TypeORM synchronization is disabled in every environment.
- Every schema change is an ordered migration committed with the feature.
- The API never runs migrations implicitly on startup. Deployment runs the migration command as a separate, observable step before starting the new API image.
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

## Hosting proposal

Initial recommendation: one DigitalOcean Basic Droplet with 4 shared vCPUs, 8 GiB RAM, 160 GiB SSD, and 5,000 GiB transfer at **USD 48/month**. This has enough memory to run Nginx, Angular static files, NestJS, MySQL, and a small CPU transcription worker on one private server during personal use. Weekly provider snapshots add 20% of the Droplet price; daily snapshots add 30%. Domain registration is separate and Let's Encrypt TLS is free.

Choose the closest available DigitalOcean region after measuring latency from the phone and laptop. Keep an encrypted off-server backup outside the Droplet. Hosting is a proposal only; no purchase is part of Phase 0.

Pricing source checked 22 October 2026: <https://www.digitalocean.com/pricing/droplets>.

## OCR and voice processing gate

No representative private samples have been supplied yet, so OCR and transcription quality are **pending validation**. Phase 1 and the capture features can proceed without this result.

Before Phase 7 implementation, test:

1. One clear UI screenshot and one dense or cropped UI screenshot.
2. One self-recorded mobile clip and at least two received developer voice notes, each three to five minutes where available.
3. The actual languages and code-switching used by the team.
4. Common browser and messaging formats: WebM/Opus, Ogg/Opus, M4A/AAC, MP3, and WAV as available.
5. Word accuracy for names, identifiers, ticket numbers, and technical phrases; processing time; peak memory; and output size.

The starting private pipeline is FFmpeg normalization plus a local Whisper-compatible worker. The worker is a separate process and queue even if it shares the first server. An 8 GiB host is the minimum candidate; actual model size, concurrency, and throughput remain pending the sample benchmark. No paid transcription API will be introduced silently.

## Phase 0 status

Completed decisions: repository conventions, dependency selection, database compatibility policy, migration policy, security baseline, interface direction, and costed hosting proposal.

Verified evidence: a fresh dependency install, lint, unit tests, API build, optimized frontend build, and desktop/phone login layout checks all pass.

Pending evidence: live database migration against XAMPP MariaDB, representative OCR/voice benchmark, and production MySQL 8.4 verification. These items stay visible in the development checklist.
