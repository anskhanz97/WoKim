# WoKim local operations runbook

This runbook covers the implemented single-owner application on this PC. Commands assume the repository is `D:\Code\5. Projects\WoKim`. Database files, private media, models, backups, fixtures, reports, and temporary browser profiles belong on D:, never C:.

## D:-resident data layout

| Data | Local path |
|---|---|
| MariaDB data/config/logs | `storage/mariadb` |
| Originals, derivatives, and exports | `storage/private` |
| OCR/transcription models | `storage/models` |
| Backups | `storage/backups` |
| Test reports and screenshots | `storage/reports` |
| Temporary files/browser profiles | `storage/tmp` |
| Optional portable MySQL validation | `storage/tooling` and `storage/mysql84` |

`storage/` is ignored by Git. A source checkout does not contain the user's records.

## First local setup

1. Copy `.env.example` to `.env`. Set `DB_PORT=3307`, `DB_TYPE=mariadb`, and absolute D: paths for `PRIVATE_STORAGE_ROOT`, `MODEL_CACHE_ROOT`, `TEMP`, and `TMP`. Generate distinct session and CSRF secrets of at least 32 random characters. Do not commit `.env`.
2. Keep npm's cache on D: when installing:

   ```powershell
   $env:npm_config_cache='D:\Code\5. Projects\WoKim\.npm-cache'
   npm ci
   ```

3. Start the isolated XAMPP-backed database and run migrations:

   ```powershell
   .\infra\scripts\start-d-drive-mariadb.ps1
   npm run db:migrate
   ```

4. Create the owner with `npm run owner:bootstrap`.
5. Start the three local processes in separate terminals:

   ```powershell
   npm run dev:api
   npm run dev:worker
   npm run dev:web
   ```

Open `http://localhost:4200`. The API binds to loopback and the dedicated MariaDB instance listens only on port 3307. XAMPP's normal port-3306 instance remains separate.

## Voice notes and readable transcripts

Open **Capture**, select **Record voice**, allow microphone access, stop, and preview the recording. The original audio is always retained after **Save capture**. Leave **Keep the original audio and also convert it to readable text after saving** unchecked to store audio only, or check it to enqueue private transcription.

Keep `npm run dev:worker` running when OCR or transcription is wanted. The entry page provides authenticated playback, **Transcribe privately**, job status/retry, readable machine text, and a review action. Correcting text never alters the recording or the immutable machine output.

## Optional compatibility validation

The official portable MySQL 8.4.13 test installation lives entirely on D: and uses loopback port 3308. It is not required for ordinary use.

```powershell
.\infra\scripts\start-d-drive-mysql84.ps1
# Run migrations/tests with the documented test-only MySQL environment.
.\infra\scripts\stop-d-drive-mysql84.ps1
```

## Routine checks

- `GET /api/v1/health/live` confirms API liveness.
- Authenticated `GET /api/v1/health/ready` verifies SQL and writable private storage.
- **Data & recovery** shows D: capacity, processing backlog, and backup status.
- Uploads stop before D: is exhausted while reads and exports remain available.
- Request logs contain IDs, routes, statuses, and durations, not source text or secrets.

## Local backup and restore

Create a D:-resident archive:

```powershell
.\infra\scripts\backup-xampp.ps1
```

Verify SQL and every private-file checksum in an isolated scratch database:

```powershell
.\infra\scripts\restore-xampp-smoke.ps1 -Archive 'D:\Code\5. Projects\WoKim\storage\backups\wokim-YYYYMMDD-HHMMSS.zip'
```

The restore check deletes its scratch database and extraction directory after verification. Copying archives somewhere else is a later personal choice, not a prerequisite for running WoKim locally.

## Safe local update and recovery

Before updating code, create a verified backup and confirm free space. Then run `npm ci`, migrations, lint, tests, and builds before restarting API, worker, and web processes. Use additive migrations where possible.

If an update fails, preserve the current D:-resident database/private files and logs. Revert application code only when it remains compatible with the migrated schema; otherwise restore a verified archive into an isolated database first. `npm run owner:reset` provides local owner recovery. Revoke unfamiliar browser sessions from the profile page.

## Verification commands

```powershell
$env:TEMP='D:\Code\5. Projects\WoKim\storage\tmp'
$env:TMP=$env:TEMP
npm run lint
npm test
npm run build
npm run test:e2e:api
npm run test:e2e:focus
npm run test:e2e:phase5
npm run test:e2e:phase6
npm run test:e2e:phase7
$env:PHASE7_AUDIO_FIXTURE='D:\Code\5. Projects\WoKim\storage\test-fixtures\phase7-voice.wav'
npm run test:transcription
npm run test:performance
```

The responsive browser smoke is `apps/web/test/responsive-smoke.cjs`; it writes screenshots only under `storage/reports`.

## Known local limits

- Actual microphone formats and permission prompts vary by browser/device; audio-file upload remains available if recording is unsupported.
- Representative personal recordings are still needed to judge transcription accuracy for the user's languages, names, and technical vocabulary.
- Media files are private and authenticated but are not claimed encrypted at rest.
- `@nestjs/swagger` currently brings a moderate `js-yaml` CPU advisory. WoKim does not accept YAML input; upgrading requires a coordinated Nest/Swagger major-version test.
