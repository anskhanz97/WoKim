# WoKim interface direction

## Working ledger

WoKim is an operating surface for a developer moving between projects. Its visual language borrows from a well-kept engineering notebook: ruled structure, compact annotations, clear changes of state, and one visible thread showing the work currently in hand.

## Tokens

- Paper: `#F4F6F8` — application ground.
- Sheet: `#FFFFFF` — focused reading and editing surfaces.
- Ink: `#172033` — primary text and navigation.
- Slate: `#667085` — secondary metadata.
- Cobalt: `#3155D9` — active focus, links, primary actions.
- Amber: `#E59A17` — interrupted work and pending attention.
- Rule: `#D9DEE8` — meaningful divisions and input boundaries.

IBM Plex Sans carries the interface because its humanist shapes remain readable at workbench density. IBM Plex Mono is reserved for branch names, timestamps, source labels, and technical fragments; it is never used as decorative “developer” texture.

## Layout

Desktop uses a narrow navigation rail, a centered working column, and an optional context column. Mobile becomes one column with bottom navigation and a full-height capture sheet.

```text
desktop                              phone
┌────────┬────────────────┬───────┐  ┌────────────────┐
│ WoKim  │ current thread │context│  │ current thread │
│ Today  ├────────────────┤       │  ├────────────────┤
│ Inbox  │ work / history │       │  │ work / history │
│Projects│                │       │  ├────────────────┤
└────────┴────────────────┴───────┘  │ Today  +  Inbox │
                                     └────────────────┘
```

Content is left-aligned. Long notes stay under 76 characters per line. Borders encode grouping and state; shadows are rare. Rounded corners vary by function: small on controls, larger only on temporary sheets/dialogs.

## Signature

The memorable element is the current thread: a cobalt rule connects the active task, its next action, and its latest checkpoint. When work is interrupted, the rule changes to amber and ends at the saved resume point. Motion is limited to the thread changing state after a user action.

## Principles

1. Source before interpretation: originals are easy to find beside reviewed text.
2. Density with calm: compact rows, strong hierarchy, generous reading space.
3. State is written plainly: color reinforces labels; it never carries meaning alone.
4. Capture stays available without covering the work.
5. Empty and failed states give the next useful action.

## Review against the brief

The design avoids a generic grid of identical dashboard cards. The notebook influence is structural rather than nostalgic decoration, and the cobalt/amber thread directly represents WoKim's pause-and-resume mechanism. The visual ambition is concentrated in that thread while forms and histories remain quiet and fast.
