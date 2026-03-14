"""
Management command to scrape case information using Google AI.

Usage: python manage.py scrape_case <source_path> [<source_path> ...] [options]
"""

from datetime import datetime
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError

from cases.services.case_scraper import CaseScraper


class Command(BaseCommand):
    help = "Scrape case information from source files using Google AI"

    def add_arguments(self, parser):
        parser.add_argument(
            "source_paths",
            nargs="+",
            type=str,
            help="One or more source file paths to scrape",
        )
        parser.add_argument(
            "--language",
            type=str,
            default="en",
            choices=["en", "np"],
            help="Output language: en (English) or np (Nepali). Default: en",
        )
        parser.add_argument(
            "--work-dir",
            type=str,
            default="/tmp",
            help="Base directory for work files (default: /tmp)",
        )
        parser.add_argument(
            "--service-account",
            type=str,
            default=".service-account-key.json",
            help="Path to Google service account key file (default: .service-account-key.json)",
        )
        parser.add_argument(
            "--project",
            type=str,
            help="Google Cloud project ID (defaults to project_id from service account key)",
        )
        parser.add_argument(
            "--location", type=str, default="us-central1", help="Google Cloud location"
        )
        parser.add_argument(
            "--model", type=str, default="gemini-2.5-pro", help="Google AI model to use"
        )
        parser.add_argument(
            "--create-db-entry",
            action="store_true",
            help="Create database entry after successful scraping",
        )
        parser.add_argument(
            "--no-confirm",
            action="store_true",
            help="Skip confirmation prompt before database import (requires --create-db-entry)",
        )
        parser.add_argument(
            "--case-type",
            type=str,
            default="CORRUPTION",
            choices=["CORRUPTION", "PROMISES"],
            help="Case type for database entry (default: CORRUPTION)",
        )
        parser.add_argument(
            "--case-state",
            type=str,
            default="DRAFT",
            choices=["DRAFT", "IN_REVIEW", "PUBLISHED"],
            help="Initial case state (default: DRAFT)",
        )

    def handle(self, *args, **options):
        """Execute the scrape command."""
        start_time = datetime.now()

        source_paths = options["source_paths"]
        language = options["language"]
        work_dir_base = options["work_dir"]
        service_account_path = options["service_account"]
        project = options["project"]
        location = options["location"]
        model = options["model"]

        # Create work directory
        timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
        work_dir = Path(work_dir_base) / f"scrape-case-{timestamp}"

        # Output work directory to stdout
        print(str(work_dir))

        self.log_error(f"Created work directory: {work_dir}")

        try:
            # Initialize scraper service
            self.log_error("Initializing case scraper...")
            scraper = CaseScraper(
                service_account_path=service_account_path,
                project=project,
                location=location,
                model=model,
                language=language,
                logger=self.stderr,
            )

            # Log source files
            self.log_error("Reading source files...")
            for path_str in source_paths:
                path = Path(path_str)
                if path.exists():
                    content_length = len(path.read_text(encoding="utf-8"))
                    self.log_error(
                        f"  Read {content_length} characters from {path_str}"
                    )

            # Scrape case
            self.log_error("\nPhase 1: Extracting information...")
            case, phase1_file, result_file = scraper.scrape_case(
                source_paths=source_paths, work_dir=work_dir
            )

            # Calculate elapsed time
            end_time = datetime.now()
            elapsed = end_time - start_time
            elapsed_seconds = elapsed.total_seconds()

            self.log_error("\nCompleted successfully!")
            self.log_error(f"  Case title: {case.title}")
            self.log_error(f"  Allegations: {len(case.key_allegations)}")
            self.log_error(f"  Timeline entries: {len(case.timeline)}")
            self.log_error(f"  Sources: {len(case.sources)}")
            self.log_error(f"  Result saved to: {result_file}")
            self.log_error(f"  Total time elapsed: {elapsed_seconds:.2f} seconds")

            # Import to database if requested
            if options["create_db_entry"]:
                self.import_to_database(
                    result_file,
                    case,
                    no_confirm=options["no_confirm"],
                    case_type=options["case_type"],
                    case_state=options["case_state"],
                )

        except FileNotFoundError as e:
            raise CommandError(str(e))
        except ValueError as e:
            raise CommandError(str(e))
        except Exception as e:
            raise CommandError(f"Scraping failed: {e}")

    def import_to_database(
        self,
        json_file,
        case_data,
        no_confirm=False,
        case_type="CORRUPTION",
        case_state="DRAFT",
    ):
        """
        Import scraped case to database with confirmation.

        Args:
            json_file: Path to the case-result.json file
            case_data: Parsed Case object
            no_confirm: Skip confirmation prompt if True
            case_type: Case type (CORRUPTION or PROMISES)
            case_state: Initial case state (DRAFT, IN_REVIEW, or PUBLISHED)
        """
        from cases.services.case_importer import CaseImporter

        # Show preview and confirm
        if not no_confirm:
            self.log_error("\n" + "=" * 60)
            self.log_error("DATABASE IMPORT PREVIEW")
            self.log_error("=" * 60)
            self.log_error(f"Title: {case_data.title}")
            self.log_error(f"Case Type: {case_type}")
            self.log_error(f"Initial State: {case_state}")
            self.log_error(
                f"Alleged entities: {', '.join(case_data.alleged_entities) if case_data.alleged_entities else 'None'}"
            )
            self.log_error(
                f"Related entities: {', '.join(case_data.related_entities) if case_data.related_entities else 'None'}"
            )
            self.log_error(f"Key allegations: {len(case_data.key_allegations)}")
            self.log_error(f"Timeline entries: {len(case_data.timeline)}")
            self.log_error(f"Sources: {len(case_data.sources)}")
            self.log_error(
                f"Tags: {', '.join(case_data.tags) if case_data.tags else 'None'}"
            )
            self.log_error("=" * 60)

            try:
                response = input("\nProceed with database import? [y/N]: ")
                if response.lower() not in ["y", "yes"]:
                    self.log_error("Database import cancelled.")
                    return
            except (KeyboardInterrupt, EOFError):
                self.log_error("\nDatabase import cancelled.")
                return

        try:
            self.log_error("\nImporting to database...")
            importer = CaseImporter(logger=self.stderr)
            db_case = importer.import_from_json(
                json_file, case_type=case_type, case_state=case_state
            )

            self.log_error("\n✓ Database import successful!")
            self.log_error(f"  Case ID: {db_case.case_id}")
            self.log_error(f"  State: {db_case.state}")
            self.log_error(f"  Type: {db_case.case_type}")
            self.log_error(f"  Updated at: {db_case.updated_at.isoformat()}")

        except Exception as e:
            self.log_error(f"\n✗ Database import failed: {e}")
            raise CommandError(f"Failed to import case to database: {e}")

    def log_error(self, message):
        """Write log messages to stderr."""
        self.stderr.write(message)
