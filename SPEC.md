# G-Attendance — Specification

> Source of truth for what this project is, how it is built, and the guardrails around changes. This spec reflects the codebase as of 2026-05-05. When code and spec disagree, update the spec in the same change.

## 1. Objective

A local, offline-first desktop app that replaces a manual Excel attendance spreadsheet for a 5-person Luxembourg team. It tracks vacation balances (with Luxembourg labor-law accrual), sick leave, and public holidays while keeping the underlying `.xlsx` file human-readable so it can still be opened and edited in Excel.

The project is also a long-running experiment in AI-agent-driven development: most code is written and maintained by Claude Code. Process quality (clear specs, memory, prompts) is a first-class goal alongside the shipped product.

### Target users

- Team lead (`team.lux@gullivernet.lu`) — primary user, records leave for the team, produces monthly reports.
- Team members (5) — indirect users; their attendance is recorded by the lead.

### Non-goals

- Multi-tenant / multi-team support.
- Web hosting or shared server deployment.
- Replacing Excel as the storage layer.
- Windows or Linux builds (macOS only).

## 2. Commands

### Development

| Command | Purpose |
|---|---|
| `python app.py` | Run Flask on `:5001`, serves API + built frontend |
| `cd frontend && npm run dev` | Vite dev server with HMR (talks to Flask on `:5001`) |
| `cd frontend && npm run build` | Build frontend to `frontend/dist/` |
| `npm run electron:dev` | Run Electron shell against the dev backend / frontend |
| `pytest` | Run the backend test suite (requires `pip install -r requirements-dev.txt`) |
| `ruff check .` | Lint the Python code |
| `cd frontend && npm test` | Run the frontend Vitest suite |
| `cd frontend && npm run lint` | Lint the frontend with ESLint |
| `python scripts/import_data.py` | One-time migration from original Excel workbook |

### Build & release

| Command | Purpose |
|---|---|
| `npm run build:frontend` | Vite production build |
| `npm run build:backend` | PyInstaller one-dir bundle of Flask app → `dist-backend/app/` |
| `npm run electron:build` | Full macOS build: backend + frontend + electron-builder, copies `.app` to repo root |

### Release flow (post-commit)

After every pushed commit:

1. `npm run electron:build`
2. Zip the resulting `G-Attendance.app` as `G-Attendance-<version>-arm64.zip`.
3. Upload the `.zip` to a new GitHub Release. **Only the `.zip` is uploaded** — never `.dmg`.
4. Release feeds the in-app auto-update mechanism.

## 3. Project structure

```
app.py                    Flask entry point (port 5001, serves API + frontend dist)
app.spec                  PyInstaller spec
requirements.txt          Flask 3.1, flask-cors 5, openpyxl 3.1
requirements-dev.txt      pytest + pytest-cov + ruff for backend tests and lint
package.json              Electron + build scripts
electron-builder.yml      Electron packaging config

api/                      Flask blueprints (one per domain)
  team.py                 /api/team        — team roster
  leave.py                /api/leave       — vacation + sick leave entries
  holidays.py             /api/holidays    — Luxembourg public holidays
  balances.py             /api/balances    — computed vacation balances
  config.py               /api/config      — app settings + app users (audit identity)
  recap.py                /api/recap       — Italian recap email (templates, status, mark as sent)

services/
  excel_service.py        Single read/write layer over attendance.xlsx (openpyxl)
  recap_service.py        Recap rendering, Italian formatting, reminder schedule (reads via excel_service)

scripts/
  import_data.py          One-time migration from legacy workbook

data/
  attendance.xlsx         Primary data store (human-readable, editable in Excel)
  app_settings.json       Non-tabular app settings (incl. app_users + current_user)

electron/
  main.js                 Spawns PyInstaller backend, loads Flask URL in BrowserWindow; stays alive in the
                          Dock when the window closes; recap Dock badge + daily notification
  preload.js              IPC bridge (auto-update + recap channels)
  updater.js              GitHub Releases auto-updater (zip + version check, IPC events)

frontend/                 React 18 + MUI 6 + Vite 6
  src/
    main.jsx              Entry
    App.jsx               Top-level shell; tracks page, year, app users, current user
    theme.js              MUI theme (Gmail-like tokens)
    api/client.js         Axios instance + typed helpers (incl. getAppUsers)
    components/
      Layout.jsx          App shell — toolbar, draggable title band, collapsible sidebar, user + year selectors
      TeamOverview.jsx    Dashboard home
      VacationPage.jsx    Sortable vacation table, date chips
      SickLeavePage.jsx   Sick leave list
      HolidaysPage.jsx    Luxembourg holidays
      SettingsPage.jsx    App config + app user management
      LeaveDialog.jsx     Add/edit leave entry
      ConfirmDialog.jsx   Reusable confirm modal
      UpdateBanner.jsx    Auto-update prompt (driven by electron/updater.js IPC events)
      RecapDialog.jsx     Per-member recap email preview, Copy, Mark as sent
      RecapReminderBanner.jsx  "Recap due" banner (Open recap / Later)
      FiduciaireReminderBanner.jsx  "Send sick leave documents to the fiduciaire" banner
      RecapSettings.jsx   Settings section: templates, reminder frequency, included members

tests/                    Backend pytest suite
  conftest.py             Shared fixtures (tmp workbook copies)
  fixtures/minimal.xlsx   Reference workbook for round-trip tests
  test_accrual_formula.py
  test_compute_balance.py
  test_parse_days.py
  test_leave_roundtrip.py
  test_file_locked.py     409 path when attendance.xlsx is locked by Excel
  test_api_leave.py
  test_recap_service.py   Recap rendering, Italian formatting, exclusions, reminder schedule
  test_api_recap.py
  test_smoke.py

dist-backend/             PyInstaller output (gitignored)
dist-electron/            electron-builder output (gitignored)
G-Attendance.app          Last built macOS app (kept at repo root for convenience)
```

## 4. Tech stack & code style

### Stack (locked)

| Layer | Technology | Version |
|---|---|---|
| Desktop shell | Electron | 33.x |
| Frontend framework | React | 18.3 |
| UI library | Material UI (`@mui/material`, `@mui/icons-material`) | 6.4 |
| Date pickers | `@mui/x-date-pickers` + `dayjs` | 8.27 / 1.11 |
| Routing | Local state in `App.jsx` (single-window app, no URL routing) | — |
| HTTP client | `axios` | 1.7 |
| Bundler | Vite | 6.x |
| Backend | Flask + flask-cors | 3.1 / 5.0 |
| Excel I/O | openpyxl | 3.1 |
| Backend bundling | PyInstaller (one-dir) | — |
| Desktop bundling | electron-builder | 25.x |
| Storage | `.xlsx` + `.json` only | — |

Swaps to any of the above require explicit approval (see §6 Boundaries).

### Code style

**Python**

- PEP 8, 4-space indent.
- Flask blueprints per domain, registered with `/api/<domain>` prefix.
- All Excel access goes through `services/excel_service.py`. No blueprint opens `.xlsx` directly.
- Date logic centralized — business rules live near the service, not in the blueprint.
- Return JSON with conventional status codes. `IOError` from a locked workbook → `409`.

**JavaScript / React**

- Functional components + hooks only.
- MUI-first: use MUI primitives before reaching for custom CSS. Theme tokens via `theme.js`.
- `api/client.js` is the single axios instance; components call typed helpers, not raw `fetch`.
- File-per-component under `components/`. Page components are `<Name>Page.jsx`.
- Dates handled with `dayjs` and `@mui/x-date-pickers` — no mixing with native `Date` in render paths.
- Page navigation lives in `App.jsx` state — no URL router. Don't add `react-router-dom` (or any router) without a concrete need; the app is intentionally single-window.

**UX**

- Gmail-like density and palette (see memory: `feedback_ux_style`). Clean, minimal, Material Design.
- Never produce dashboard-heavy / data-science-style charts and tables.
- Sortable tables, chip-based date displays, dialogs for add/edit.

### Excel conventions

- `data/attendance.xlsx` must remain openable and editable in Excel at all times.
- Preserve header formatting, column widths, and existing sheet structure when writing.
- No pickling, no binary sidecar formats — if a value can live in the workbook, it lives in the workbook.
- Non-tabular app state goes in `data/app_settings.json`. This currently includes `app_users` (the list of operators allowed to record actions) and `current_user` (the active operator, used for audit-trail identity in the UI). It also holds `sick_leave_docs`: per sick leave entry (`person|year|month`), a list of linked documents, each with its absolute path (link-only — files are never copied, moved, or deleted) and its own `sent_to_fiduciaire` flag. The recap email (see *Recap email* below) adds `recap_subject_template`, `recap_body_template`, `recap_frequency_months` (1–12, default 3), `recap_excluded_members` and `recap_last_sent` (ISO date; missing = due now).

### Business rules (Luxembourg)

- 26 base vacation days per calendar year.
- Accrual: ~2.167 days per month (26 / 12).
- Carry-over: unused days from year N are usable until **31 March of year N+1**, then forfeited.
- Half-day leave supported (0.5-day increments).
- 11 public holidays per year (fixed list, maintained via Holidays page).
- Sick leave: counted + dated; no balance, no cap.
- Sick leave documents go to the fiduciaire at least 5 days before the end of the month (salary slip). Reminder: any sick leave of the current or previous month with no document, or a document not flagged as sent, shows an in-app banner (deadline / overdue), counts in the Dock badge, and triggers at most one macOS notification per day. The Sick Leave table is sortable and opens newest first.

### Recap email

- One Italian recap per active member (current year's Summary sheet) minus `recap_excluded_members`. The app never sends email: the user copies subject/body to the clipboard.
- Covers 1 January to today. Numbers come from `compute_balance` and `get_leave`, so they always match what the app shows. Italian formatting: `2,5`, whole numbers without decimals, `dd/mm/yyyy`, Italian month names.
- Template placeholders: `{nome}`, `{anno}`, `{data_oggi}`, `{residuo_anno_precedente}`, `{scadenza_residuo}`, `{maturate_anno}`, `{totale_disponibile}`, `{ferie_godute}`, `{ferie_residue}`, `{dettaglio_ferie}`, `{giorni_malattia}`, `{dettaglio_malattia}`, `{mittente}` (`current_user`). Unknown placeholders are left as is. Defaults and the list live in `services/recap_service.py`.
- Due date is rolling: `recap_last_sent` + `recap_frequency_months`; no `recap_last_sent` means due now. When due: in-app banner, Dock badge, and at most one macOS notification per day.

## 5. Testing strategy

### Backend (in place)

A `pytest` suite lives in `tests/`. Run it with `pytest` after installing `requirements-dev.txt`. Fixtures in `tests/conftest.py` copy `tests/fixtures/minimal.xlsx` into a tmp dir so tests never touch the real `data/attendance.xlsx`.

Current coverage:

- `test_accrual_formula.py`, `test_compute_balance.py` — Luxembourg accrual + carry-over math.
- `test_parse_days.py` — half-day and date-range parsing.
- `test_leave_roundtrip.py` — write via the service, re-read with a fresh openpyxl load, assert values and formatting survive.
- `test_file_locked.py` — `IOError` on a locked workbook surfaces as HTTP 409.
- `test_api_leave.py`, `test_smoke.py` — Flask blueprint smoke + leave endpoints.
- `test_recap_service.py`, `test_api_recap.py` — recap email rendering (Italian numbers, placeholders, exclusions), rolling reminder schedule, `/api/recap` endpoints.
- `test_api_balances.py`, `test_api_team.py`, `test_api_config.py`, `test_api_holidays.py`, `test_api_sick_leave_docs.py` — remaining blueprints.

Backend changes that touch business rules, the Excel layer, or a leave/balance endpoint must extend this suite (or explain in the PR why no test fits) — see §6 *Always do*.

### Frontend

Vitest + React Testing Library (jsdom) run with `cd frontend && npm test`; tests sit next to their component as `*.test.jsx`, with the API client mocked via `vi.mock("../api/client")`. Coverage is thin: a smoke test and `LeaveDialog` (prefill, Add/Update enablement, month grouping on save).

Most UI is still checked by hand: `python app.py` + `npm run dev`, exercise each page, then re-open `data/attendance.xlsx` in Excel to confirm it still loads cleanly. Every non-trivial UI change still ships with a written manual test plan in the PR description.

CI (`.github/workflows/tests.yml`) runs `ruff`, `pytest`, ESLint and Vitest on every push and PR to `main`.

## 6. Boundaries

### Always do

- Keep Excel (`attendance.xlsx`) as the source of truth, human-readable, editable in Excel.
- Route all Excel I/O through `services/excel_service.py`.
- Match the Gmail-like Material Design aesthetic on every UI change.
- After every pushed commit: build `.app`, zip, publish GitHub Release for auto-update.
- Upload **only `.zip`** to releases. Never `.dmg`.
- Keep CLAUDE.md and this SPEC.md in sync with reality.
- Respect Luxembourg business rules (26 days, accrual, March carry-over cutoff, half-days, 11 holidays).
- Extend the `pytest` suite in `tests/` whenever a change touches business rules, `services/excel_service.py`, or a leave/balance endpoint. If no test fits, justify it in the PR description.

### Ask first

- Any schema change to `attendance.xlsx` (new sheet, renamed column, reordered headers) — it must stay backwards-compatible with the team's existing workbook or ship with a migration in `scripts/`.
- Adding a new dependency (Python or npm), or bumping a major version.
- Introducing a new top-level directory.
- Changes to the release / auto-update flow.
- UI changes that deviate from Gmail-like density or MUI defaults.
- Anything that would require the user to re-enter existing data.

### Never do

- Add a database (SQLite, Postgres, anything). Excel + JSON only.
- Replace Flask, React, MUI, Electron, or openpyxl without explicit approval.
- Ship Windows or Linux builds.
- Introduce analytics, telemetry, or any network call beyond the GitHub auto-update check.
- Store or transmit team members' data off-device.
- Break `data/attendance.xlsx` compatibility with Excel.
- Skip the post-commit release build for pushed commits.
- Upload `.dmg` release assets.
- Silently refactor code outside the task scope.
