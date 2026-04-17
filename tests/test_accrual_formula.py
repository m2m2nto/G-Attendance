"""Tests for _parse_accrual_formula — the regex that reads Summary sheet formulas."""

from services.excel_service import _parse_accrual_formula


def test_simple_numeric_weekend_holidays():
    """Pattern: =ROUNDUP(A20*12+1, 1)"""
    result = _parse_accrual_formula("=ROUNDUP(A20*12+1, 1)")
    assert result == (12.0, 1.0)


def test_dollar_sign_refs_with_c16():
    """Pattern: =ROUNDUP($A$20*12+$C$16, 1) — C16 is a cell reference."""
    result = _parse_accrual_formula("=ROUNDUP($A$20*12+$C$16, 1)")
    assert result is not None
    months, wh = result
    assert months == 12.0
    assert wh is None  # C16 reference, resolved separately


def test_partial_year():
    """Mid-year joiner: =ROUNDUP(A20*7+2, 1) — 7 months accrued."""
    result = _parse_accrual_formula("=ROUNDUP(A20*7+2, 1)")
    assert result == (7.0, 2.0)


def test_none_input():
    assert _parse_accrual_formula(None) is None


def test_empty_string():
    assert _parse_accrual_formula("") is None


def test_numeric_input():
    assert _parse_accrual_formula(42) is None


def test_malformed_formula():
    assert _parse_accrual_formula("=SUM(A1:A10)") is None


def test_wrong_cell_ref():
    """A21 instead of A20 — should not match."""
    assert _parse_accrual_formula("=ROUNDUP(A21*12+1, 1)") is None
