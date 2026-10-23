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
- Angular local proxy routing, explicit migrations before API startup, D:-resident SQL/private-file storage, and backup/checksum scripts.
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

## Later local checks

The local Phase 1 exit criteria pass. Later slices completed or retained these checks:

1. Completed: local process restart and D:-resident database/file persistence pass.
2. Completed: all migrations and Phase 2–7 suites passed on checksum-verified portable MySQL 8.4.13.
3. Completed: SQL plus all 20 private-file checksums passed an isolated local restore.
4. Completed with synthetic OCR/audio for latency, memory, duration limits, and preservation. Personal recordings remain an optional accuracy observation.
5. The same lint, test, and build commands used by CI pass locally.

Phase 1 is complete for the local XAMPP target, and later phases verified the full local workflow.

During setup, MariaDB reported corruption in several pre-existing `mysql` privilege tables. `mysqlcheck --auto-repair mysql` repaired them before the WoKim database and restricted user were created. The application schema itself passed backup and isolated restore verification afterward.
