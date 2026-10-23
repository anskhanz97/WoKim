# WoKim product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Confirmed by user: WoKim uses an Angular frontend, Node.js + NestJS backend, and a local XAMPP-compatible database. The current target is the user's PC; hosting is deliberately outside this build.

## Users

Initially one developer managing work across multiple teams, people, and projects. Teammates are contact records, not invited accounts. Later, other developers may operate separate private installations. A shared multi-user service is not part of the initial release.

## Product purpose

Capture incoming work and its source, preserve requirements and decisions, understand current commitments, and resume interrupted work without reconstructing context from scattered conversations.

## Positioning

A personal work memory whose distinguishing workflow connects source evidence to tasks, requirement history, interruption checkpoints, and returning to unfinished work. It must work without changing how the user's teams communicate.

## Operating context

Work arrives in meetings, typed notes, Slack or other DMs/channels, screenshots, and received voice messages usually lasting three to five minutes. Projects can return with new requirements after the developer has moved on. The user also wants short personal voice dictation. Screenshots may contain instructions or serve as before/after UI evidence.

## Capabilities and constraints

- One quick capture inbox accepts text, images, and audio; organization can follow capture.
- Keep original screenshots/audio alongside extracted or reviewed text.
- Today both asks and helps answer: current work, interrupted work, upcoming deadlines, and unanswered questions.
- Separate projects, tasks, people/teams, decisions, and work checkpoints while keeping them connected.
- Mobile usability, fast loading, persistent data, and low administrative effort are priorities.
- Run privately on the local PC with authentication, D:-resident durable storage, and restorable local backups.
- No dependency on paid AI services for core operation.
- The implementation is active and verified locally; this package now records the running-PC target.

## Evidence on hand

The user's workflow description and accepted product/stack choices in the planning conversation. No real client messages, screenshots, recordings, branding, or production benchmarks have been supplied. Use clearly fictional development fixtures; do not fabricate real customer evidence.

## Product principles

1. Capture with minimal required metadata.
2. Preserve sources; label derived text and proposed interpretations.
3. Make interrupted work easy to resume.
4. Reuse existing data rather than demand repeated daily entry.
5. Keep personal ownership, export, and recovery practical.

## Proposed defaults and open facts

- Default single-owner installation with no public signup; chosen for the personal-use scope.
- English interface initially; user timezone is configurable, with Asia/Karachi suggested only during this user's setup.
- Plain text notes with safe link rendering initially; rich text is optional future work.
- Transcription languages and representative sample audio remain user-selectable.
- Visual branding remains open. Functional screen specifications are planned; a final visual identity is not claimed to be approved.
- Accessibility target proposed: WCAG 2.2 AA for core journeys.
