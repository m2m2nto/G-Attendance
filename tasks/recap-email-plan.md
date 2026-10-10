# Implementation Plan: Vacation & Sick Leave Recap Email

**Created:** 2026-10-10
**Spec:** `SPEC-recap-email.md` (approved 2026-10-10)
**Task list:** `tasks/recap-email-todo.md`. These files sit alongside the April test-suite plan (`tasks/plan.md` / `tasks/todo.md`), which is still open and stays untouched.

## Overview

The team lead clicks one button to get a ready-to-paste Italian recap for each team member: last year's leftover credit, days accrued this year, days used, days remaining, and sick days. The text is built from a template set in Settings, and members can be excluded there. A reminder runs on a rolling schedule (every N months after the last "Mark as sent"). It shows as a banner inside the app, a Dock badge and a macOS notification. The badge keeps working after the window is closed, because the app stays alive in the Dock. All state lives in `app_settings.json`; `attendance.xlsx` is never written.

## Architecture Decisions

- **New `services/recap_service.py`.** It holds rendering, Italian formatting, settings defaults and due-date logic. It reads data only through `excel_service` (`compute_balance`, `get_leave`, `_get_summary_members`, `_load_settings`/`_save_settings`). This keeps the large `excel_service.py` untouched apart from imports.
- **Functions take `today` as a parameter** (`render_recaps(year, today)`, `get_status(today)`), so tests can pin dates without mocking `datetime`.
- **Rendering uses `str.format_map` with a dict that returns `{key}` for unknown keys.** Unknown placeholders survive and stray braces don't crash. For a literal `{…}` that is malformed (e.g. a lone `{`), `ValueError` is caught and the raw template is returned, with a warning field in the response.
- **Month arithmetic is hand-rolled** (`add_months(d, n)`, clamped to month end with `calendar.monthrange`). No `dateutil` dependency.
- **The vacation/sick detail line uses `dates_detail` as stored** (e.g. `"11, 12"` day numbers): `- Marzo: 2 giorni (11, 12)`. This is a small departure from the spec's `dd/mm` example, because reformatting free-text cells is fragile. The month names live in the new service (correct Italian), not in `excel_service`'s list, which has the `"Setembre"` typo.
- **Recap-dialog state lives in `App.jsx`**, so the Team Overview button, the reminder banner and the Electron notification all open the same dialog. `RecapReminderBanner` is mounted in `Layout.jsx` next to `UpdateBanner` (the current banner location), with `onOpenRecap` passed down.
- **The recap settings UI is its own component, `RecapSettings.jsx`**, rendered inside `SettingsPage.jsx`, which is already 522 lines. This follows the file-per-component convention.
- **Electron main polls Flask** (`GET /api/recap/status`) at startup and every hour, plus on `recap:refresh` IPC. Flask stays the single source of truth, and main holds no reminder state except a "last notified day" kept in memory.
- **Lifecycle:** on darwin, `window-all-closed` stops quitting and `activate` re-creates the window. `before-quit` already kills Flask. The updater calls `app.quit()` explicitly (`electron/updater.js:296`), which is unaffected.

## Dependency Graph

```
T1 recap_service (render + format + settings + exclusions)
 └─ T2 API: /api/recap, /settings  + client.js
     ├─ T3 RecapSettings UI
     └─ T4 RecapDialog + Team Overview button (Copy)
         └─ T5 due logic + /status + /sent + "Mark as sent"
             └─ T6 in-app reminder banner
T7 Electron stay-alive lifecycle   (independent; can run in parallel with T1–T6)
 └─ T8 Dock badge + notification + IPC   (needs T5 + T7)
     └─ T9 Docs sync (SPEC.md, CLAUDE.md) + final pass
```

## Task List

### Phase 1: Recap (spec part A)
- [x] T1: Recap service — rendering, Italian formatting, settings, exclusions
- [x] T2: Recap API — list + settings endpoints, client helpers
- [x] T3: Settings → "Recap email" section
- [x] T4: Recap dialog with Copy, opened from Team Overview

### Checkpoint A
- [x] `pytest` green; `npm run build` clean
- [x] Recaps copied from the dialog match the Vacation/Sick Leave pages; exclusions work
- [ ] Human review

### Phase 2: Reminder in-app (spec part B)
- [ ] T5: Due-date logic, status/sent endpoints, "Mark as sent"
- [ ] T6: In-app reminder banner

### Checkpoint B
- [ ] `pytest` green; banner shows/hides correctly from the JSON state

### Phase 3: Reminder outside the window (spec part B)
- [ ] T7: Electron — stay alive in the Dock when the window closes
- [ ] T8: Electron — Dock badge, daily notification, IPC

### Checkpoint C
- [ ] Full manual test plan from the spec (steps 1–7) passes in `npm run electron:dev`

### Phase 4: Wrap-up
- [ ] T9: Sync SPEC.md / CLAUDE.md, final verification

### Checkpoint: Complete
- [ ] All spec success criteria ticked
- [ ] Ready for commit → push → release (`.zip` only), per guardrails

## Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Stay-alive lifecycle leaves an orphaned Flask process, or breaks the auto-update restart | High | T7 is isolated with an explicit manual check (Cmd+Q → `lsof -i :5001` empty; update-apply relaunches). It can be built early to fail fast. |
| A user template with stray `{` crashes rendering | Med | Safe `format_map` + caught `ValueError`; unit test |
| Recap numbers drift from the app's numbers | Med | Recap reuses `compute_balance`; a test asserts equality per fixture member |
| `compute_balance` per member is slow (reopens the workbook several times) | Low | 5 members only; acceptable. Measure in T2; no caching unless it's noticeably slow |
| Clipboard API unavailable in the Electron renderer | Low | `navigator.clipboard` works on the `http://localhost` origin; fall back to `document.execCommand("copy")` only if the manual check fails |
| macOS notification permission denied | Low | Badge + banner still work; the notification is best-effort |
| Line breaks lost when pasting into Outlook | Low | Plain-text `\n` body; covered by manual step 2 |

## Open Questions

None blocking. The spec's open questions were resolved on 2026-10-10.
