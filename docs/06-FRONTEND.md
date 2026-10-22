# Angular frontend plan

## Application structure

Use the supported stable Angular release selected in Phase 0, standalone components, lazy feature routes, TypeScript strict mode, reactive forms, and Angular HttpClient. Default to the Angular CLI's maintained builder/test configuration; do not introduce a custom build pipeline without need.

```text
apps/web/src/app/
  core/                 auth/session, HTTP configuration, error handling, clock
  shell/                desktop/mobile navigation, capture entry point, focus strip
  shared/               small reusable controls, date/source/media presenters
  features/
    today/ inbox/ projects/ tasks/ entries/ people/
    search/ evidence/ settings/ auth/
  app.routes.ts
```

Use generated API types/client from the committed OpenAPI contract. Do not import TypeORM entities into browser code. Keep request state local to a feature unless it is actually shared.

## State and server synchronization

- Signals for local/view state and the small shared session/focus stores; RxJS for HTTP streams, cancellation, and search debouncing.
- Reactive forms for validation and dirty-state tracking. No global state library initially.
- Focus store contains server snapshot/focusVersion, never a guessed active task. Commands replace the snapshot from the response.
- Invalidate/refetch Today, relevant task details, and project summary after a successful domain change.
- Refetch focus/Today on tab visibility and window focus. While visible, poll focus every 15 seconds; poll active job details every 3 seconds with backoff on failure. Pause polling when hidden/offline.
- Backend conflict is authoritative. On 409/412, preserve the user's draft and present current server state plus retry/review choices. Never silently overwrite another device's update.
- Retry reads safely. Mutation retries occur only with established idempotency keys; do not let a global interceptor blindly retry POST.
- Authentication expiry preserves unsaved text locally where allowed, then asks for login. Do not erase it during an unexpected 401; deliberate logout clears drafts/caches.

Server responses are authoritative for saves and work transitions. Pure visual selection/filtering can be optimistic. No websockets are needed for R1.

## Forms and reusable components

Build only reusable components actually shared by these pages:

- Capture editor: text, files, voice, optional metadata, clear save/processing status.
- Project/person/task pickers with search and current-selection labels.
- Task row/card with status, requester, deadline and explicit Start/Resume.
- Source card with original text/media and received/captured distinction.
- Focus switch sheet with optional checkpoint/next action.
- Four-question check-in with live suggestions and dated save.
- Timeline entry/event presenter and supersession chain.
- Transcript editor with original output and recording access.
- Evidence comparison group with before/after labels.
- Empty/error/retry state and accessible confirmation dialog.

Use Angular CDK primitives where they remove accessibility/interaction work, such as overlays, focus trapping, and dialog behavior. Select a maintained compatible component approach in Phase 0; avoid importing an entire visual suite just for one control. Reusable form fields need labels, descriptions, error connections, and keyboard behavior from the start.

## Drafts and recording

Text/check-in drafts may be stored in IndexedDB on this device under the owner/session namespace; proposed expiry seven days. Display “Draft on this device” distinctly from “Saved to server.” Restore only after authenticating the same owner. Clear on explicit logout and provide Clear local drafts in Settings. Store no credentials/session tokens in this store.

Selected files and audio blobs remain in memory initially; no promise of recovery after refresh/browser closure. Warn before navigating away from an unsaved recording. Save/upload immediately after stopping recording, with user-visible consent/action. Keep a file-picker fallback when microphone/clipboard permissions fail.

Use MediaRecorder only after permission is granted. Detect a supported MIME type at runtime; never assume every browser emits WebM. Recording interface: permission explanation, start, elapsed time, stop, playback preview, save/discard, and size/duration limit. Pause/resume recording is optional R2. Server inspection determines actual format/duration.

## Responsive behavior

Proposed test widths: 360, 390, 768, 1024, and 1440 CSS pixels. Also test 320px reflow/200% zoom. Breakpoints respond to content, not device names.

- Desktop: navigation rail/sidebar, readable main column, optional contextual detail pane.
- Tablet: collapse secondary pane; retain the main task and capture actions.
- Phone: bottom primary navigation, single content column, full-height capture/task-switch sheet, sticky action only when it does not obstruct content or keyboard.
- Convert dense task tables into structured rows/cards with visible priority/status/date; do not hide necessary information behind hover.
- Evidence becomes stacked labeled images; zoom is explicit. Audio controls and transcript remain usable independently.
- Long task names, filenames, code fragments, and unbroken URLs must not force page-wide horizontal scrolling.

## Accessibility and interaction quality

Target WCAG 2.2 AA for core journeys. Logical heading/landmark hierarchy, visible focus, no keyboard traps outside managed dialogs, focus restoration to the invoking control, text alternatives/captions, status conveyed through text/icons as well as color, and reduced-motion support.

Use at least 44px touch targets for main actions as a design target. Provide complete click/tap/keyboard alternatives to drag/reorder. Do not trigger actions solely from hover. Ctrl/Cmd+K may open capture when focus is not in an editable field; include a visible alternative. Esc closes overlays only after unsaved-content handling.

Associate validation errors with fields and move attention to a useful error summary on failed form submission. Processing updates use polite announcements; do not announce every polling response. Native playback controls are a valid initial choice.

## Visual direction boundary

This package establishes an **Operate** surface: fast scanning, clear source provenance, and uninterrupted capture/resume. It does not claim an approved brand identity or final comps. Before UI implementation, select typography, palette, spacing/density, and component treatment as one coherent direction; save those decisions in DESIGN.md in the implementation repository.

Preserve these functional priorities across any visual direction: one obvious Capture action, current work visible, clear live-vs-historical data, source originals easy to open, restrained alerts, and whitespace that supports reading rather than creating oversized dashboard cards. Use representative project/task/source content during design; do not design around empty placeholder cards.

## Performance targets and handling

- Lazy-load noninitial feature routes, recording UI, transcript review, and evidence views.
- OCR/transcription stays off the main browser thread; initial implementation processes on the server worker.
- Thumbnails for lists, original images on demand, paginated histories, stable track keys.
- Debounce/cancel search; retain filters in URL parameters.
- Proposed initial application JS budget: 350 KiB gzip, excluding lazy features; establish actual CLI budgets after first shell build.
- Target LCP <= 2.5s and no major layout jumps on a representative midrange phone/network profile; record the profile and measurements rather than imply a universal guarantee.
- Never cache private media through a service worker in R1. Responsive online use is required; full offline operation and background sync are deferred.

## Frontend acceptance

Validate capture, switch/resume, Today save, source inspection, voice upload/playback, transcript review, and evidence comparison on desktop and mobile. Exercise expired session, interrupted network, denied microphone permission, unsupported recording format, stale edit, long content, empty project, failed processing, and unavailable derivative. Screenshots alone do not prove working interactions.
