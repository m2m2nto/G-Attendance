# Todo — Recap Email

> See `tasks/recap-email-plan.md` for context and the dependency graph, and `SPEC-recap-email.md` for requirements.

## Phase 1 — Recap (part A)

### T1: Recap service — rendering, Italian formatting, settings, exclusions
**Description:** Create `services/recap_service.py`. It holds the default Italian subject/body, the placeholder list, settings getters/setters (`recap_subject_template`, `recap_body_template`, `recap_frequency_months`, `recap_excluded_members`), `format_it(number)`, and `render_recaps(year, today)`, which returns one `{name, subject, body, data}` per active, non-excluded member.

**Acceptance criteria:**
- [x] `format_it(2.5)=="2,5"`, `format_it(26.0)=="26"`, `format_it(0)=="0"`
- [x] Every placeholder is replaced; an unknown `{foo}` stays intact; a lone `{` doesn't crash; empty months render the "Nessuna…/Nessun…" lines
- [x] `data` numbers equal `compute_balance(name, year)`; excluded and stale names are handled (an excluded member is absent, an unknown name is ignored)

**Verification:**
- [x] `pytest tests/test_recap_service.py -v` passes; full `pytest` still green

**Dependencies:** None
**Files:** `services/recap_service.py` (new), `tests/test_recap_service.py` (new)
**Scope:** S

### T2: Recap API — list + settings endpoints, client helpers
**Description:** Add a new `api/recap.py` blueprint registered at `/api/recap` in `app.py`, with `GET /api/recap?year=`, `GET /api/recap/settings` and `PUT /api/recap/settings` (partial update; validate `frequency_months` is 1–12 and `excluded_members` is a list of strings). Add the `getRecap`, `getRecapSettings` and `updateRecapSettings` helpers to `client.js`.

**Acceptance criteria:**
- [x] Settings GET/PUT round-trip persists to the tmp `app_settings.json`
- [x] `frequency_months=0` → 400; `excluded_members="Alice"` → 400
- [x] `GET /api/recap` returns the shape from the spec; an excluded member is missing and the others are present

**Verification:**
- [x] `pytest tests/test_api_recap.py -v` passes; full `pytest` green
- [x] `curl localhost:5001/api/recap` against the real data looks right (Italian text, sensible numbers)

**Dependencies:** T1
**Files:** `api/recap.py` (new), `app.py`, `frontend/src/api/client.js`, `tests/test_api_recap.py` (new)
**Scope:** M

### T3: Settings → "Recap email" section
**Description:** Create a new `RecapSettings.jsx` rendered as a `Paper` in `SettingsPage.jsx`. It has a subject field, a multiline body field, placeholder chips (clicking one inserts it at the cursor), a frequency select (1–12 months), an "Include in recap" list with one switch per current-year member, Reset to default (template only) and Save.

**Acceptance criteria:**
- [x] Saved values persist across a reload; Reset restores the default subject/body without saving the other fields
- [x] A chip inserts the placeholder at the cursor position in the body
- [x] Switching a member off and saving writes them to `recap_excluded_members`

**Verification:**
- [x] `cd frontend && npm run build` clean
- [x] Manual: spec steps 1 and 1a

**Dependencies:** T2
**Files:** `frontend/src/components/RecapSettings.jsx` (new), `frontend/src/components/SettingsPage.jsx`
**Scope:** S

### T4: Recap dialog with Copy, opened from Team Overview
**Description:** Create `RecapDialog.jsx`, with the member list on the left and a read-only subject/body preview on the right, plus Copy subject / Copy body buttons and a "Copiato" snackbar. Its open state lives in `App.jsx`. `TeamOverview.jsx` gets an outlined "Recap email" button (mail icon) in the header, which calls `onOpenRecap`. The year used is the current calendar year.

**Acceptance criteria:**
- [x] The button opens the dialog with one entry per included member
- [x] Copy puts the exact text on the clipboard; pasting into Outlook keeps the line breaks
- [x] The dialog follows the Gmail-like density and theme tokens; no new dependencies

**Verification:**
- [x] `npm run build` clean
- [x] Manual: spec step 2, checking numbers against the Vacation and Sick Leave pages

**Dependencies:** T2
**Files:** `frontend/src/components/RecapDialog.jsx` (new), `frontend/src/components/TeamOverview.jsx`, `frontend/src/App.jsx`
**Scope:** M

## Checkpoint A — after T1–T4
- [x] `pytest` green, `npm run build` clean
- [x] End-to-end: Settings → template/exclusions → dialog → copy → paste
- [x] `attendance.xlsx` modification time unchanged
- [x] Review with human before Phase 2

## Phase 2 — Reminder in-app (part B)

### T5: Due-date logic, status/sent endpoints, "Mark as sent"
**Description:** In `recap_service`, add `add_months(d, n)` (clamped to month end), `get_status(today)` → `{last_sent, frequency_months, next_due, is_due}`, and `mark_sent(today)`. Add `GET /api/recap/status` and `POST /api/recap/sent`, and the `getRecapStatus` and `markRecapSent` client helpers. Add a "Mark as sent" button to `RecapDialog`.

**Acceptance criteria:**
- [x] `null` last-sent → due; 10/07 + 3 months → 09/10 not due, 10/10 due; 30/11 + 3 → 28/02 (29/02 in a leap year); frequencies 1 and 12 correct
- [x] `POST /sent` sets `recap_last_sent` to today and returns the new status
- [x] Clicking "Mark as sent" in the dialog updates the status (verified via `GET /status`)

**Verification:**
- [x] `pytest tests/test_recap_service.py tests/test_api_recap.py -v`; full `pytest` green
- [x] `npm run build` clean

**Dependencies:** T4
**Files:** `services/recap_service.py`, `api/recap.py`, `frontend/src/api/client.js`, `frontend/src/components/RecapDialog.jsx`, tests
**Scope:** M

### T6: In-app reminder banner
**Description:** Create `RecapReminderBanner.jsx`, mounted in `Layout.jsx` next to `UpdateBanner`. It fetches the status on mount and shows when `is_due`: "È ora di inviare il riepilogo ferie — ultimo invio dd/mm/yyyy" (or "mai inviato"), with "Open recap" (opens the dialog through the App callback) and "Later" (hidden until the next launch, held in memory only). It hides immediately after "Mark as sent".

**Acceptance criteria:**
- [x] Shown iff `is_due`; Later hides it until the app restarts
- [x] Open recap opens the dialog; Mark as sent hides the banner without a reload
- [x] Visual style matches `UpdateBanner`

**Verification:**
- [x] `npm run build` clean
- [x] Manual: spec step 3, toggling `recap_last_sent` in the JSON

**Dependencies:** T5
**Files:** `frontend/src/components/RecapReminderBanner.jsx` (new), `frontend/src/components/Layout.jsx`, `frontend/src/App.jsx`
**Scope:** S

## Checkpoint B — after T5–T6
- [x] `pytest` green, build clean
- [x] Due/not-due cycle works end-to-end in the browser (`python app.py` + `npm run dev`)

## Phase 3 — Reminder outside the window (part B)

### T7: Electron — stay alive in the Dock when the window closes
**Description:** In `main.js`, on darwin, `window-all-closed` no longer kills Flask or quits. An `activate` handler re-creates the window if none exists, and `updater` gets the new window reference if needed. `before-quit` keeps killing Flask.

**Acceptance criteria:**
- [ ] Closing the window leaves the app in the Dock; clicking the Dock icon reopens the window
- [ ] Cmd+Q quits and Flask dies (`lsof -i :5001` empty)
- [ ] The auto-update apply path still quits and relaunches (code check of `updater.js` + manual check in a packaged build when the next release is made)

**Verification:**
- [ ] Manual in `npm run electron:dev`: spec step 5

**Dependencies:** None (can run in parallel with T1–T6)
**Files:** `electron/main.js`, possibly `electron/updater.js` (only if it holds a stale `mainWindow` reference; ask first if more is needed)
**Scope:** S

### T8: Electron — Dock badge, daily notification, IPC
**Description:** The main process fetches `/api/recap/status` at startup, every 60 minutes, and on the `recap:refresh` IPC. When due, it sets `app.dock.setBadge("1")` and shows a native `Notification` at most once per calendar day. When not due, it clears the badge. Clicking the notification shows/creates the window and sends `recap:open` to the renderer. `preload.js` exposes `refreshRecapStatus()` and `onRecapOpen(cb)`. `App.jsx` listens for `recap:open`, and `RecapDialog` calls `refreshRecapStatus()` after Mark as sent.

**Acceptance criteria:**
- [ ] With the window closed and the status due → badge shown and one notification per day
- [ ] Mark as sent → the badge clears within a second (IPC, not the hourly poll)
- [ ] Clicking the notification → the window opens with the recap dialog; the browser (non-Electron) build still works without `electronAPI`

**Verification:**
- [ ] Manual in `npm run electron:dev`: spec step 4
- [ ] `npm run build` clean

**Dependencies:** T5, T7
**Files:** `electron/main.js`, `electron/preload.js`, `frontend/src/App.jsx`, `frontend/src/components/RecapDialog.jsx`
**Scope:** M

## Checkpoint C — after T7–T8
- [ ] Full spec manual test plan (steps 1–7) passes in `npm run electron:dev`
- [ ] Review with human

## Phase 4 — Wrap-up

### T9: Sync SPEC.md / CLAUDE.md, final verification
**Description:** Add the new settings keys, `/api/recap` endpoints, new files and the stay-alive lifecycle to `SPEC.md` §3/§4, and add the new tests to §5. Add a recap line under Business Rules in `CLAUDE.md`. Mark the spec's status as implemented.

**Acceptance criteria:**
- [ ] SPEC.md and CLAUDE.md describe the shipped behavior; every spec success criterion is ticked
- [ ] Full `pytest` green, `npm run build` clean

**Verification:**
- [ ] `pytest && cd frontend && npm run build`
- [ ] Re-read the spec's success criteria against the app

**Dependencies:** T8
**Files:** `SPEC.md`, `CLAUDE.md`, `SPEC-recap-email.md`
**Scope:** XS

## Checkpoint: Complete
- [ ] All acceptance criteria met
- [ ] Commit → push → `npm run electron:build` → zip → GitHub Release (`.zip` only)
