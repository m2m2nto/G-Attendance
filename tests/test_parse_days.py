"""Tests for _parse_days_count — Italian decimal and placeholder handling."""

from services.excel_service import _parse_days_count


def test_integer():
    assert _parse_days_count(5) == 5.0


def test_float():
    assert _parse_days_count(2.5) == 2.5


def test_none():
    assert _parse_days_count(None) == 0


def test_empty_string():
    assert _parse_days_count("") == 0


def test_dash():
    assert _parse_days_count("-") == 0


def test_dash_with_spaces():
    assert _parse_days_count(" - ") == 0


def test_double_space_dash():
    assert _parse_days_count("  - ") == 0


def test_italian_decimal_comma():
    """The critical case: Italian '1,5' means 1.5 days."""
    assert _parse_days_count("1,5") == 1.5


def test_italian_decimal_comma_larger():
    assert _parse_days_count("10,5") == 10.5


def test_normal_string_number():
    assert _parse_days_count("3") == 3.0


def test_malformed_string():
    assert _parse_days_count("abc") == 0


def test_zero():
    assert _parse_days_count(0) == 0.0


def test_zero_string():
    assert _parse_days_count("0") == 0.0
