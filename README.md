# G-Attendance

> **This project is experimental.** It is under active development and may contain bugs, incomplete features, or breaking changes. Use at your own risk.

A local desktop dashboard for managing team vacation and sick leave accounting. Built to replace a manual Excel spreadsheet workflow for a Luxembourg-based team.

## Goal

Simplify day-to-day attendance tracking by providing a clean, visual interface on top of Excel files — no cloud services, no databases, no complex setup. The data stays in `.xlsx` files that remain human-readable and editable outside the app.

## Features

- Vacation balance tracking with monthly accrual (26 base days/year, Luxembourg rules)
- Carry-over of unused days until March of the following year
- Half-day leave support
- Sick leave tracking (count and dates)
- 11 Luxembourg public holidays per year
- Sortable vacation table with date chips
- Auto-update support via GitHub releases

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Python, Flask, openpyxl |
| Frontend | React 18, Material UI 5, Vite |
| Desktop | Electron, PyInstaller |
| Data | Excel files (no database) |

## Getting Started

### Prerequisites

- Python 3.12+
- Node.js 18+
- npm

### Development

```bash
# Install Python dependencies
pip install -r requirements.txt

# Install Node dependencies
npm install
cd frontend && npm install && cd ..

# Start Flask backend
python app.py

# Start frontend dev server (in a separate terminal)
cd frontend && npm run dev
```

### Build macOS App

```bash
npm run electron:build
```

The built `.app` will be available in the project root.

## Project Structure

```
app.py                    # Flask entry point
requirements.txt          # Python dependencies
api/                      # Flask API routes
services/                 # Excel read/write service
data/                     # Excel data files
electron/                 # Electron main process
frontend/                 # React + MUI app
scripts/                  # Migration scripts
```

## License

This project is for internal use. No license is provided.
