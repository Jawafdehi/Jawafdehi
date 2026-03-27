"""
Management command to merge multiple JawafEntity records into one.

Usage: python manage.py merge_entities <entity_id_1> <entity_id_2> [<entity_id_3> ...]

This command will:
1. Display details of all entities to be merged
2. Show a preview of the merged entity
3. Ask for confirmation
4. Merge all entities into the target (first entity with nes_id, or first entity)
5. Update all references in cases and document sources
6. Delete the source entities
"""

from django.core.management.base import BaseCommand, CommandError

from cases.services import EntityMergeError, analyze_merge_impact, merge_entities_by_ids


class Command(BaseCommand):
    help = "Merge multiple entities into one, updating all references"

    def add_arguments(self, parser):
        parser.add_argument(
            "entity_ids",
            nargs="+",
            type=int,
            help="IDs of entities to merge (minimum 2 required)",
        )

    def handle(self, *args, **options):
        """Merge entities after confirmation."""
        entity_ids = options["entity_ids"]

        try:
            impact = analyze_merge_impact(entity_ids)
        except EntityMergeError as exc:
            raise CommandError(str(exc))

        # Display entity details
        self.stdout.write(self.style.WARNING("\n=== Entities to Merge ===\n"))
        for i, entity in enumerate(impact["entities"], 1):
            self.stdout.write(f"{i}. Entity ID: {entity.id}")
            self.stdout.write(f'   nes_id: {entity.nes_id or "(not set)"}')
            self.stdout.write(f'   display_name: {entity.display_name or "(not set)"}')
            self.stdout.write(f"   String representation: {entity}")

            # Show usage statistics
            case_relationship_count = entity.case_relationships.count()
            source_count = entity.document_sources.filter(is_deleted=False).count()

            usage_parts = []
            if case_relationship_count > 0:
                usage_parts.append(f"{case_relationship_count} case relationship(s)")
            if source_count > 0:
                usage_parts.append(f"{source_count} source(s)")

            if usage_parts:
                self.stdout.write(f'   Used in: {", ".join(usage_parts)}')
            else:
                self.stdout.write("   Used in: (no references)")

            self.stdout.write("")

        # Show preview of merged entity
        self.stdout.write(self.style.WARNING("=== Merged Entity Preview ===\n"))
        target_entity = impact["target_entity"]
        self.stdout.write(f"Target Entity ID: {target_entity.id}")
        self.stdout.write(f'nes_id: {impact["merged_nes_id"] or "(not set)"}')
        self.stdout.write(
            f'display_name: {impact["merged_display_name"] or "(not set)"}'
        )

        # Warn about conflicts
        if len(impact["all_nes_ids"]) > 1:
            self.stdout.write(
                self.style.ERROR(
                    f'\nWARNING: Multiple nes_ids found: {", ".join(impact["all_nes_ids"])}'
                )
            )
            self.stdout.write(
                self.style.ERROR(
                    f'Only the first one will be kept: {impact["merged_nes_id"]}'
                )
            )

        if len(impact["all_display_names"]) > 1:
            self.stdout.write(
                self.style.WARNING(
                    f'\nNote: Multiple display_names found: {", ".join(impact["all_display_names"])}'
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    f'Using display_name from target entity: {impact["merged_display_name"]}'
                )
            )

        # Ask for confirmation
        self.stdout.write("")
        confirm = input("Do you want to proceed with the merge? (yes/no): ")

        if confirm.lower() != "yes":
            self.stdout.write(self.style.ERROR("Merge cancelled"))
            return

        try:
            result = merge_entities_by_ids(entity_ids)
            self.stdout.write(f"Updated target entity {result['target_entity'].id}")

            self.stdout.write(
                self.style.SUCCESS(
                    f"\nSuccessfully merged {result['selected_entities_count']} entities into entity {result['target_entity'].id}"
                )
            )

        except EntityMergeError as exc:
            raise CommandError(str(exc))
        except Exception as exc:
            raise CommandError(f"Error during merge: {str(exc)}")
