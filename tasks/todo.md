# Todo — Test-suite rollout

> See `tasks/plan.md` for full context, dependency graph, and acceptance details.

## Phase 0 — Foundation
- [x] 0.1 Python test harness + fixture workbook + smoke test
- [ ] 0.2 Frontend vitest + RTL + smoke test
- [x] **Checkpoint:** Python runner green locally (41 tests)

## Phase 1 — Balance math
- [x] 1.1 `_parse_accrual_formula` unit tests (8 tests)
- [x] 1.2 `_parse_days_count` unit tests incl. Italian "1,5" (13 tests)
- [x] 1.3 `compute_balance` end-to-end for both members + carryover chain (4 tests)
- [x] **Checkpoint:** high-risk pure functions covered

## Phase 2 — Excel round-trip
- [x] 2.1 `add_leave` / `get_leave` round-trip + `Totale` SUM formula preservation (4 tests)
- [x] 2.2 `update_leave` / `delete_leave` round-trip (3 tests)
- [x] 2.3 Locked-file `~$` sidecar → IOError (1 test)
- [x] **Checkpoint:** Excel write paths protected
- [x] **BONUS: Found and fixed `delete_leave` bug** — `ws.cell(row, col, value=None)` doesn't clear in openpyxl; changed to `.value = None`

## Phase 3 — API layer
- [x] 3.1 Flask test client fixture + smoke (1 test)
- [x] 3.2 Leave endpoints happy path + invalid leave_type 400 (4 tests)
- [x] 3.3 Locked file → 409 via API (1 test)
- [x] **Checkpoint:** leave HTTP contract locked

## Phase 4 — Frontend (not yet started)
- [ ] 4.1 `LeaveDialog` renders + validation rule

## Phase 5 — CI
- [x] 5.1 `.github/workflows/tests.yml` — pytest on push/PR (macOS runner)
- [ ] 5.2 Test badge in `README.md`

---

## Out of scope — flagged for separate decisions
- [ ] `"Setembre"` vs. `"Settembre"` month-name typo in `services/excel_service.py:19`
- [ ] Auto-update wiring in `electron/main.js`
- [ ] Python/JS linters and type checkers
- [ ] API test coverage for `balances`, `holidays`, `team`, `config`
- [ ] Frontend test setup (vitest + RTL)
