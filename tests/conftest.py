"""Pytest configuration — fixture workbook isolation."""

import json
import os
import shutil

import pytest

FIXTURE_SRC = os.path.join(os.path.dirname(__file__), "fixtures", "minimal.xlsx")


@pytest.fixture()
def workbook_dir(tmp_path):
    """Copy the fixture workbook to a temp dir and return the dir path."""
    dest = tmp_path / "minimal.xlsx"
    shutil.copy2(FIXTURE_SRC, dest)
    return tmp_path


@pytest.fixture()
def patch_data_file(workbook_dir, monkeypatch):
    """Point excel_service at the temp fixture workbook.

    Creates a temporary app_settings.json so get_data_file() resolves
    to the copied fixture instead of the real data file.
    """
    xlsx_path = str(workbook_dir / "minimal.xlsx")
    settings_path = str(workbook_dir / "app_settings.json")

    with open(settings_path, "w") as f:
        json.dump({"data_file": xlsx_path}, f)

    import services.excel_service as svc

    monkeypatch.setattr(svc, "_SETTINGS_FILE", settings_path)
    monkeypatch.setattr(svc, "_DEFAULT_FILE", xlsx_path)

    return xlsx_path


@pytest.fixture()
def flask_client(patch_data_file):
    """Flask test client wired to the fixture workbook."""
    from app import app

    app.config["TESTING"] = True
    with app.test_client() as client:
        yield client
