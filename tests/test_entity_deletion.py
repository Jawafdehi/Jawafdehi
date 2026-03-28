"""
Tests for JawafEntity deletion protection.

Ensures entities cannot be deleted if they are referenced by cases or document sources.
"""

import pytest
from django.core.exceptions import ValidationError

from cases.models import (
    CaseEntityRelationship,
    CaseType,
    DocumentSource,
    JawafEntity,
    RelationshipType,
)
from tests.conftest import create_case_with_entities


@pytest.mark.django_db
class TestEntityDeletionProtection:
    """Test that entities cannot be deleted when in use."""

    def test_can_delete_unused_entity(self):
        """Entities not referenced by any case or source can be deleted."""
        entity = JawafEntity.objects.create(
            nes_id="entity:person/test-person", display_name="Test Person"
        )

        entity_id = entity.id
        entity.delete()

        # Verify entity was deleted
        assert not JawafEntity.objects.filter(id=entity_id).exists()

    def test_cannot_delete_entity_used_as_alleged_entity(self):
        """Cannot delete entity if it's an accused entity in any case."""
        case = create_case_with_entities(
            title="Test Case",
            alleged_entities=["entity:person/accused"],
            key_allegations=["Test allegation"],
            case_type=CaseType.CORRUPTION,
            description="Test description",
        )

        entity = (
            case.entity_relationships.filter(relationship_type=RelationshipType.ACCUSED)
            .first()
            .entity
        )

        with pytest.raises(ValidationError) as exc_info:
            entity.delete()

        assert "Cannot delete entity" in str(exc_info.value)
        assert "entity relationship" in str(exc_info.value).lower()

        # Verify entity still exists
        assert JawafEntity.objects.filter(id=entity.id).exists()

    def test_cannot_delete_entity_used_as_related_entity(self):
        """Cannot delete entity if it's a related entity in any case."""
        entity = JawafEntity.objects.create(
            nes_id="entity:person/related-person", display_name="Related Person"
        )

        case = create_case_with_entities(
            title="Test Case",
            alleged_entities=["entity:person/accused"],
            key_allegations=["Test allegation"],
            case_type=CaseType.CORRUPTION,
            description="Test description",
        )
        CaseEntityRelationship.objects.create(
            case=case,
            entity=entity,
            relationship_type=RelationshipType.RELATED,
        )

        with pytest.raises(ValidationError) as exc_info:
            entity.delete()

        assert "Cannot delete entity" in str(exc_info.value)
        assert "entity relationship" in str(exc_info.value).lower()

        # Verify entity still exists
        assert JawafEntity.objects.filter(id=entity.id).exists()

    def test_cannot_delete_entity_used_as_location(self):
        """Cannot delete entity if it's linked to any case relationship."""
        entity = JawafEntity.objects.create(
            nes_id="entity:location/test-location", display_name="Test Location"
        )

        case = create_case_with_entities(
            title="Test Case",
            alleged_entities=["entity:person/accused"],
            key_allegations=["Test allegation"],
            case_type=CaseType.CORRUPTION,
            description="Test description",
        )
        CaseEntityRelationship.objects.create(
            case=case,
            entity=entity,
            relationship_type=RelationshipType.RELATED,
        )

        with pytest.raises(ValidationError) as exc_info:
            entity.delete()

        assert "Cannot delete entity" in str(exc_info.value)
        assert "entity relationship" in str(exc_info.value).lower()

        # Verify entity still exists
        assert JawafEntity.objects.filter(id=entity.id).exists()

    def test_cannot_delete_entity_used_in_document_source(self):
        """Cannot delete entity if it's referenced by a document source."""
        entity = JawafEntity.objects.create(
            nes_id="entity:person/source-person", display_name="Source Person"
        )

        source = DocumentSource.objects.create(
            title="Test Source", description="Test description"
        )
        source.related_entities.add(entity)

        with pytest.raises(ValidationError) as exc_info:
            entity.delete()

        assert "Cannot delete entity" in str(exc_info.value)
        assert "document source" in str(exc_info.value).lower()

        # Verify entity still exists
        assert JawafEntity.objects.filter(id=entity.id).exists()

    def test_cannot_delete_entity_used_in_multiple_places(self):
        """Cannot delete entity if it's used in multiple cases/sources."""
        entity = JawafEntity.objects.create(
            nes_id="entity:person/multi-use", display_name="Multi Use Person"
        )

        # Create two cases using the entity
        case1 = create_case_with_entities(
            title="Case 1",
            alleged_entities=["entity:person/other"],
            key_allegations=["Allegation 1"],
            case_type=CaseType.CORRUPTION,
            description="Description 1",
        )
        CaseEntityRelationship.objects.create(
            case=case1,
            entity=entity,
            relationship_type=RelationshipType.RELATED,
        )

        case2 = create_case_with_entities(
            title="Case 2",
            alleged_entities=["entity:person/another"],
            key_allegations=["Allegation 2"],
            case_type=CaseType.PROMISES,
            description="Description 2",
        )
        CaseEntityRelationship.objects.create(
            case=case2,
            entity=entity,
            relationship_type=RelationshipType.RELATED,
        )

        with pytest.raises(ValidationError) as exc_info:
            entity.delete()

        error_message = str(exc_info.value)
        assert "Cannot delete entity" in error_message
        assert "entity relationship" in error_message.lower()

        # Verify entity still exists
        assert JawafEntity.objects.filter(id=entity.id).exists()

    def test_can_delete_entity_after_removing_all_references(self):
        """Can delete entity after removing it from all cases and sources."""
        case = create_case_with_entities(
            title="Test Case",
            alleged_entities=["entity:person/temp-accused"],
            key_allegations=["Test allegation"],
            case_type=CaseType.CORRUPTION,
            description="Test description",
        )

        relationship = case.entity_relationships.filter(
            relationship_type=RelationshipType.ACCUSED
        ).first()
        entity = relationship.entity
        entity_id = entity.id

        # Remove entity from case
        relationship.delete()

        # Now deletion should succeed
        entity.delete()

        # Verify entity was deleted
        assert not JawafEntity.objects.filter(id=entity_id).exists()

    def test_can_delete_entity_only_used_in_deleted_source(self):
        """Can delete entity if only referenced by soft-deleted sources."""
        entity = JawafEntity.objects.create(
            nes_id="entity:person/deleted-source-person",
            display_name="Deleted Source Person",
        )

        source = DocumentSource.objects.create(
            title="Test Source",
            description="Test description",
            is_deleted=True,  # Soft deleted
        )
        source.related_entities.add(entity)

        # Should be able to delete since source is soft-deleted
        entity_id = entity.id
        entity.delete()

        # Verify entity was deleted
        assert not JawafEntity.objects.filter(id=entity_id).exists()
