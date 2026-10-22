# WoKim

WoKim is a private work memory for developers. It preserves incoming requests and their sources, keeps project history, and helps a developer pause and resume interrupted work without reconstructing context from chat.

## Stack baseline

- Angular 21 LTS frontend
- NestJS 11 on Node.js 24
- TypeORM 1 with `mysql2`
- MySQL 8.4 LTS in production; MariaDB 10.4 through XAMPP is supported for local review only

## Workspace

```text
apps/web/   Angular client
apps/api/   NestJS API
docs/       product and implementation plan
infra/      deployment and recovery assets
```

## Local setup

1. Run XAMPP's MySQL service.
2. Create the local database and restricted app user with `./infra/scripts/xampp-init.ps1 -AppPassword '<your local database password>'`. Add `-RootPassword '<root password>'` if the local root account has one.
3. Copy `.env.example` to `.env`, put the same application password in `DB_PASSWORD`, and replace both development secret placeholders.
4. Run `npm install`, then `npm run db:migrate`.
5. Run `npm run owner:bootstrap` and enter the owner details.
6. Start `npm run dev:api` and `npm run dev:web` in separate terminals.

The Angular development server proxies `/api` to `http://localhost:3000`. No public signup route exists.

After replacing the collection's local owner credentials, run the Phase 1 API smoke flow with:

```powershell
postman collection run postman/wokim-phase-1.postman_collection.json
```

See [the implementation plan](docs/README.md) and [the current development checklist](docs/07-DEVELOPMENT-PLAN.md).
