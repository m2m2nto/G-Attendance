# G-Attendance

## Project Overview
Local dashboard for managing team vacation and sick leave accounting. Replaces a manual Excel spreadsheet workflow for a Luxembourg-based team of 5.

## Tech Stack
- **Backend**: Python + Flask + openpyxl (Excel read/write)
- **Frontend**: React 18 + Material UI (MUI) 5 + Vite
- **Desktop**: Electron + PyInstaller (macOS native app)
- **Data store**: Excel files only (no database)

## Key Commands
- `python app.py` — start the Flask server on port 5001 (serves API + built frontend)
- `cd frontend && npm run dev` — start frontend dev server with HMR
- `cd frontend && npm run build` — build frontend for production
- `python scripts/import_data.py` — one-time migration from original Excel
- `npm run electron:build` — build macOS .app

## Project Structure
```
app.py                    # Flask entry point
requirements.txt
api/                      # Flask API routes
services/                 # Excel read/write service
scripts/                  # Migration scripts
data/                     # Excel data files
electron/                 # Electron main process
frontend/                 # React + MUI app
```

## Business Rules
- 26 base vacation days per year (Luxembourg)
- ~2.167 days accrued per month
- Unused vacation carries over until March of next year
- Half-day leave is supported
- 11 Luxembourg public holidays per year
- Sick leave is tracked (count + dates) but has no balance/limit
