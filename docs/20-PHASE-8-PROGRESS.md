# Local release progress

The current goal is a finished, private application running on this PC with XAMPP-compatible MariaDB and all retained/generated state on D:. Hosting choices are postponed and are not release gates.

## Verified locally on 22–23 October 2026

- API unit tests: 4 suites, 7 tests passed. Angular/Vitest: 2 files, 3 tests passed.
- All Phase 2–7 API suites passed against the D:-resident MariaDB stack, including conflicts, protected media ranges, exports, retention/reconciliation, OCR review/search, leases/deduplication, and purge-during-processing.
- All eight migrations and Phase 2–7 suites also passed on the optional D:-resident portable MySQL 8.4.13 instance.
- Private Whisper smoke produced `Well, Kim Private Memory remembers the project deadline and the next action.` from a synthetic Windows speech fixture. Warm capture-to-persist measured 15.5 seconds and peak Node working set was 480.6 MiB. A 601-second fixture was rejected without losing its original.
- Voice capture records through the browser, previews before save, retains the original, provides authenticated playback, and now offers an explicit per-capture choice between audio-only storage and audio plus queued readable transcription. Failed jobs can be retried; reviewed text remains separate from audio and machine output.
- A 20,000-task benchmark passed: Today p95 179.4 ms, search p95 58.9 ms, and text capture p95 517.7 ms. These figures characterize this PC.
- Chromium smoke passed at 1440×900, 390×844, and 844×390 with no horizontal overflow or console errors. It exercised browser recording with a synthetic microphone, stopped and previewed the clip, verified the per-capture transcription choice, then discarded the fixture. The final measured navigation loads were about 1.86 s desktop, 0.66 s portrait, and 0.60 s landscape.
- Global Capture supports optional project/task/person, received time/timezone, attachment purpose, and transcription choice. Relationships are checked transactionally and text metadata drafts persist locally.
- Projects, tasks, entries, people/teams, decisions/history, follow-ups, evidence, processing, search, trash/restore/purge, check-ins, exports, and owner/session management are available through the UI.
- Standalone lists use signed, filter-bound opaque cursors with deterministic ID tie-breakers. Unit tests cover tampering and traversal beyond former caps; the live suite traverses 105 D:-resident fixtures over three pages and verifies cleanup.
- Uploads enforce a D: high-water boundary before writing originals (95% used or less than 1 GiB projected free by default). Reads and exports remain available for recovery.
- A local backup completed in about seven seconds. Isolated restore imported SQL, verified all 20 private-file checksums, and removed its scratch database/directory. A forced failure did not overwrite the last-success timestamp.
- Verification data stayed on D:, including MariaDB, private files, model assets, portable MySQL data, fixtures, browser profiles, screenshots, reports, temporary files, and backup archives.
- Production-mode builds and lint pass. Private endpoints/readiness require authentication; CSRF, session revocation, anonymous media/export rejection, bounded uploads, and the single-active-focus invariant are covered.
- `npm audit --omit=dev` reports no high/critical issues. Two moderate records originate from the same `js-yaml` advisory through `@nestjs/swagger`; the API does not accept YAML.

## Local checklist

- [x] D:-resident XAMPP/MariaDB startup, migrations, persistence, and readiness.
- [x] API, worker, and Angular app run locally.
- [x] Desktop/portrait/landscape visual, keyboard-focus, overflow, console, and accessible-name smoke checks.
- [x] Text, image, uploaded audio, and browser voice capture preserve originals.
- [x] Per-capture audio-only versus audio-plus-transcription choice.
- [x] Private playback, processing status, retry, readable transcript, review, search, and export.
- [x] Initial load, Today/search latency, upload limits, worker memory, disk footprint, and backup duration measured.
- [x] Local update/recovery runbook, owner recovery, process restart, backup failure, and isolated restore.
- [x] Fictional screenshots, user guide, decisions, and known limits documented.
- [ ] Optional user observation: test personal recordings/languages and use real work briefly to judge transcription accuracy and capture friction.

## Feature reconciliation

| Area | Local evidence | Optional observation |
|---|---|---|
| Private access | Login/logout, password change, session revocation, CSRF, guarded API/media | None required for local startup |
| Capture/projects | Text/image/audio/voice capture, Inbox, durable originals, revisions, people/teams/projects | Personal capture-friction notes |
| Tasks/focus/Today | Lifecycle, dates, atomic focus, interruptions, check-ins | Two-device behavior if the app is later exposed to another device |
| Follow-ups/history/evidence | Follow-ups, supersession, retained sources, responsive comparisons | Real-project usability |
| Search/audio | Indexed search, timelines, authenticated range playback | Representative received audio formats |
| OCR/voice | OCR, local transcription, revisions/review/search, browser recorder | Personal language/name accuracy |
| Portability/recovery | Versioned export, retention, deletion manifest, checksum backup/restore | Copy archives elsewhere whenever the user chooses |
| Responsive quality | Desktop/portrait/landscape Chromium, focus restore, drafts, conflicts/errors | Physical-phone browser behavior if desired later |

Critical scenarios pass locally with synthetic fictional data. Representative personal audio remains an accuracy observation; it does not prevent recording, retaining, playing, or manually transcribing voice notes. No unresolved local data-loss or authentication defect is known.
