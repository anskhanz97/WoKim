# Pages and workflows

## Navigation

Desktop: primary navigation for Today, Inbox, Projects, Search; secondary People & Teams and Settings. A current-focus strip and Capture action stay available. Mobile: Today, Inbox, Projects, Search in bottom navigation; Capture reachable above it; People/Settings in More. Focus details open on demand rather than consume the small viewport.

The four primary destinations reflect user jobs, not internal database modules. Do not create a separate top-level page for every record type.

## Page inventory

| Route | Purpose and required content | Primary actions |
|---|---|---|
| `/login` | Owner login; clear invalid/expired-session feedback | Login |
| `/today` | Current focus, four-question check-in, paused work, due work, outstanding follow-ups | Capture; start/switch/resume; save check-in |
| `/inbox` | Unorganized captures, format/source preview, processing state | Organize; create/link task; dismiss; trash |
| `/projects` | Active/archived switch, name search, project summary | Create; open; restore |
| `/projects/:id/overview` | Last checkpoint, current tasks, open questions, recent changes, people, deadline | Resume; add task; capture instruction |
| `/projects/:id/tasks` | List grouped/filterable by status/type/priority/due date | Create; filter; open task |
| `/projects/:id/history` | Chronological entries and system events; date/week/month range filter | Add entry; inspect original |
| `/projects/:id/decisions` | Instructions/decisions, superseded indicator, replacement chain | Record decision; replace instruction |
| `/projects/:id/evidence` | Before/after sets linked to tasks with labels | Add set; compare |
| `/projects/:id/people` | Project contacts and associated teams | Associate contact/team; edit role |
| `/tasks/:id` | Description, status, requester, dates, next action, sessions, sources, follow-ups, evidence | Start/switch; pause; finish; reopen |
| `/entries/:id` | Current note, preserved source, attachments, revisions, OCR/transcript review, related tasks | Edit; organize; convert/link; supersede |
| `/search` | Query, type/project/person/status/date filters, source-linked results | Search; open result |
| `/people` | Contacts/teams tabs; project associations; outstanding questions by person | Create/edit/archive |
| `/people/:id` | Contact context, associated teams/projects, related captures/follow-ups | Add follow-up; open linked work |
| `/settings/profile` | Name, timezone, password, active sessions | Save; revoke sessions |
| `/settings/processing` | Installed OCR/transcription options, language defaults, availability | Configure; test sample |
| `/settings/data` | Storage use, exports, trash, backup age, retention policy | Export; restore trashed item; purge |
| `/check-ins/:date` | Past daily snapshot and editable personal reflection | Review; save reflection |

No public signup or password-reset email flow initially. An operator reset command provides recovery. Server backup restoration is an operator workflow, not a database-upload button in the public web app.

## Global capture interaction

Desktop dialog / mobile full-height sheet with modes Text, Image/File, and Voice. Always preserve unsaved input when moving between modes. Required content: nonempty text OR a completed attachment. All metadata optional.

1. Type/paste/select file or record audio.
2. Optionally choose project/task, person, received date, and attachment purpose.
3. Save durable entry and original; acknowledge success with entry link.
4. Optionally request OCR/transcription; show pending/running/failed/review-needed states.

Clipboard image paste is a convenience; file selection always remains available. Received audio is manually selected from files saved by the user, not silently retrieved from a messaging platform. If file access is unavailable, save a note and source link without pretending the audio was imported.

On failed upload, keep text and the selected file/recording in the open editor while the page remains alive. Warn before leaving an unsaved recording. Do not claim a selected file has survived a refresh; browser memory does not guarantee that. No “Saved” indicator before server acknowledgement.

## Task interruption journey

1. Active A → choose B → Switch sheet displays A, B, optional checkpoint and next action.
2. Submit with the latest focus version and unique command key.
3. Server commits switch; UI updates focus, statuses, timeline, and paused list together.
4. If another device already changed focus, show the current server task and let the user make a fresh choice; never silently replay.
5. Finish B → completion confirmation with optional “Resume A” action. Dismissal leaves no active task.

The interrupted list is not a rigid stack. Users can resume any eligible paused task. Historical interruption edges are preserved even when they choose a different return order.

## Today check-in

First visit: brief explanation and four prompts, even with no tasks. Existing data prefills the answers; empty sections offer Capture/Create rather than invented sample tasks.

- Current work: selected task + today's intended outcome + explicit Start action.
- Interrupted work: paused list + checkpoint shortcuts.
- Due soon: actual deadlines + deliberate task edits; no automatic deadline reassignment.
- Waiting on: unresolved follow-ups + explicit resolve/reschedule actions.

Save one check-in per local calendar date; repeat edits update that day's answer. Selected item labels/statuses/dates are snapshotted at save; linked actions use current records. Historical page clearly distinguishes “as saved then” from “current state.” Unsaved daily text is autosaved as a draft; final check-in save is explicit.

## Requirement change journey

Open old instruction → Record replacement → enter/link new instruction or decision → verify same project and intended earlier items → commit. Old content displays “Superseded by …” rather than disappearing. The new record lists what it replaces. Reject circular chains with a helpful error.

## Screenshot evidence journey

Create an evidence set under a task. Choose an existing attachment or upload a new reference entry. Assign before/after/reference position, caption, capture date, and optional viewport/device label. Allow multiple images on either side and incomplete sets. Desktop comparison is side by side; mobile stacks matching items with explicit Before/After labels. Originals open at readable resolution on request. No mandatory OCR for evidence.

## Voice and transcript journey

Received file → source metadata → upload acknowledgement → playback available → request transcription → leave page safely → return to review. Own dictation uses the same storage/processing path after recording.

Transcript review shows machine output, editable reviewed text, language setting, and timestamp links where the engine supplies segments. Corrections do not change audio or machine output. Word-level synchronization is not required. Failed/unsupported files show an actionable reason and retain the original.

## Shared state requirements

Every data surface specifies loading skeleton, empty explanation, retryable failure, permission/session expiry, stale-edit conflict, and success feedback. Long text wraps; attachments have size/duration; archived references remain recognizable. Error messages distinguish unsaved changes from failed background processing.

No optimistic task switching or optimistic capture-save acknowledgement. List filters can update immediately; destructive actions require a clear confirmation and expose recoverable trash where appropriate. Restore and retry are visible actions, not hidden menu-only controls.

## Content and layout ranges

Validate with 0/1/50 projects; 0/1/500 tasks per project; 20,000 total searchable records; 20 images on an entry; 10-minute/50-MiB supported audio; long filenames and names; multi-paragraph text and code-like fragments. These are test fixtures and proposed limits, not production scale claims.

Functional layout is specified here. Final typography, color identity, and detailed visual composition are decided before the first UI implementation, without reopening these workflows.
