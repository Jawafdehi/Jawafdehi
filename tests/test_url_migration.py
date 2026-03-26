"""
Tests for URL field migration from URLField to JSONField.

These tests verify both the migration process and post-migration behavior:
- Tests the actual migration logic that converts string URLs to lists
- Confirms the field accepts and stores lists of URLs after migration
- Validates serialization works correctly with the new JSONField type
"""

import pytest
from django.test import TransactionTestCase
from django.db import connection
from django.core.management import call_command
from django.db.migrations.exceptions import IrreversibleError
from cases.models import DocumentSource


class TestURLMigrationProcess(TransactionTestCase):
    """
    Test the actual migration process from URLField to JSONField.

    Uses TransactionTestCase to allow migration testing with database schema changes.
    """

    @staticmethod
    def get_historical_model(connection, migration_tuple, app_label, model_name):
        """
        Helper to get historical model at a specific migration state.

        Args:
            connection: Database connection
            migration_tuple: Tuple of (app_label, migration_name)
            app_label: App label for the model
            model_name: Model name

        Returns:
            Historical model class at the specified migration state
        """
        from django.db.migrations.executor import MigrationExecutor

        executor = MigrationExecutor(connection)
        project_state = executor.loader.project_state(migration_tuple)
        return project_state.apps.get_model(app_label, model_name)

    def setUp(self):
        """Set up test by migrating to the state before our migration."""
        from django.utils import timezone

        # Migrate to the state before our URL migration
        try:
            call_command("migrate", "cases", "0009_merge_20260112_0309", verbosity=0)
        except IrreversibleError:
            self.skipTest(
                "Cannot migrate back to 0009 because entity relationship migration is intentionally irreversible."
            )

        # Get the historical model at migration 0009
        DocumentSource = self.get_historical_model(
            connection, ("cases", "0009_merge_20260112_0309"), "cases", "DocumentSource"
        )

        # Create test data with old URLField format (single string) using ORM
        now = timezone.now()
        DocumentSource.objects.bulk_create(
            [
                DocumentSource(
                    source_id="source:test:001",
                    title="Test Source 1",
                    description="Description 1",
                    url="https://example.com/doc1.pdf",
                    is_deleted=False,
                    created_at=now,
                    updated_at=now,
                ),
                DocumentSource(
                    source_id="source:test:002",
                    title="Test Source 2",
                    description="Description 2",
                    url="https://example.com/doc2.pdf",
                    is_deleted=False,
                    created_at=now,
                    updated_at=now,
                ),
                DocumentSource(
                    source_id="source:test:003",
                    title="Empty URL Source",
                    description="Description 3",
                    url="",
                    is_deleted=False,
                    created_at=now,
                    updated_at=now,
                ),
                DocumentSource(
                    source_id="source:test:004",
                    title="Null URL Source",
                    description="Description 4",
                    url=None,
                    is_deleted=False,
                    created_at=now,
                    updated_at=now,
                ),
            ]
        )

    def test_migration_converts_string_urls_to_lists(self):
        """Test that migration converts single URL strings to JSON arrays."""
        # Run the migration
        call_command("migrate", "cases", "0010_change_url_to_jsonfield", verbosity=0)

        # Get the historical model at migration 0010 state
        DocumentSource = self.get_historical_model(
            connection,
            ("cases", "0010_change_url_to_jsonfield"),
            "cases",
            "DocumentSource",
        )

        # Verify the data was converted correctly
        source1 = DocumentSource.objects.get(source_id="source:test:001")
        assert isinstance(source1.url, list), "URL should be converted to list"
        assert source1.url == [
            "https://example.com/doc1.pdf"
        ], "URL should be wrapped in list"

        source2 = DocumentSource.objects.get(source_id="source:test:002")
        assert source2.url == ["https://example.com/doc2.pdf"]

    def test_migration_handles_empty_urls(self):
        """Test that migration converts empty strings to empty lists."""
        call_command("migrate", "cases", "0010_change_url_to_jsonfield", verbosity=0)

        # Get the historical model at migration 0010 state
        DocumentSource = self.get_historical_model(
            connection,
            ("cases", "0010_change_url_to_jsonfield"),
            "cases",
            "DocumentSource",
        )

        source = DocumentSource.objects.get(source_id="source:test:003")
        assert source.url == [], "Empty string should become empty list"

    def test_migration_handles_null_urls(self):
        """Test that migration converts NULL values to empty lists."""
        call_command("migrate", "cases", "0010_change_url_to_jsonfield", verbosity=0)

        # Get the historical model at migration 0010 state
        DocumentSource = self.get_historical_model(
            connection,
            ("cases", "0010_change_url_to_jsonfield"),
            "cases",
            "DocumentSource",
        )

        source = DocumentSource.objects.get(source_id="source:test:004")
        assert source.url == [], "NULL should become empty list"

    def test_reverse_migration_converts_lists_back_to_strings(self):
        """Test that reverse migration converts lists back to single URL strings."""
        # First migrate forward
        call_command("migrate", "cases", "0010_change_url_to_jsonfield", verbosity=0)

        # Get the historical model at migration 0010 state
        DocumentSource = self.get_historical_model(
            connection,
            ("cases", "0010_change_url_to_jsonfield"),
            "cases",
            "DocumentSource",
        )

        # Verify forward migration worked
        source = DocumentSource.objects.get(source_id="source:test:001")
        assert isinstance(source.url, list)

        # Now migrate backward
        call_command("migrate", "cases", "0009_merge_20260112_0309", verbosity=0)

        # Verify reverse migration worked (takes first URL from list)
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT url FROM cases_documentsource WHERE source_id = %s",
                ["source:test:001"],
            )
            url_value = cursor.fetchone()[0]
            assert (
                url_value == "https://example.com/doc1.pdf"
            ), "Should revert to first URL string"

    def tearDown(self):
        """Restore DB schema to latest migrations after each test before flush."""
        call_command("migrate", verbosity=0)
        super().tearDown()

    @classmethod
    def tearDownClass(cls):
        """Restore DB schema to latest migrations after migration tests."""
        # Re-apply all migrations to restore schema for subsequent tests
        call_command("migrate", verbosity=0)
        super().tearDownClass()


@pytest.mark.django_db
class TestURLFieldPostMigration:
    """Test suite for URL field behavior after migration to JSONField."""

    def test_url_field_stores_list(self):
        """Verify url field accepts and persists a list of URLs."""
        source = DocumentSource.objects.create(
            title="Test Source", url=["https://example.com"]
        )

        assert isinstance(source.url, list)
        assert source.url == ["https://example.com"]

    def test_multiple_urls_storage(self):
        """Verify multiple URLs can be stored and retrieved."""
        urls = ["https://example.com", "https://backup.example.com"]
        source = DocumentSource.objects.create(title="Test Source", url=urls)

        source.refresh_from_db()
        assert source.url == urls

    def test_url_serialization(self):
        """Verify URLs serialize correctly in API responses."""
        from cases.serializers import DocumentSourceSerializer

        source = DocumentSource.objects.create(
            title="Test Source", url=["https://example.com", "https://backup.com"]
        )

        serializer = DocumentSourceSerializer(source)
        assert serializer.data["url"] == ["https://example.com", "https://backup.com"]
