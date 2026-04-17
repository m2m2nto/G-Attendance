"""Tests for compute_balance — end-to-end balance calculation with fixture data.

Fixture data (from tests/create_fixture.py):

Alice 25:  vacation used = 2 + 1 + 5 + 5 + 0.5 + 3 = 16.5 days
           Year 25 is oldest → carried_over = 0
           Accrual formula: ROUNDUP(26/12 * 12 + 1, 1) = ROUNDUP(26 + 1) = 27.0
           (weekend holidays 2025 = 1)
           total = 0 + 27.0 = 27.0
           remaining = 27.0 - 16.5 = 10.5

Alice 26:  vacation used = 1.5 + 2.5 = 4.0 days
           (Note: "1,5" Italian string → 1.5 via _parse_days_count)
           carried_over = Alice 25 remaining = 10.5
           Accrual formula: ROUNDUP(26/12 * 12 + 4, 1) = ROUNDUP(26 + 4) = 30.0
           (weekend holidays 2026 = 4)
           total = 10.5 + 30.0 = 40.5
           remaining = 40.5 - 4.0 = 36.5

Bob 25:    vacation used = 3 + 10 + 1 = 14 days
           carried_over = 0 (oldest year)
           entitlement = 27.0 (same formula)
           remaining = 27.0 - 14 = 13.0

Bob 26:    vacation used = 1 day
           carried_over = Bob 25 remaining = 13.0
           entitlement = 30.0
           remaining = 13.0 + 30.0 - 1 = 42.0
"""

from services.excel_service import compute_balance


def test_alice_year_25(patch_data_file):
    b = compute_balance("Alice", 2025)
    assert b["name"] == "Alice"
    assert b["year"] == 2025
    assert b["carried_over"] == 0
    assert b["entitlement"] == 27.0
    assert b["used"] == 16.5
    assert b["total"] == 27.0
    assert b["remaining"] == 10.5


def test_alice_year_26_carryover(patch_data_file):
    """Carry-over chain: Alice 26 carried_over = Alice 25 remaining."""
    b = compute_balance("Alice", 2026)
    assert b["name"] == "Alice"
    assert b["carried_over"] == 10.5
    assert b["entitlement"] == 30.0
    assert b["used"] == 4.0
    assert b["total"] == 40.5
    assert b["remaining"] == 36.5


def test_bob_year_25(patch_data_file):
    b = compute_balance("Bob", 2025)
    assert b["carried_over"] == 0
    assert b["entitlement"] == 27.0
    assert b["used"] == 14
    assert b["remaining"] == 13.0


def test_bob_year_26_carryover(patch_data_file):
    b = compute_balance("Bob", 2026)
    assert b["carried_over"] == 13.0
    assert b["entitlement"] == 30.0
    assert b["used"] == 1
    assert b["remaining"] == 42.0
