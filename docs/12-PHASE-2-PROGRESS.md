# Phase 2 progress

Updated: 22 October 2026.

## Implemented and verified

- Added the Phase 2 schema for people, teams, projects, associations, entries, revisions, attachments, activity events, durable processing-job records, and idempotency receipts.
- Added versioned people, teams, and project CRUD plus project lifecycle transitions, person/team membership, project people/team associations, and project association UI.
- Added multipart text/image/audio capture with a 20-file limit, image/audio size limits, signature allowlisting, SHA-256 integrity hashes, opaque storage keys, and immutable original files.
- Added seven-day capture command receipts. Replaying the same UUID and payload returns the original entry; reusing the UUID for different content conflicts.
- Added authenticated original delivery with private/no-store headers, safe filenames, HTTP byte ranges, thumbnail delivery, and supported original-audio playback.
- Added Inbox, global responsive capture sheet, project creation, people/team creation, project association controls, entry detail/edit/organization, attachment metadata/trash controls, preserved-source display, and image/audio presentation.
- Entry text/title edits append the prior editable representation to `entry_revisions`; the original capture remains unchanged.
- Added an owner-scoped, seven-day IndexedDB text draft with discard/unload protection.
- Added a durable lease-based inspection worker. It checks stored hashes/signatures, decodes audio duration, rejects malformed or over-ten-minute audio without deleting the original, and generates bounded WebP thumbnails for images.
- Regenerated the live OpenAPI contract and Angular API client for the new routes.

## Local data placement

WoKim no longer uses the XAMPP service's default C-drive data directory. The local development database runs from `D:\Code\5. Projects\WoKim\storage\mariadb` on loopback port 3307. Private files use `D:\Code\5. Projects\WoKim\storage\private`, and the pre-move SQL backup is also under `storage`. `infra/scripts/start-d-drive-mariadb.ps1` starts the isolated instance after a reboot.

The prior Phase 1 owner and session rows were copied to the D-drive instance and verified before the app configuration moved to port 3307. The original owner password hash was preserved after a temporary browser-test login, and the temporary API verification session was revoked.

## Verification evidence

| Check | Result |
|---|---|
| Phase 2 migration on local MariaDB | Applied; schema contains all Phase 1 and Phase 2 tables |
| Angular project creation | Passed in the in-app browser at phone layout |
| Text capture and organization | Passed; Inbox capture was linked to a project and marked organized |
| Revision/source distinction | Passed; one revision exists and the original text remains visibly unchanged |
| Multipart image capture replay | Passed; two identical requests returned one entry and one attachment |
| Protected image range | Passed; `bytes=0-7` returned 206 and 8 bytes |
| Browser image rendering | Passed; authenticated 1×1 PNG loaded with its expected natural dimensions |
| Worker success/failure paths | Passed; PNG thumbnails became ready, malformed WAV failed inspection, and its original remained readable |
| Upload boundary integration | Passed; invalid signature 415, oversized image 413, duplicate filenames retained independently |
| Organization associations | Passed; person/team/project links persist and stale association mutation returns 412 |
| Private audio range | Passed; authenticated `bytes=0-7` returned 206/8 bytes and anonymous access returned 401 |
| API restart persistence | Passed; saved organized entry and source reloaded after restart |
| Lint, unit tests, production build | Passed after the final path/synchronization fixes: 3 Nest suites / 4 tests, 2 Angular files / 3 tests |

## Phase status

Phase 2 is complete against its local exit criteria. OCR, transcription, and browser recording have not been claimed; those remain Phase 7 gates and still require representative user audio samples from Phase 0.
