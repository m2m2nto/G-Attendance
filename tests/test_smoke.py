"""Smoke tests — verify the test harness works."""


def test_get_team_returns_list(patch_data_file):
    from services.excel_service import get_team

    team = get_team()
    names = [m["name"] for m in team]
    assert "Alice" in names
    assert "Bob" in names
    assert len(team) == 2


def test_fixture_does_not_touch_real_data(patch_data_file):
    """Ensure the real data file is not modified by tests."""
    import os

    real_file = os.path.join(
        os.path.dirname(os.path.dirname(__file__)),
        "Holidays and sick leaves - Counting.xlsx",
    )
    if not os.path.exists(real_file):
        return  # CI may not have the real file
    mtime_before = os.path.getmtime(real_file)

    from services.excel_service import get_team
    get_team()

    mtime_after = os.path.getmtime(real_file)
    assert mtime_before == mtime_after
