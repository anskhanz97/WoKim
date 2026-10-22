# Scope of work

## Outcomes

- Capture ordinary text or an existing screenshot in about ten seconds, excluding transfer time and optional organization.
- Recover the current requirement, its source, and the next action for an old task in under a minute in a representative usability exercise.
- Save content before OCR/transcription; processing failure must not lose a capture.
- Access the same saved records from laptop and phone.
- Restore records and originals to a clean installation from a backup.

These are acceptance targets to validate, not performance claims already achieved.

## Feature inventory

| ID | Feature | Required behavior | Release |
|---|---|---|---|
| F01 | Private access | One owner; login/logout, session expiry/revocation, password change and operator recovery | R0 |
| F02 | Capture inbox | Text, image, and audio-file capture; optional project/task/person/date; unprocessed/organized/dismissed states | R0 |
| F03 | Projects | Create/edit/archive/restore; overview, task list, history, decisions, evidence, people/teams | R0 |
| F04 | Tasks | Bug/feature/change/testing/integration/investigation/chore; status, priority, optional deadline, requester, branch/PR/source links | R0 |
| F05 | Pause/resume | Explicit start/switch/pause/finish, optional checkpoint, interruption chain, one active task | R0 |
| F06 | Today | Four-question guided check-in, prefilled live data, dated daily snapshot, saved intended outcomes | R0 |
| F07 | Follow-ups | Questions/requests to people, waiting/answered/cancelled, follow-up date and resolution | R0 |
| F08 | People and teams | Contacts and project associations without invitations or messaging | R0 |
| F09 | Source and decision history | Original text/files, editable working notes with revisions, linked instruction changes, explicit supersession | R0 |
| F10 | UI evidence | Before/after/reference grouping, captions and viewport labels, side-by-side viewing | R0 |
| F11 | Search and dates | Search tasks/notes/contacts; filters; chronological views with date/week/month ranges | R0 |
| F12 | Audio library | Upload received messages; original playback/download, sender/received date/source metadata | R0 |
| F13 | OCR | Explicit opt-in per image or instruction-image batch; original retained; extracted text searchable | R1 |
| F14 | Voice recording/transcription | Record own voice, transcribe uploaded/recorded audio, retry, review/correct, search timestamps | R1 |
| F15 | Portability and recovery | Human-readable and machine-readable export with originals; automated backup and tested restore | R0 |
| F16 | Responsive quality | Keyboard and touch workflows, drafts/save status, useful error/empty/loading states | R0, hardened R1 |

## Domain rules

### Capture and source records

A capture becomes an `entry`; it can remain an unassigned note or be linked to a project/task. Turning it into a task creates a linked task while preserving the entry and files. Repeating the conversion returns the existing task rather than duplicating it.

An entry has a type: note, instruction, decision, question, work_update, checkpoint, or reference. Audio/image is an attachment format, not an entry type. An attachment independently has a purpose: instruction, evidence_before, evidence_after, or reference.

The captured original text and original file bytes are preserved until an explicit permanent deletion. Editable notes, OCR, transcripts, and summaries are separate representations. This is a source record, not a claim of legally certified provenance.

### Tasks and focus

Task statuses: ready, in_progress, paused, waiting, done, cancelled. No mandatory deadline or requester. Optional priority: low/normal/high/urgent, default normal. Priority is not inferred from a deadline.

- Only an explicit start/resume command starts focus; editing a check-in does not.
- Only one task can be in_progress; it must correspond to the singleton active focus pointer.
- Switching A to B atomically pauses A, closes its focus session, starts B, and records the interruption.
- A checkpoint is optional; an empty checkpoint must not prevent switching.
- Waiting describes external blockage. A waiting task may be resumed with an explicit action; unresolved follow-ups remain visible.
- Finishing the active task closes focus. It offers earlier paused work without automatically starting it.
- Reopen a done/cancelled task to ready. It does not automatically become active.
- Starting a done/cancelled task or work on an archived/completed project is rejected until explicitly reopened/restored/reactivated.
- Historical sessions describe recorded work periods, not precise billable time tracking.

### Decisions and conflicting instructions

Supersession is explicit and applies within one project. Do not silently overwrite an earlier instruction. Allow several earlier instructions to be replaced by one new decision. For initial release, an earlier entry has at most one direct successor; reject cycles. A replacement decision can itself be superseded later. Flag conflicting requirements for the user; do not use AI to select an authoritative instruction.

### Dates

Distinguish captured time, event/received time, target date, and follow-up date. Preserve a date-only deadline as a calendar date, not midnight UTC. Optional exact deadlines include a timezone and instant. “Next Friday” must be confirmed as an explicit date. Daily records use the user's selected local date; timezone changes do not rewrite older snapshots.

### Archive, trash, and deletion

Archive removes a project from default active lists but retains search/history and allows restoration. Archive/complete is rejected while its task is active; unresolved work is shown before confirmation. Trashed entries/tasks are recoverable for 30 days by proposed default. Trashing an active task closes its session with reason cancel, sets status cancelled, and clears focus atomically; restoring a trashed task returns it to ready without resuming. Their references remain readable as tombstones during retention. Purging a task is blocked while entries, follow-ups, evidence, sessions, or daily references still depend on it; offer archive/cancel instead. Permanent entry/file deletion explicitly warns about source loss, removes derived text/search results, cancels jobs, and queues physical file cleanup.

Users cannot purge an instruction participating in a supersession chain without explicitly unlinking/replacing its relationships. Backups may retain deleted content until their retention window expires; show that policy in data settings.

### Today

Live sections calculate current focus, paused tasks, near task deadlines/project target dates, and outstanding follow-ups. A daily check-in stores the user's intentions and a snapshot of selected items. Date/status edits happen through explicit linked actions, not through an ambiguous free-text answer. Suggested near-deadline window: today through seven days, configurable later. Overdue items appear separately and are not excluded by that forward window.

## Explicitly deferred

R2 candidates: reviewed daily/weekly AI summaries, natural-language search, annotation/comparison sliders, browser extension, Slack/GitHub ingestion, outbound messaging, push/email reminders, detailed dependency scheduling, tags, recurring tasks, rich text, dark theme, and offline edits/synchronization.

Out of R1: live team chat, public signup, shared workspaces, billing, native mobile apps, full meeting recording/diarization, automatic desktop monitoring, and replacing team project-management systems. Date-range history is required; a full calendar/Gantt scheduler is not.

## Critical acceptance scenarios

1. Paste a screenshot without choosing a project; it persists in Inbox and is later attached to a task without duplicating bytes.
2. Switch A → B → C. Complete C and resume A directly; the history still correctly records both interruptions.
3. Send simultaneous switch commands from phone/laptop; one wins and the stale command receives a conflict, never two active tasks.
4. Replace an old requirement; both source entries survive and the current direction is clear.
5. Upload a five-minute message, leave the page, and return to its transcript; failed processing still leaves playable original audio.
6. Correct an OCR/transcription error; the machine output and original remain accessible and search uses the reviewed text.
7. Save today's intended work; no work session starts until Start/Resume is chosen.
8. Restart/redeploy the server; database records and attachments survive.
9. Restore an isolated clean installation and open a task, screenshot, and audio file from that restore.
10. An unauthenticated request cannot fetch any original, thumbnail, transcript, export, or private search result.
