# WoKim — implementation plan

Planning baseline: 22 October 2026. Status: Phase 0 and Phase 1 implementation in progress.

This is a build specification for a private, responsive developer work-memory application. The confirmed stack is Angular, Node.js, NestJS, and MySQL. The working product description is not a final brand name.

## Read in this order

| Document | Purpose |
|---|---|
| [PRODUCT.md](PRODUCT.md) | Confirmed product truth, user, constraints, and assumptions |
| [01-SCOPE.md](01-SCOPE.md) | Features, release boundaries, business rules, and acceptance criteria |
| [02-PAGES-AND-WORKFLOWS.md](02-PAGES-AND-WORKFLOWS.md) | Page inventory, navigation, key journeys, and failure states |
| [03-DATABASE.md](03-DATABASE.md) | MySQL tables, relationships, indexes, and transaction invariants |
| [04-BACKEND.md](04-BACKEND.md) | NestJS modules, authentication, storage, processing, and search |
| [05-API.md](05-API.md) | API routes, payload conventions, commands, errors, and contract examples |
| [06-FRONTEND.md](06-FRONTEND.md) | Angular structure, state, responsive interaction, accessibility, and performance |
| [07-DEVELOPMENT-PLAN.md](07-DEVELOPMENT-PLAN.md) | Ordered phases, dependencies, deliverables, and verification gates |
| [08-OPERATIONS-AND-QUALITY.md](08-OPERATIONS-AND-QUALITY.md) | Hosting topology, data protection, backups, testing, and release procedure |
| [09-DECISIONS-AND-RISKS.md](09-DECISIONS-AND-RISKS.md) | Decisions, assumptions, validation experiments, and technical sources |
| [10-PHASE-0-BASELINE.md](10-PHASE-0-BASELINE.md) | Validated versions, conventions, hosting proposal, and open processing gates |
| [11-PHASE-1-IMPLEMENTATION.md](11-PHASE-1-IMPLEMENTATION.md) | Implemented foundation, verification results, and live-environment checks still pending |

## How to execute this package

1. Complete Phase 0 in the development plan. Pin compatible framework versions and choose a host/transcription configuration using the prescribed experiments.
2. Build each phase as an end-to-end usable slice. Follow its acceptance criteria before moving on.
3. Keep the schema, API contract, and client aligned in the same change. Generate OpenAPI and the Angular API client during implementation; the Markdown API is the initial contract intent, not an executable specification.
4. Add actual migration filenames, test results, deployed configuration, and decision outcomes as work progresses.
5. Treat source preservation, mobile usability, authenticated attachments, atomic task switching, and verified restore as release requirements.

## Authority and change control

User-confirmed choices outrank proposed defaults. PRODUCT owns purpose and confirmed constraints; scope owns release boundaries; database owns stored fields and invariants; API owns wire behavior; page/frontend documents own interaction. Resolve contradictions explicitly instead of implementing two interpretations.

“Proposed default” means a concrete starting point chosen under the user's permission to plan the details. “Validation gate” means a measurable decision that must be resolved before the affected feature ships. It does not block unrelated phases.

## Release map

- **R0 — personal alpha:** secure capture, projects, tasks, Today, pause/resume, people/teams, follow-ups, source history, screenshots, basic audio upload/playback, evidence comparison, search, exports, and restore.
- **R1 — target personal release:** R0 plus browser voice recording, OCR, background transcription, transcript review/search, and hosted hardening. This is the full initial product promised by this plan.
- **R2 — optional expansion:** reviewed AI summaries, improved comparisons, integrations, and other features justified by real use. Not required to complete R1.

R0 is a usable milestone, not a substitute for delivering the agreed voice and OCR features in R1.

## Implementation repository layout

```text
apps/web/                 Angular application
apps/api/                 NestJS HTTP application and worker entry point
packages/api-client/      generated Angular client; no database entities
docs/                    this planning package and subsequent decisions
infra/                   Dockerfiles, Compose, proxy, backup/restore scripts
tests/e2e/               cross-application user journeys
```

Use npm workspaces and one lockfile initially. Do not add a monorepo framework merely to create these folders. Move this package into `docs/` when scaffolding the actual repository; retain PRODUCT.md at that repository's root as the product record.
