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
| `npm test` | Passed: 2 Nest suites / 3 tests and 2 Angular suites / 3 tests |
| `npm run build` | Passed for the NestJS API and optimized Angular application |
| Desktop login layout at 1440 × 900 | Passed; both columns fit with no horizontal overflow |
| Phone login layout at 390 × 844 | Passed; no horizontal overflow and inputs/button are 48 px high |
| Empty login validation | Passed; both field errors are exposed in the accessibility tree |
| Browser console after corrected authenticated reload | No warnings or errors in a clean tab |
| XAMPP MariaDB migration | Passed; one migration created `users`, `sessions`, and TypeORM's migration record |
| Owner authentication | Passed through Angular and the NestJS API |
| Anonymous, CSRF, and Origin rejection | Passed with 401, 403, and 403 respectively |
| Login throttling | Passed: five invalid attempts returned 401 and the sixth returned 429 |
| Profile concurrency | Passed: a stale `If-Match` replay returned 412 |
| Password rotation | Passed; the old password and all prior sessions became invalid while the replacement session remained valid |
| Session listing/revocation/logout | Passed in the browser; only the current browser session remains active |
| API restart persistence | Passed; owner and session data remained available after repeated watch-mode API restarts |
| Postman smoke collection | Passed: 5 requests and 6 assertions |
| Generated API client | Passed; 9 paths and 3 DTO models generate before Angular start/build/test/lint |
| Running-stack API e2e | Passed for liveness and anonymous rejection |
| Isolated restore smoke | Passed; SQL dump restored 1 owner, 7 historical sessions, and 1 migration into a scratch database |

The optimized browser entry is about 273 kB raw and 75 kB estimated transfer before lazy routes. This is an appropriate Phase 1 baseline.

## Deferred deployment checks

The local Phase 1 exit criteria pass. These checks belong to deployment hardening or later feature gates:

1. Run the Compose migration gate and volume persistence checks when Docker is available.
2. Run migrations and critical API tests against production MySQL 8.4 rather than XAMPP MariaDB.
3. Exercise a full off-server encrypted backup and file-original restore after Phase 2 introduces attachments.
4. Benchmark representative OCR and three-to-five-minute voice samples before Phase 7.
5. Run the configured GitHub Actions workflow after the repository is pushed; the same lint, test, and build commands pass locally.

Phase 1 is complete for the local XAMPP development target. Docker and production MySQL checks remain explicit release gates rather than hidden assumptions.

During setup, MariaDB reported corruption in several pre-existing `mysql` privilege tables. `mysqlcheck --auto-repair mysql` repaired them before the WoKim database and restricted user were created. The application schema itself passed backup and isolated restore verification afterward.
