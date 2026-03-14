"""
Migration: Deprecate Case Revision System

1. Data migration: for each distinct case_id, keep only the "best" row
   (highest version, preferring PUBLISHED > IN_REVIEW > DRAFT > CLOSED),
   hard-deleting all other rows for that case_id.

2. Schema migration:
   - Remove `version` field from Case
   - Add `notes` TextField (blank, default "")
   - Drop compound indexes on (case_id, state, version) and (state, version)
"""

from django.db import migrations, models


def _state_priority(state):
    """Return sort key for state priority (lower = better)."""
    order = {"PUBLISHED": 0, "IN_REVIEW": 1, "DRAFT": 2, "CLOSED": 3}
    return order.get(state, 99)


def consolidate_case_versions(apps, schema_editor):
    """
    For each distinct case_id, keep only the single best row and hard-delete
    all others.

    Best row = highest version; tie-broken by state priority
    (PUBLISHED > IN_REVIEW > DRAFT > CLOSED).
    """
    Case = apps.get_model("cases", "Case")

    # Collect all unique case_ids
    case_ids = Case.objects.values_list("case_id", flat=True).distinct()

    for case_id in case_ids:
        rows = list(Case.objects.filter(case_id=case_id))

        if len(rows) <= 1:
            # Nothing to consolidate
            continue

        # Pick the "best" row: highest version first, then state priority
        best = max(rows, key=lambda r: (r.version, -_state_priority(r.state)))

        # Hard-delete all other rows for this case_id
        Case.objects.filter(case_id=case_id).exclude(pk=best.pk).delete()


def noop(apps, schema_editor):
    """Reverse: no-op (deleted rows cannot be recovered)."""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("cases", "0011_add_source_type_field"),
    ]

    operations = [
        # 1. Data migration first (while version field still exists)
        migrations.RunPython(consolidate_case_versions, noop),
        # 2. Add notes field
        migrations.AddField(
            model_name="case",
            name="notes",
            field=models.TextField(
                blank=True,
                default="",
                help_text="Internal notes (markdown supported)",
            ),
        ),
        # 3. Remove old compound indexes before dropping the field
        migrations.RemoveIndex(
            model_name="case",
            name="cases_case_case_id_01ca3c_idx",
        ),
        migrations.RemoveIndex(
            model_name="case",
            name="cases_case_state_0b1ac4_idx",
        ),
        # 4. Remove version field
        migrations.RemoveField(
            model_name="case",
            name="version",
        ),
    ]
