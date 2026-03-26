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
from django.db import transaction
from cases.models import CaseEntityRelationship, JawafEntity


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

        # Validate minimum number of entities
        if len(entity_ids) < 2:
            raise CommandError("At least 2 entity IDs are required for merging")

        # Fetch all entities
        entities = []
        for entity_id in entity_ids:
            try:
                entity = JawafEntity.objects.get(pk=entity_id)
                entities.append(entity)
            except JawafEntity.DoesNotExist:
                raise CommandError(f"Entity with ID {entity_id} does not exist")

        # Display entity details
        self.stdout.write(self.style.WARNING("\n=== Entities to Merge ===\n"))
        for i, entity in enumerate(entities, 1):
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

        # Determine target entity (first one with nes_id, or first entity)
        target_entity = None
        for entity in entities:
            if entity.nes_id:
                target_entity = entity
                break

        if not target_entity:
            target_entity = entities[0]

        # Collect all nes_ids and display_names
        all_nes_ids = [e.nes_id for e in entities if e.nes_id]
        all_display_names = [e.display_name for e in entities if e.display_name]

        # Determine merged entity properties
        merged_nes_id = all_nes_ids[0] if all_nes_ids else None
        merged_display_name = target_entity.display_name or (
            all_display_names[0] if all_display_names else None
        )

        # Show preview of merged entity
        self.stdout.write(self.style.WARNING("=== Merged Entity Preview ===\n"))
        self.stdout.write(f"Target Entity ID: {target_entity.id}")
        self.stdout.write(f'nes_id: {merged_nes_id or "(not set)"}')
        self.stdout.write(f'display_name: {merged_display_name or "(not set)"}')

        # Warn about conflicts
        if len(all_nes_ids) > 1:
            self.stdout.write(
                self.style.ERROR(
                    f'\nWARNING: Multiple nes_ids found: {", ".join(all_nes_ids)}'
                )
            )
            self.stdout.write(
                self.style.ERROR(f"Only the first one will be kept: {merged_nes_id}")
            )

        if len(all_display_names) > 1:
            self.stdout.write(
                self.style.WARNING(
                    f'\nNote: Multiple display_names found: {", ".join(all_display_names)}'
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    f"Using display_name from target entity: {merged_display_name}"
                )
            )

        # Ask for confirmation
        self.stdout.write("")
        confirm = input("Do you want to proceed with the merge? (yes/no): ")

        if confirm.lower() != "yes":
            self.stdout.write(self.style.ERROR("Merge cancelled"))
            return

        # Perform the merge in a transaction
        try:
            with transaction.atomic():
                source_entities = [e for e in entities if e.id != target_entity.id]

                # Update target entity with merged properties
                target_entity.nes_id = merged_nes_id
                target_entity.display_name = merged_display_name
                target_entity.save()

                self.stdout.write(f"Updated target entity {target_entity.id}")

                # Merge references from source entities to target entity
                for source_entity in source_entities:
                    self.stdout.write(
                        f"Merging entity {source_entity.id} into {target_entity.id}..."
                    )

                    # Update unified entity relationships
                    for relationship in CaseEntityRelationship.objects.filter(
                        entity=source_entity
                    ):
                        CaseEntityRelationship.objects.get_or_create(
                            case=relationship.case,
                            entity=target_entity,
                            relationship_type=relationship.relationship_type,
                            defaults={"notes": relationship.notes},
                        )
                    CaseEntityRelationship.objects.filter(entity=source_entity).delete()

                    # Update DocumentSource related_entities
                    for source in source_entity.document_sources.all():
                        source.related_entities.remove(source_entity)
                        source.related_entities.add(target_entity)

                    # Delete the source entity (now that all references are updated)
                    # We need to use the actual delete method, not the overridden one
                    # that checks for usage
                    super(JawafEntity, source_entity).delete()
                    self.stdout.write(f"  Deleted entity {source_entity.id}")

            self.stdout.write(
                self.style.SUCCESS(
                    f"\nSuccessfully merged {len(entities)} entities into entity {target_entity.id}"
                )
            )

        except Exception as e:
            raise CommandError(f"Error during merge: {str(e)}")
