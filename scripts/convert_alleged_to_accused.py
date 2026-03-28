#!/usr/bin/env python
"""One-off script to convert ALLEGED case/entity relationships to ACCUSED."""

import argparse
import os
from pathlib import Path
import sys

import django
from django.db import transaction


def configure_django() -> None:
    """Initialize Django so ORM models can be used from this script."""
    service_root = Path(__file__).resolve().parents[1]
    if str(service_root) not in sys.path:
        sys.path.insert(0, str(service_root))
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    django.setup()


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Convert case/entity relationships from ALLEGED to ACCUSED.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Apply changes. Without this flag the script runs in dry-run mode.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    configure_django()

    from cases.models import CaseEntityRelationship, RelationshipType

    alleged_rows = list(
        CaseEntityRelationship.objects.filter(
            relationship_type=RelationshipType.ALLEGED
        ).values_list("id", "case_id", "entity_id")
    )
    accused_pairs = set(
        CaseEntityRelationship.objects.filter(
            relationship_type=RelationshipType.ACCUSED
        ).values_list("case_id", "entity_id")
    )

    duplicate_ids = []
    convertible_ids = []
    for relationship_id, case_id, entity_id in alleged_rows:
        if (case_id, entity_id) in accused_pairs:
            duplicate_ids.append(relationship_id)
        else:
            convertible_ids.append(relationship_id)

    print(
        f"Found {len(alleged_rows)} ALLEGED relationships: "
        f"{len(convertible_ids)} convertible, {len(duplicate_ids)} duplicates."
    )

    if not args.apply:
        print("Dry run only. Re-run with --apply to perform the conversion.")
        return 0

    with transaction.atomic():
        deleted_duplicates = 0
        if duplicate_ids:
            deleted_duplicates, _ = CaseEntityRelationship.objects.filter(
                id__in=duplicate_ids
            ).delete()

        converted_count = 0
        if convertible_ids:
            converted_count = CaseEntityRelationship.objects.filter(
                id__in=convertible_ids
            ).update(relationship_type=RelationshipType.ACCUSED)

    remaining_alleged = CaseEntityRelationship.objects.filter(
        relationship_type=RelationshipType.ALLEGED
    ).count()
    accused_total = CaseEntityRelationship.objects.filter(
        relationship_type=RelationshipType.ACCUSED
    ).count()

    print(f"Converted {converted_count} relationships to ACCUSED.")
    print(f"Removed {deleted_duplicates} duplicate ALLEGED relationships.")
    print(f"Remaining ALLEGED relationships: {remaining_alleged}")
    print(f"Total ACCUSED relationships: {accused_total}")

    return 0


if __name__ == "__main__":
    sys.exit(main())
