# Plan — Close the Test-Suite Gap

**Created:** 2026-04-16
**Driver:** `SPEC.md` §5 names the missing automated test suite as the project's biggest known gap. Business-critical logic in `services/excel_service.py` (vacation accrual formula parsing, year-over-year carry-over chain, Italian decimal handling, month-row indexing, leave merge-on-add) currently has zero verification beyond manual clicks. Any change to this file is a silent-breakage risk.

**Goal of this plan:** ship a working, runnable test suite that exercises the highest-risk paths first, proves the Excel file round-trips cleanly, and runs on every push. Each phase delivers a vertical slice — a complete, verifiable path — not a horizontal layer.

**Out of scope (call-out, not in this plan):**
- Fixing the `"Setembre"` vs. `"Settembre"` month-name spelling in `excel_service.py:19`. May be legacy workbook compat; needs a separate decision before touching.
- Wiring a proper in-app auto-update check in `electron/main.js` (currently implied by SPEC but not implemented in code).
- Python/JS linters and type checkers.
- Migrating away from the typo-tolerant string-comma decimal parsing.

These are flagged as follow-ups.

---

## Dependency graph

```
                     ┌───────────────────────────────────┐
                     │ Phase 0  Test infra foundation    │
                     │  - pytest + fixture workbook       │
                     │  - vitest + RTL scaffold           │
                     └────────────────┬──────────────────┘
                                      │
     ┌────────────────────────────────┼────────────────────────────────┐
     ▼                                ▼                                ▼
┌────────────┐                ┌────────────────┐               ┌────────────┐
│ Phase 1    │                │ Phase 2        │               │ Phase 4    │
│ Backend —  │                │ Backend —      │               │ Frontend — │
│ balance    │ depends on P0  │ leave CRUD +   │ depends on P0 │ vitest +   │
│ math tests │                │ Excel round-   │               │ one smoke  │
└─────┬──────┘                │ trip tests     │               │ test       │
      │                       └───────┬────────┘               └─────┬──────┘
      └───────────────┬───────────────┘                              │
                      ▼                                              │
             ┌──────────────────┐                                    │
             │ Phase 3          │                                    │
             │ API layer tests  │                                    │
             │ (Flask client)   │                                    │
             └────────┬─────────┘                                    │
                      │                                              │
                      └──────────────────┬───────────────────────────┘
                                         ▼
                               ┌───────────────────┐
                               │ Phase 5  CI       │
                               │ GitHub Actions    │
                               │ runs both suites  │
                               │ on push/PR        │
                               └───────────────────┘
```

**Critical path:** P0 → P1 → P2 → P3 → P5. P4 can run in parallel with P1–P3.

---

## Vertical slicing principle

Each task delivers **one complete, runnable, verifiable path** — not a layer of infrastructure waiting on later layers to be useful. Every task ends with a concrete `pytest`/`vitest`/CI output you can point at and say "this proves X works."

---

## Phase 0 — Test infrastructure foundation

### Task 0.1 — Python test harness with a fixture workbook
**Scope:** add `pytest`, a `tests/` folder, a `conftest.py` that copies `data/attendance.xlsx` (or a stripped minimal version) into a tmp dir and points `services.excel_service` at it, and a single smoke test that reads the team list.
**Files:** `requirements-dev.txt` (new), `tests/__init__.py` (new), `tests/conftest.py` (new), `tests/test_smoke.py` (new), `tests/fixtures/minimal.xlsx` (new, committed).
**Acceptance:**
- `pip install -r requirements-dev.txt && pytest` runs green locally.
- `tests/test_smoke.py::test_get_team_returns_list` passes against the fixture workbook.
- The real `data/attendance.xlsx` is **not** touched by the test run (verified by file mtime unchanged after `pytest`).
**Verify:** `pytest -v` shows one passing test. `ls -la data/attendance.xlsx` before/after shows identical mtime.
**Risk:** `excel_service.py` resolves the data file via `_SETTINGS_FILE`; the fixture must override this without breaking module imports. Use a `monkeypatch` of `get_data_file` inside `conftest.py`.

### Task 0.2 — Frontend test harness
**Scope:** add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`, a `frontend/vitest.config.js`, and a single smoke test that renders `<Layout>` inside a `MemoryRouter` and asserts the sidebar is present.
**Files:** `frontend/package.json` (new deps + `"test"` script), `frontend/vitest.config.js` (new), `frontend/src/test-setup.js` (new), `frontend/src/components/Layout.test.jsx` (new).
**Acceptance:**
- `cd frontend && npm test` runs green.
- One passing test asserting `Layout` renders.
**Verify:** `npm test -- --reporter=verbose` shows one pass.

**Checkpoint after Phase 0:** both test runners execute locally. If either fails or flakes, stop and fix before moving on.

---

## Phase 1 — Backend balance math

### Task 1.1 — `_parse_accrual_formula` unit tests
**Scope:** cover the literal-number form (`=ROUNDUP(A20*11+2, 1)`), the `C16` reference form (`=ROUNDUP($A$20*12+$C$16, 1)`), and malformed inputs (None, empty, wrong shape).
**Files:** `tests/test_accrual_formula.py` (new).
**Acceptance:** all branches of the regex in `_parse_accrual_formula` are exercised; negative cases return `None`.
**Verify:** `pytest tests/test_accrual_formula.py -v` green; `pytest --cov=services.excel_service::_parse_accrual_formula` ≥ 100%.

### Task 1.2 — `_parse_days_count` unit tests
**Scope:** numeric inputs, Italian-decimal strings (`"1,5"` → 1.5), dash placeholders (`"-"`, `" - "`), empty, `None`, malformed.
**Files:** `tests/test_parse_days.py` (new).
**Acceptance:** every branch covered; the "1,5" case is asserted explicitly (this is the subtle one).
**Verify:** `pytest tests/test_parse_days.py -v` green.

### Task 1.3 — `compute_balance` end-to-end test for one member-year
**Scope:** using the fixture workbook, assert `compute_balance("<known-member>", <known-year>)` returns the expected `entitlement`, `carried_over`, `used`, `total`, `remaining`. Pick a year where the expected values can be derived by hand from the fixture and documented in a comment.
**Files:** `tests/test_compute_balance.py` (new), possibly extending `tests/fixtures/minimal.xlsx` with two years so the carryover chain is exercised.
**Acceptance:** test asserts all five numeric fields to two decimals. A second test case asserts that carry-over from year N feeds year N+1 correctly (this is the recursive path in `_get_carried_over`).
**Verify:** `pytest tests/test_compute_balance.py -v` green.

**Checkpoint after Phase 1:** the three highest-risk pure functions are covered. Refuse to merge any future change to `excel_service.py` without these passing.

---

## Phase 2 — Leave CRUD + Excel round-trip

### Task 2.1 — `add_leave` / `get_leave` round-trip
**Scope:** write a leave entry via `add_leave`, read it back via `get_leave`, assert values match. Then re-open the fixture workbook with a fresh `openpyxl.load_workbook` call and assert the `Totale` SUM-formula cells on row 14 are **still formulas** (not overwritten to values). This is the single most important invariant.
**Files:** `tests/test_leave_roundtrip.py` (new).
**Acceptance:**
- Round-trip test passes.
- Row-14 SUM formula preservation asserted for both vacation (col B) and sick (col D).
- Add-on-existing-month merges the days_count and concatenates `dates_detail` with `", "`.
**Verify:** `pytest tests/test_leave_roundtrip.py -v` green.

### Task 2.2 — `update_leave` / `delete_leave` round-trip
**Scope:** overwrite and clear leave entries. Assert that `delete_leave` sets both cells back to `None` and that the `Totale` formula still recomputes correctly (the formula stays intact; we only verify the formula text is present — we don't need openpyxl to evaluate it).
**Files:** `tests/test_leave_roundtrip.py` (extended).
**Acceptance:** update and delete paths each have a test; formula cells untouched.
**Verify:** `pytest tests/test_leave_roundtrip.py -v` green.

### Task 2.3 — Locked-file handling
**Scope:** simulate a locked workbook by creating a `~$<basename>` sidecar file in the fixture dir; assert `add_leave` raises `IOError` with a message containing "open in another application".
**Files:** `tests/test_file_locked.py` (new).
**Acceptance:** one test passes. Teardown removes the sidecar.
**Verify:** `pytest tests/test_file_locked.py -v` green.

**Checkpoint after Phase 2:** Excel write paths are protected. Before merging any change to `excel_service.py`'s write functions, these must pass.

---

## Phase 3 — API layer

### Task 3.1 — Flask test client setup
**Scope:** add a `client` fixture in `tests/conftest.py` that returns `app.test_client()` with the fixture workbook wired in.
**Files:** `tests/conftest.py` (extend).
**Acceptance:** fixture available; one trivial `GET /api/team` test returns 200.
**Verify:** `pytest -v -k api_smoke` green.

### Task 3.2 — Leave endpoint happy path + invalid leave_type
**Scope:** `POST /api/leave/vacation` → 201 + entry; `GET /api/leave/vacation?year=...&name=...` → 200 + list containing the new entry; `POST /api/leave/bogus_type` → 400.
**Files:** `tests/test_api_leave.py` (new).
**Acceptance:** three passing tests.
**Verify:** `pytest tests/test_api_leave.py -v` green.

### Task 3.3 — 409 on locked file via API
**Scope:** hit the 409 handler registered in `app.py` by forcing `add_leave` to raise `IOError` (reuse the sidecar trick or monkeypatch). Assert response status 409 with `{"error": ...}`.
**Files:** `tests/test_api_leave.py` (extended).
**Acceptance:** one test passes.
**Verify:** `pytest tests/test_api_leave.py::test_locked_returns_409 -v` green.

**Checkpoint after Phase 3:** HTTP contract for leave (the most-exercised endpoint) is locked in. Balances, holidays, team, config follow the same pattern later — out of scope for this plan.

---

## Phase 4 — Frontend smoke

### Task 4.1 — `LeaveDialog` renders and validates
**Scope:** render `<LeaveDialog>` open=true with a mock team member, assert required fields render, assert submit is disabled until a date and a count are provided.
**Files:** `frontend/src/components/LeaveDialog.test.jsx` (new).
**Acceptance:** test proves the validation rule. Mock the axios client via `vi.mock("../api/client")`.
**Verify:** `cd frontend && npm test` green.

**Checkpoint after Phase 4:** frontend has a proven test pattern others can copy.

---

## Phase 5 — CI

### Task 5.1 — GitHub Actions workflow
**Scope:** `.github/workflows/tests.yml` that runs on push and pull_request. Matrix: one job for Python (`pip install -r requirements-dev.txt && pytest`), one for frontend (`cd frontend && npm ci && npm test`). Cache pip and npm.
**Files:** `.github/workflows/tests.yml` (new).
**Acceptance:**
- Workflow shows green on the PR introducing it.
- Forcing a test to fail in a throwaway branch turns the workflow red.
**Verify:** open a PR, CI green. Flip a test to `assert False`, push, CI red. Revert.

### Task 5.2 — Add test badge to README
**Scope:** add a GitHub Actions status badge to `README.md`.
**Files:** `README.md`.
**Acceptance:** badge renders on GitHub.
**Verify:** view `README.md` on GitHub after push.

**Checkpoint after Phase 5:** every push and PR is gated on the suite. The biggest gap in SPEC §5 is closed.

---

## Risks and open questions

1. **Fixture workbook design.** The real `attendance.xlsx` is ~5 members × ~4 years × named sheets. A minimal fixture must preserve the Summary-sheet accrual formulas (including the `C16`/`A20` references) or the accrual-formula tests become fiction. Propose: copy the real file, strip names, commit under `tests/fixtures/`.
2. **Windows line endings and path separators.** Ignore — project is macOS-only per SPEC §1.
3. **PyInstaller packaged test runs.** We test the Python modules directly, not the bundled executable. Manual smoke on `.app` remains required per SPEC §5.
4. **Test data privacy.** If we keep real member names in a committed fixture, that leaks team data. Strip to `Member1..MemberN` before committing.
5. **Two years of data in the fixture.** Needed for the carry-over recursive path. This is mandatory, not optional.

---

## Review gate

**Stop here. Do not start Phase 0 until the user has:**
1. Agreed the test gap is the right priority to close next.
2. Agreed the fixture workbook can live under `tests/fixtures/` with anonymized names.
3. Agreed CI via GitHub Actions is acceptable (no self-hosted runner).
