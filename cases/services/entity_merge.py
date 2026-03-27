"""Entity merge service for Jawafdehi entities.

This module centralizes merge logic so it can be reused by both
management commands and Django Admin actions.
"""

from collections import Counter

from django.db import transaction

from cases.models import CaseEntityRelationship, JawafEntity


class EntityMergeError(Exception):
    """Raised when entity merge preconditions fail."""


def _get_entities_in_requested_order(entity_ids):
    """Return entities preserving requested order and validate IDs."""
    if len(entity_ids) < 2:
        raise EntityMergeError("At least 2 entity IDs are required for merging")

    unique_ids = list(dict.fromkeys(entity_ids))
    entities_by_id = {
        entity.id: entity for entity in JawafEntity.objects.filter(id__in=unique_ids)
    }

    missing_ids = [
        entity_id for entity_id in unique_ids if entity_id not in entities_by_id
    ]
    if missing_ids:
        missing_str = ", ".join(str(entity_id) for entity_id in missing_ids)
        raise EntityMergeError(f"Entity ID(s) not found: {missing_str}")

    return [entities_by_id[entity_id] for entity_id in unique_ids]


def _select_target_entity(entities):
    """Select merge target: first entity with nes_id, else first entity."""
    for entity in entities:
        if entity.nes_id:
            return entity
    return entities[0]


def _merged_properties(entities, target_entity):
    """Compute merged field values using existing command behavior."""
    all_nes_ids = [entity.nes_id for entity in entities if entity.nes_id]
    all_display_names = [
        entity.display_name for entity in entities if entity.display_name
    ]

    merged_nes_id = all_nes_ids[0] if all_nes_ids else None
    merged_display_name = target_entity.display_name or (
        all_display_names[0] if all_display_names else None
    )

    return {
        "all_nes_ids": all_nes_ids,
        "all_display_names": all_display_names,
        "merged_nes_id": merged_nes_id,
        "merged_display_name": merged_display_name,
    }


def analyze_merge_impact(entity_ids):
    """Analyze merge impact before execution.

    Returns a dictionary containing:
    - entities, target_entity, source_entities
    - merged_nes_id, merged_display_name
    - relationship_count, source_count
    - affected_case_ids, affected_source_ids
    - relationship_type_counts
    """
    entities = _get_entities_in_requested_order(entity_ids)
    target_entity = _select_target_entity(entities)
    source_entities = [entity for entity in entities if entity.id != target_entity.id]

    merged = _merged_properties(entities, target_entity)

    relationships = CaseEntityRelationship.objects.filter(
        entity__in=entities
    ).select_related("case")
    affected_case_ids = sorted(
        {
            relationship.case.case_id
            for relationship in relationships
            if relationship.case
        }
    )

    affected_sources = []
    for entity in entities:
        affected_sources.extend(entity.document_sources.all())

    affected_source_ids = sorted(
        {source.source_id for source in affected_sources if source.source_id}
    )

    relationship_type_counts = Counter(
        relationship.relationship_type for relationship in relationships
    )

    return {
        "entities": entities,
        "target_entity": target_entity,
        "source_entities": source_entities,
        "merged_nes_id": merged["merged_nes_id"],
        "merged_display_name": merged["merged_display_name"],
        "all_nes_ids": merged["all_nes_ids"],
        "all_display_names": merged["all_display_names"],
        "relationship_count": relationships.count(),
        "source_count": len(affected_source_ids),
        "affected_case_ids": affected_case_ids,
        "affected_source_ids": affected_source_ids,
        "relationship_type_counts": dict(relationship_type_counts),
    }


def merge_entities_by_ids(entity_ids):
    """Merge multiple entities into one target and return merge summary."""
    impact = analyze_merge_impact(entity_ids)
    target_entity = impact["target_entity"]
    source_entities = impact["source_entities"]

    relationships_migrated = 0
    source_links_migrated = 0

    with transaction.atomic():
        target_entity.nes_id = impact["merged_nes_id"]
        target_entity.display_name = impact["merged_display_name"]
        target_entity.save()

        for source_entity in source_entities:
            source_relationships = CaseEntityRelationship.objects.filter(
                entity=source_entity
            )

            for relationship in source_relationships:
                _, created = CaseEntityRelationship.objects.get_or_create(
                    case=relationship.case,
                    entity=target_entity,
                    relationship_type=relationship.relationship_type,
                    defaults={"notes": relationship.notes},
                )
                if created:
                    relationships_migrated += 1

            source_relationships.delete()

            source_documents = list(source_entity.document_sources.all())
            for source in source_documents:
                source.related_entities.remove(source_entity)
                source.related_entities.add(target_entity)
            source_links_migrated += len(source_documents)

            # Bypass JawafEntity.delete usage checks after references are reassigned.
            super(JawafEntity, source_entity).delete()

    return {
        "target_entity": target_entity,
        "merged_entities_count": len(source_entities),
        "selected_entities_count": len(impact["entities"]),
        "relationships_migrated": relationships_migrated,
        "source_links_migrated": source_links_migrated,
        "affected_case_count": len(impact["affected_case_ids"]),
        "affected_source_count": len(impact["affected_source_ids"]),
    }
