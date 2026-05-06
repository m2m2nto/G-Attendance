# G-Attendance

> **See `SPEC.md` for the full specification.** This file is the short briefing.

## Project Overview
Local macOS desktop app for managing team vacation, sick leave, and Luxembourg public holidays. Replaces a manual Excel spreadsheet workflow for a 5-person team. Also a long-running experiment in AI-agent-driven development (Claude Code writes most of the code).

## Tech Stack
- **Backend**: Python + Flask 3.1 + openpyxl 3.1 (Excel read/write), flask-cors 5
- **Frontend**: React 18.3 + Material UI 6.4 + Vite 6 + axios + dayjs + `@mui/x-date-pickers` (no router — `App.jsx` state-based nav)
- **Desktop**: Electron 33 + PyInstaller (one-dir) + electron-builder 25 (macOS only)
- **Data store**: Excel files + JSON only, no database

## Key Commands
- `python app.py` — start Flask on port 5001 (serves API + built frontend)
- `cd frontend && npm run dev` — frontend dev server with HMR
- `cd frontend && npm run build` — production frontend build
- `python scripts/import_data.py` — one-time migration from original Excel
- `npm run build:backend` — PyInstaller bundle of Flask app
- `npm run electron:build` — full macOS `.app` build (backend + frontend + electron-builder)

## Project Structure
```
app.py                    Flask entry point
app.spec                  PyInstaller spec
requirements.txt
api/                      Flask blueprints: team, leave, holidays, balances, config
services/excel_service.py Single read/write layer over attendance.xlsx
scripts/import_data.py    Migration
data/                     attendance.xlsx + app_settings.json
electron/                 main.js + preload.js + updater.js (auto-update)
frontend/src/
  components/             Layout, TeamOverview, VacationPage, SickLeavePage,
                          HolidaysPage, SettingsPage, LeaveDialog, ConfirmDialog,
                          UpdateBanner
  api/client.js           Single axios instance
  theme.js                MUI theme (Gmail-like)
tests/                    Backend pytest suite (run with `pytest`)
```

## Business Rules
- 26 base vacation days per year (Luxembourg)
- ~2.167 days accrued per month
- Unused vacation carries over until 31 March of the following year
- Half-day leave supported
- 11 Luxembourg public holidays per year
- Sick leave tracked (count + dates), no balance, no cap

## Guardrails (see SPEC.md §6 for the full list)
- All Excel I/O goes through `services/excel_service.py`. `data/attendance.xlsx` must stay Excel-editable.
- Never add a database. Excel + JSON only.
- UI stays Gmail-like / Material Design. No data-science dashboards.
- After every pushed commit: build `.app`, zip it, publish GitHub Release. Upload `.zip` only — never `.dmg`.
- Schema changes to `attendance.xlsx`, new deps, or stack swaps require explicit approval.
- Backend `pytest` suite lives in `tests/` — extend it for changes touching business rules, `excel_service`, or leave/balance endpoints. Frontend still manual; include a manual test plan in PR descriptions.
