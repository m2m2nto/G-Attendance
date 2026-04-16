# G-Attendance — Specification

> Source of truth for what this project is, how it is built, and the guardrails around changes. This spec reflects the codebase as of 2026-04-16. When code and spec disagree, update the spec in the same change.

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
| `python scripts/import_data.py` | One-time migration from original Excel workbook |

### Build & release

| Command | Purpose |
|---|---|
| `npm run build:frontend` | Vite production build |
| `npm run build:backend` | PyInstaller one-file bundle of Flask app → `dist-backend/app` |
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
package.json              Electron + build scripts
electron-builder.yml      Electron packaging config

api/                      Flask blueprints (one per domain)
  team.py                 /api/team        — team roster
  leave.py                /api/leave       — vacation + sick leave entries
  holidays.py             /api/holidays    — Luxembourg public holidays
  balances.py             /api/balances    — computed vacation balances
  config.py               /api/config      — app settings

services/
  excel_service.py        Single read/write layer over attendance.xlsx (openpyxl)

scripts/
  import_data.py          One-time migration from legacy workbook

data/
  attendance.xlsx         Primary data store (human-readable, editable in Excel)
  app_settings.json       Non-tabular app settings

electron/
  main.js                 Spawns PyInstaller backend, loads Flask URL in BrowserWindow
  preload.js              IPC bridge

frontend/                 React 18 + MUI 6 + Vite 6 + react-router 7
  src/
    main.jsx              Entry
    App.jsx               Router + layout
    theme.js              MUI theme (Gmail-like tokens)
    api/client.js         Axios instance
    components/
      Layout.jsx          App shell (sidebar + content)
      TeamOverview.jsx    Dashboard home
      VacationPage.jsx    Sortable vacation table, date chips
      SickLeavePage.jsx   Sick leave list
      HolidaysPage.jsx    Luxembourg holidays
      SettingsPage.jsx    App config
      LeaveDialog.jsx     Add/edit leave entry
      ConfirmDialog.jsx   Reusable confirm modal

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
| Router | `react-router-dom` | 7.x |
| HTTP client | `axios` | 1.7 |
| Bundler | Vite | 6.x |
| Backend | Flask + flask-cors | 3.1 / 5.0 |
| Excel I/O | openpyxl | 3.1 |
| Backend bundling | PyInstaller (one-file) | — |
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

**UX**

- Gmail-like density and palette (see memory: `feedback_ux_style`). Clean, minimal, Material Design.
- Never produce dashboard-heavy / data-science-style charts and tables.
- Sortable tables, chip-based date displays, dialogs for add/edit.

### Excel conventions

- `data/attendance.xlsx` must remain openable and editable in Excel at all times.
- Preserve header formatting, column widths, and existing sheet structure when writing.
- No pickling, no binary sidecar formats — if a value can live in the workbook, it lives in the workbook.
- Non-tabular app state (e.g., feature toggles) goes in `data/app_settings.json`.

### Business rules (Luxembourg)

- 26 base vacation days per calendar year.
- Accrual: ~2.167 days per month (26 / 12).
- Carry-over: unused days from year N are usable until **31 March of year N+1**, then forfeited.
- Half-day leave supported (0.5-day increments).
- 11 public holidays per year (fixed list, maintained via Holidays page).
- Sick leave: counted + dated; no balance, no cap.

## 5. Testing strategy

Current state: **no automated test suite**. This is the biggest known gap.

### What verification looks like today

- Manual smoke on the built `.app` before release.
- `python app.py` + `npm run dev`, exercise each page, check Excel file contents after writes.
- For Excel changes: open `data/attendance.xlsx` in Excel after the test to confirm it still loads cleanly.

### When tests are added (planned, not yet implemented)

- **Backend**: `pytest` against `services/excel_service.py` using fixture workbooks in a tmp dir. Must cover accrual, carry-over cutoff, half-day math, and the "file locked" 409 path.
- **Frontend**: Vitest + React Testing Library for leave dialog validation and balance rendering. Browser-level flows can use the `webapp-testing` / Playwright skill.
- **Integration**: round-trip test — write via API, re-read the `.xlsx` with a fresh openpyxl load, assert values and that formatting survived.

Until that suite exists, every non-trivial change must include a written manual test plan in the PR description.

## 6. Boundaries

### Always do

- Keep Excel (`attendance.xlsx`) as the source of truth, human-readable, editable in Excel.
- Route all Excel I/O through `services/excel_service.py`.
- Match the Gmail-like Material Design aesthetic on every UI change.
- After every pushed commit: build `.app`, zip, publish GitHub Release for auto-update.
- Upload **only `.zip`** to releases. Never `.dmg`.
- Keep CLAUDE.md and this SPEC.md in sync with reality.
- Respect Luxembourg business rules (26 days, accrual, March carry-over cutoff, half-days, 11 holidays).

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
