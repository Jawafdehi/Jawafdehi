"""Management command to process approved NES Queue items.

This command is the CLI entry point for the NES Queue processor. It:
1. Reads NES_DB_PATH from Django settings
2. Verifies the nes-db repository path exists and is accessible
3. Creates a QueueProcessor and runs process_approved_items()
4. Logs a processing summary to stdout
5. Exits with code 0 on success, 1 on critical errors

Intended to be invoked by the GitHub Actions daily cron workflow:
    poetry run python manage.py process_queue

After this command completes, the workflow handles git add/commit/push
to persist any nes-db file changes. See Task 9 / process-nes-queue.yml.

See .kiro/specs/nes-queue-system/ for full specification.
"""

import asyncio
import sys
from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from nesq.processor import QueueProcessor


class Command(BaseCommand):
    help = (
        "Process approved NES Queue items by applying entity changes "
        "to the nes-db file database via the NES PublicationService."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--verbose",
            action="store_true",
            help="Enable detailed logging of each item processed.",
        )

    def handle(self, *args, **options):
        verbose = options["verbose"]

        # 1. Read NES_DB_PATH from settings
        nes_db_path = settings.NES_DB_PATH
        if not nes_db_path:
            raise CommandError(
                "NES_DB_PATH is not configured. "
                "Set the NES_DB_PATH environment variable to the path "
                "of your local nes-db repository clone."
            )

        # 2. Verify the path exists and is accessible
        db_path = Path(nes_db_path)
        if not db_path.exists():
            raise CommandError(
                f"NES_DB_PATH does not exist: {nes_db_path}\n"
                "Ensure the nes-db repository is cloned at this path."
            )

        if not db_path.is_dir():
            raise CommandError(
                f"NES_DB_PATH is not a directory: {nes_db_path}\n"
                "NES_DB_PATH should point to the nes-db repository root."
            )

        if verbose:
            self.stdout.write(f"Using NES database at: {nes_db_path}")

        # 3. Create processor and run
        processor = QueueProcessor(nes_db_path=nes_db_path)

        try:
            result = asyncio.run(processor.process_approved_items())
        except Exception as e:
            raise CommandError(f"Critical error during queue processing: {e}")

        # 4. Log processing summary
        if result.processed == 0:
            self.stdout.write(
                self.style.NOTICE("No approved items to process.")
            )
            return

        summary = (
            f"Processed {result.processed} item(s): "
            f"{result.completed} completed, {result.failed} failed"
        )

        if result.failed == 0:
            self.stdout.write(self.style.SUCCESS(summary))
        else:
            self.stdout.write(self.style.WARNING(summary))

            if verbose:
                for error in result.errors:
                    self.stderr.write(
                        self.style.ERROR(
                            f"  NESQ-{error['item_id']}: {error['error']}"
                        )
                    )

        # 5. Exit with non-zero if ALL items failed
        if result.completed == 0 and result.failed > 0:
            sys.exit(1)
