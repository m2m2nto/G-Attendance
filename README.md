# G-Attendance

> **This project is experimental.** It is not intended for production use.

## What is this

G-Attendance is a desktop team attendance management app — but more importantly, it is an **experiment in building software almost entirely through AI code agents**.

The project was started to explore how far you can push [Claude Code](https://claude.ai/code) as the primary development tool: writing features, fixing bugs, managing builds, and iterating on a real codebase over time. The app itself is functional and useful, but the real goal is the process, not the product.

## Why this project

### Excel as the source of truth

Most attendance tooling assumes a database. This project deliberately uses **Excel files as the primary data store** — reading and writing `.xlsx` directly, preserving the same format the team was already using. This creates an interesting challenge for AI agents: manipulating structured workbooks with openpyxl, handling date calculations, and keeping files human-readable so they can still be opened and edited in Excel.

### Expanding agent capabilities

The codebase has grown through continuous conversation with Claude Code, testing the boundaries of what a code agent can do:

- **Full-stack development** — React frontend, Flask backend, Electron desktop shell, all built and maintained by the agent
- **Excel file manipulation** — Reading and writing attendance data while preserving workbook structure and formatting
- **Build and release automation** — The agent handles PyInstaller bundling, Electron builds, and GitHub release uploads
- **Domain-specific business rules** — Luxembourg labor law: 26 vacation days, monthly accrual, carry-over deadlines, public holidays

### Practicing agent communication

This project is also a testbed for **how humans and AI agents collaborate over time**:

- Refining prompts and instructions (the `CLAUDE.md` file) to get consistent, high-quality output
- Using **memory systems** to maintain context across conversations — preferences, decisions, project history
- Experimenting with different agent strategies: planning before coding, parallel sub-agents for research, iterative refinement vs. single-pass implementation
- Learning what to delegate fully vs. what needs human steering

## The app itself

G-Attendance tracks team vacation, sick leave, and public holidays for a Luxembourg-based team. It replaces a manual Excel spreadsheet workflow with a clean dashboard while keeping Excel as the storage layer. Features include:

- Vacation balance tracking with monthly accrual (26 base days/year)
- Carry-over of unused days until March of the following year
- Half-day leave support
- Sick leave tracking (count and dates)
- 11 Luxembourg public holidays per year
- Sortable vacation table with date chips
- Built-in auto-update mechanism

## Tech stack

| Layer | Technology |
|-------|-----------|
| Desktop | Electron (macOS) |
| Frontend | React 18, Material UI 5, Vite 6 |
| Backend | Flask (Python), openpyxl |
| Storage | Excel files (no database) |
| Bundling | PyInstaller, electron-builder |
| Dev tool | Claude Code |

## About this repository

This repo contains the source code and hosts release builds for auto-update distribution. Releases are published as GitHub Releases.

---

**Experimental** — No stability guarantees, no migration paths, breaking changes expected. This is a learning project first and a tool second.
