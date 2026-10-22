# Phase 1 implementation record

Updated: 22 October 2026.

## Implemented

- npm workspace with Angular in `apps/web` and NestJS in `apps/api`.
- Locked dependency graph in the root `package-lock.json`.
- Environment parsing and production secret checks.
- Explicit TypeORM migrations for the single owner and revocable sessions; schema synchronization is disabled.
- Owner bootstrap and password recovery CLIs.
- Argon2id passwords, opaque hashed session tokens, idle/absolute expiry, secure production cookie names, CSRF double-submit checks, Origin checks, and basic login throttling.
- Private-by-default API guard, profile version checks through `If-Match`, timezone editing, password rotation, and session listing/revocation.
- Liveness and authenticated readiness endpoints, request IDs, validation, stable error envelopes, and runtime OpenAPI output.
- Responsive Angular login, protected shell, Today placeholder, and profile/access page.
- Nginx same-origin routing, MySQL 8.4 Compose services, a migration gate before API startup, persistent SQL/file volumes, and backup/checksum scripts.
- XAMPP database initialization helper and a Postman Phase 1 smoke collection.
- GitHub Actions build/test workflow.

## Verified locally

| Check | Result |
|---|---|
| `npm install` from a fresh cache | Passed; 1,075 packages and one root lockfile |
| `npm run lint` | Passed |
| `npm test` | Passed: 2 Nest suites / 3 tests and 1 Angular suite / 1 test |
| `npm run build` | Passed for the NestJS API and optimized Angular application |
| Desktop login layout at 1440 × 900 | Passed; both columns fit with no horizontal overflow |
| Phone login layout at 390 × 844 | Passed; no horizontal overflow and inputs/button are 48 px high |
| Empty login validation | Passed; both field errors are exposed in the accessibility tree |
| Browser console on login route | No warnings or errors |

The optimized browser entry is about 273 kB raw and 75 kB estimated transfer before lazy routes. This is an appropriate Phase 1 baseline.

## Pending live-environment checks

These require the XAMPP database service or Docker:

1. Initialize the local database and app user, copy `.env.example` to `.env`, and run the migration.
2. Bootstrap the owner and exercise login, logout, password rotation, CSRF rejection, anonymous rejection, session revocation, and readiness.
3. Generate and save the live OpenAPI document, then generate the Angular client from that document.
4. Run the Postman Phase 1 smoke collection.
5. Restart the database/API and confirm persistence.
6. Run the container migration gate and isolated backup restore when Docker is available.

Phase 1 remains in progress until these checks pass. OCR/voice sample benchmarking remains a separate Phase 0 gate for Phase 7.
