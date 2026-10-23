# WoKim

WoKim is a private work memory for developers. It preserves incoming requests and their sources, keeps project history, and helps a developer pause and resume interrupted work without reconstructing context from chat.

## Stack baseline

- Angular 21 LTS frontend
- NestJS 11 on Node.js 24
- TypeORM 1 with `mysql2`
- MariaDB 10.4 through XAMPP for the local application; portable MySQL 8.4 is retained only for compatibility testing

## Workspace

```text
apps/web/   Angular client
apps/api/   NestJS API
docs/       product and implementation plan
infra/      local database, backup, and recovery scripts
```

## Local setup

1. Start the isolated development database with `./infra/scripts/start-d-drive-mariadb.ps1`. It uses XAMPP's MariaDB binaries but keeps all WoKim database files under `D:\Code\5. Projects\WoKim\storage\mariadb` on port 3307.
2. Copy `.env.example` to `.env`, put the local credentials in it, set `DB_PORT=3307`, use an absolute `D:` path for `PRIVATE_STORAGE_ROOT`, and replace both development secret placeholders.
3. Run `npm install`, then `npm run db:migrate`.
4. Run `npm run owner:bootstrap` and enter the owner details.
5. Start `npm run dev:api` and `npm run dev:web` in separate terminals.

The Angular development server proxies `/api` to `http://localhost:3000`. No public signup route exists.

## Realistic showcase workspace

The showcase is isolated from the live database and keeps its database, attachments, thumbnails, model cache, and temporary files on `D:`.

```powershell
npm run db:seed:showcase
./infra/scripts/start-showcase.ps1
```

Open `http://localhost:4300` and sign in with the same owner credentials as the live installation. The showcase runs MariaDB on port 3308, its API on 3100, and its web client on 4300. Re-running the seed command replaces only the dedicated `wokim_showcase` database and showcase private storage.

After replacing the collection's local owner credentials, run the Phase 1 API smoke flow with:

```powershell
postman collection run postman/wokim-phase-1.postman_collection.json
```

See [the implementation plan](docs/README.md), [operations runbook](docs/18-OPERATIONS-RUNBOOK.md), [user guide](docs/19-USER-GUIDE.md), and [current release evidence](docs/20-PHASE-8-PROGRESS.md).

The committed live OpenAPI contract is `docs/api/openapi.json`. `ng-openapi-gen` regenerates the ignored Angular client before frontend start, lint, test, and build commands.
