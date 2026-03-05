"""
Tests for the process_queue management command.

Covers:
- Command fails with CommandError when NES_DB_PATH is not configured
- Command fails with CommandError when NES_DB_PATH does not exist
- Command fails with CommandError when NES_DB_PATH is not a directory
- Command succeeds when no approved items to process
- Command reports success when all items complete
- Command reports warning when some items fail
- Command exits with code 1 when ALL items fail
- Command respects --verbose flag for detailed error logging
- Command handles critical exceptions from the processor

See .kiro/specs/nes-queue-system/tasks.md §8 for requirements.
"""

import asyncio
from io import StringIO
from pathlib import Path
from unittest.mock import AsyncMock, patch, MagicMock

import pytest

from django.core.management import call_command
from django.core.management.base import CommandError

from nesq.processor import ProcessingResult


# ============================================================================
# NES_DB_PATH validation
# ============================================================================


class TestNesDbPathValidation:
    """Test that the command validates NES_DB_PATH correctly."""

    def test_missing_nes_db_path_raises_error(self, settings):
        """Command should fail if NES_DB_PATH is not configured."""
        settings.NES_DB_PATH = None

        with pytest.raises(CommandError, match="NES_DB_PATH is not configured"):
            call_command("process_queue")

    def test_empty_string_nes_db_path_raises_error(self, settings):
        """Command should fail if NES_DB_PATH is empty string."""
        settings.NES_DB_PATH = ""

        with pytest.raises(CommandError, match="NES_DB_PATH is not configured"):
            call_command("process_queue")

    def test_nonexistent_path_raises_error(self, settings, tmp_path):
        """Command should fail if NES_DB_PATH points to a nonexistent path."""
        settings.NES_DB_PATH = str(tmp_path / "does-not-exist")

        with pytest.raises(CommandError, match="does not exist"):
            call_command("process_queue")

    def test_file_path_raises_error(self, settings, tmp_path):
        """Command should fail if NES_DB_PATH points to a file, not directory."""
        file_path = tmp_path / "not-a-dir.txt"
        file_path.touch()
        settings.NES_DB_PATH = str(file_path)

        with pytest.raises(CommandError, match="not a directory"):
            call_command("process_queue")


# ============================================================================
# Successful processing
# ============================================================================


class TestProcessQueueSuccess:
    """Test successful command execution scenarios."""

    @patch("nesq.management.commands.process_queue.QueueProcessor")
    def test_no_items_to_process(self, MockProcessor, settings, tmp_path):
        """When no approved items exist, should print notice message."""
        settings.NES_DB_PATH = str(tmp_path)

        mock_instance = MockProcessor.return_value
        mock_instance.process_approved_items = AsyncMock(
            return_value=ProcessingResult(processed=0, completed=0, failed=0)
        )

        out = StringIO()
        call_command("process_queue", stdout=out)

        output = out.getvalue()
        assert "No approved items to process" in output

    @patch("nesq.management.commands.process_queue.QueueProcessor")
    def test_all_items_completed(self, MockProcessor, settings, tmp_path):
        """When all items complete, should print success message."""
        settings.NES_DB_PATH = str(tmp_path)

        mock_instance = MockProcessor.return_value
        mock_instance.process_approved_items = AsyncMock(
            return_value=ProcessingResult(processed=3, completed=3, failed=0)
        )

        out = StringIO()
        call_command("process_queue", stdout=out)

        output = out.getvalue()
        assert "3 item(s)" in output
        assert "3 completed" in output
        assert "0 failed" in output

    @patch("nesq.management.commands.process_queue.QueueProcessor")
    def test_processor_receives_nes_db_path(self, MockProcessor, settings, tmp_path):
        """QueueProcessor should be instantiated with the correct nes_db_path."""
        settings.NES_DB_PATH = str(tmp_path)

        mock_instance = MockProcessor.return_value
        mock_instance.process_approved_items = AsyncMock(
            return_value=ProcessingResult()
        )

        call_command("process_queue")

        MockProcessor.assert_called_once_with(nes_db_path=str(tmp_path))


# ============================================================================
# Partial and complete failures
# ============================================================================


class TestProcessQueueFailures:
    """Test command behavior when items fail."""

    @patch("nesq.management.commands.process_queue.QueueProcessor")
    def test_partial_failure_prints_warning(self, MockProcessor, settings, tmp_path):
        """When some items fail, should print warning (not success)."""
        settings.NES_DB_PATH = str(tmp_path)

        mock_instance = MockProcessor.return_value
        mock_instance.process_approved_items = AsyncMock(
            return_value=ProcessingResult(
                processed=3, completed=2, failed=1,
                errors=[{"item_id": 42, "error": "Entity not found"}],
            )
        )

        out = StringIO()
        call_command("process_queue", stdout=out)

        output = out.getvalue()
        assert "2 completed" in output
        assert "1 failed" in output

    @patch("nesq.management.commands.process_queue.QueueProcessor")
    def test_all_items_failed_exits_nonzero(self, MockProcessor, settings, tmp_path):
        """When ALL items fail (0 completed), command should exit with code 1."""
        settings.NES_DB_PATH = str(tmp_path)

        mock_instance = MockProcessor.return_value
        mock_instance.process_approved_items = AsyncMock(
            return_value=ProcessingResult(
                processed=2, completed=0, failed=2,
                errors=[
                    {"item_id": 1, "error": "Entity not found"},
                    {"item_id": 2, "error": "Disk full"},
                ],
            )
        )

        with pytest.raises(SystemExit, match="1"):
            call_command("process_queue")

    @patch("nesq.management.commands.process_queue.QueueProcessor")
    def test_critical_processor_error_raises_command_error(
        self, MockProcessor, settings, tmp_path
    ):
        """If processor.process_approved_items() raises, should raise CommandError."""
        settings.NES_DB_PATH = str(tmp_path)

        mock_instance = MockProcessor.return_value
        mock_instance.process_approved_items = AsyncMock(
            side_effect=RuntimeError("Database connection lost")
        )

        with pytest.raises(CommandError, match="Critical error"):
            call_command("process_queue")


# ============================================================================
# Verbose flag
# ============================================================================


class TestVerboseFlag:
    """Test the --verbose command option."""

    @patch("nesq.management.commands.process_queue.QueueProcessor")
    def test_verbose_prints_db_path(self, MockProcessor, settings, tmp_path):
        """With --verbose, should print the NES database path."""
        settings.NES_DB_PATH = str(tmp_path)

        mock_instance = MockProcessor.return_value
        mock_instance.process_approved_items = AsyncMock(
            return_value=ProcessingResult()
        )

        out = StringIO()
        call_command("process_queue", "--verbose", stdout=out)

        output = out.getvalue()
        assert str(tmp_path) in output

    @patch("nesq.management.commands.process_queue.QueueProcessor")
    def test_verbose_prints_error_details(self, MockProcessor, settings, tmp_path):
        """With --verbose and failures, should print error details to stderr."""
        settings.NES_DB_PATH = str(tmp_path)

        mock_instance = MockProcessor.return_value
        mock_instance.process_approved_items = AsyncMock(
            return_value=ProcessingResult(
                processed=1, completed=0, failed=1,
                errors=[{"item_id": 99, "error": "Entity 'xyz' not found"}],
            )
        )

        out = StringIO()
        err = StringIO()

        with pytest.raises(SystemExit):
            call_command("process_queue", "--verbose", stdout=out, stderr=err)

        error_output = err.getvalue()
        assert "NESQ-99" in error_output
        assert "Entity 'xyz' not found" in error_output

    @patch("nesq.management.commands.process_queue.QueueProcessor")
    def test_no_verbose_suppresses_error_details(
        self, MockProcessor, settings, tmp_path
    ):
        """Without --verbose, error details should NOT be printed to stderr."""
        settings.NES_DB_PATH = str(tmp_path)

        mock_instance = MockProcessor.return_value
        mock_instance.process_approved_items = AsyncMock(
            return_value=ProcessingResult(
                processed=1, completed=0, failed=1,
                errors=[{"item_id": 99, "error": "Entity 'xyz' not found"}],
            )
        )

        out = StringIO()
        err = StringIO()

        with pytest.raises(SystemExit):
            call_command("process_queue", stdout=out, stderr=err)

        error_output = err.getvalue()
        assert "NESQ-99" not in error_output
