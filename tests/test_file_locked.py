"""File-lock detection tests — simulate Excel holding the workbook open."""

import os

import pytest

from services.excel_service import add_leave


def test_locked_file_raises_ioerror(patch_data_file):
    """Creating a ~$<name> sidecar simulates Excel's file lock."""
    dirname = os.path.dirname(patch_data_file)
    basename = os.path.basename(patch_data_file)
    lock_file = os.path.join(dirname, "~$" + basename)

    try:
        with open(lock_file, "w") as f:
            f.write("lock")

        with pytest.raises(IOError, match="open in another application"):
            add_leave("vacation", "Alice", 2026, 5, 1, "test")
    finally:
        if os.path.exists(lock_file):
            os.remove(lock_file)
