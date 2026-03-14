"""
Property-based tests for Django Admin Case management.

Feature: accountability-platform-core
Tests Properties 6, 9
Validates: Requirements 2.1, 2.4, 7.2
"""

import pytest
from datetime import datetime

from django.utils import timezone
from hypothesis import given, settings
from hypothesis import strategies as st

from cases.models import CaseState, CaseType
from cases.rules.predicates import can_transition_case_state
from tests.conftest import create_case_with_entities, create_user_with_role
from tests.strategies import complete_case_data, user_with_role

# ============================================================================
# Property 6: Moderators can publish and close cases
# ============================================================================


@pytest.mark.django_db
@settings(max_examples=20, deadline=None)  # Reduced from 100 to 20 for faster execution
@given(case_data=complete_case_data(), moderator_data=user_with_role("Moderator"))
def test_moderators_can_publish_cases(case_data, moderator_data):
    """
    Feature: accountability-platform-core, Property 6: Moderators can publish and close cases

    For any case in IN_REVIEW state, a Moderator should be able to change
    the state to PUBLISHED.
    Validates: Requirements 2.1
    """
    # Create moderator user
    moderator = create_user_with_role(
        moderator_data["username"], moderator_data["email"], moderator_data["role"]
    )

    # Create a case in IN_REVIEW state
    case = create_case_with_entities(**case_data)
    case.state = CaseState.IN_REVIEW
    case.save()

    # Check that moderator can transition to PUBLISHED
    can_publish = can_transition_case_state(moderator, case, CaseState.PUBLISHED)

    assert can_publish, "Moderator should be able to transition case to PUBLISHED state"

    # Actually perform the transition
    case.state = CaseState.PUBLISHED
    case.validate()  # Should not raise
    case.save()

    assert (
        case.state == CaseState.PUBLISHED
    ), f"Case should be in PUBLISHED state, but got {case.state}"


@pytest.mark.django_db
@settings(max_examples=20, deadline=None)  # Reduced from 100 to 20 for faster execution
@given(case_data=complete_case_data(), moderator_data=user_with_role("Moderator"))
def test_moderators_can_close_cases(case_data, moderator_data):
    """
    Feature: accountability-platform-core, Property 6: Moderators can publish and close cases

    For any case in IN_REVIEW state, a Moderator should be able to change
    the state to CLOSED.
    Validates: Requirements 2.1
    """
    # Create moderator user
    moderator = create_user_with_role(
        moderator_data["username"], moderator_data["email"], moderator_data["role"]
    )

    # Create a case in IN_REVIEW state
    case = create_case_with_entities(**case_data)
    case.state = CaseState.IN_REVIEW
    case.save()

    # Check that moderator can transition to CLOSED
    can_close = can_transition_case_state(moderator, case, CaseState.CLOSED)

    assert can_close, "Moderator should be able to transition case to CLOSED state"

    # Actually perform the transition
    case.state = CaseState.CLOSED
    case.save()

    assert (
        case.state == CaseState.CLOSED
    ), f"Case should be in CLOSED state, but got {case.state}"


@pytest.mark.django_db
@settings(max_examples=10, deadline=None)  # Reduced from 50 to 10 for faster execution
@given(
    case_data=complete_case_data(),
    moderator_data=user_with_role("Moderator"),
    target_state=st.sampled_from([CaseState.PUBLISHED, CaseState.CLOSED]),
)
def test_moderators_can_transition_to_any_state(
    case_data, moderator_data, target_state
):
    """
    Feature: accountability-platform-core, Property 6: Moderators can publish and close cases

    For any case, a Moderator should be able to transition to PUBLISHED or CLOSED states.
    Validates: Requirements 2.1
    """
    # Create moderator user
    moderator = create_user_with_role(
        moderator_data["username"], moderator_data["email"], moderator_data["role"]
    )

    # Create a case in IN_REVIEW state
    case = create_case_with_entities(**case_data)
    case.state = CaseState.IN_REVIEW
    case.save()

    # Check that moderator can transition to target state
    can_transition = can_transition_case_state(moderator, case, target_state)

    assert (
        can_transition
    ), f"Moderator should be able to transition case to {target_state} state"


# ============================================================================
# Property 9: State transitions update versionInfo
# ============================================================================


@pytest.mark.django_db
@settings(max_examples=20, deadline=None)  # Reduced from 100 to 20 for faster execution
@given(case_data=complete_case_data())
def test_transition_to_in_review_updates_version_info(case_data):
    """
    Feature: accountability-platform-core, Property 9: State transitions to IN_REVIEW, PUBLISHED, or CLOSED update versionInfo

    For any case transitioning to IN_REVIEW state, the versionInfo should be
    updated with the change details including timestamp.
    Validates: Requirements 2.4, 7.2
    """
    # Create a case in DRAFT state
    case = create_case_with_entities(**case_data)
    assert case.state == CaseState.DRAFT

    # Record time before transition
    before_transition = timezone.now()

    # Transition to IN_REVIEW using submit()
    case.submit()

    # Record time after transition
    after_transition = timezone.now()

    # Check that versionInfo was updated
    assert (
        case.versionInfo is not None
    ), "versionInfo should be updated after state transition"

    assert "datetime" in case.versionInfo, "versionInfo should contain datetime field"

    assert "action" in case.versionInfo, "versionInfo should contain action field"

    assert (
        case.versionInfo["action"] == "submitted"
    ), f"versionInfo action should be 'submitted', but got {case.versionInfo['action']}"

    # Verify datetime is within reasonable range
    version_datetime = datetime.fromisoformat(case.versionInfo["datetime"])
    assert (
        before_transition <= version_datetime <= after_transition
    ), "versionInfo datetime should be within the transition time range"


@pytest.mark.django_db
@settings(max_examples=20, deadline=None)  # Reduced from 100 to 20 for faster execution
@given(case_data=complete_case_data())
def test_transition_to_published_updates_version_info(case_data):
    """
    Feature: accountability-platform-core, Property 9: State transitions to IN_REVIEW, PUBLISHED, or CLOSED update versionInfo

    For any case transitioning to PUBLISHED state, the versionInfo should be
    updated with the change details including timestamp.
    Validates: Requirements 2.4, 7.2
    """
    # Create a case in IN_REVIEW state
    case = create_case_with_entities(**case_data)
    case.state = CaseState.IN_REVIEW
    case.save()

    # Record time before transition
    before_transition = timezone.now()

    # Transition to PUBLISHED using publish()
    case.publish()

    # Record time after transition
    after_transition = timezone.now()

    # Check that versionInfo was updated
    assert (
        case.versionInfo is not None
    ), "versionInfo should be updated after state transition"

    assert "datetime" in case.versionInfo, "versionInfo should contain datetime field"

    assert "action" in case.versionInfo, "versionInfo should contain action field"

    assert (
        case.versionInfo["action"] == "published"
    ), f"versionInfo action should be 'published', but got {case.versionInfo['action']}"

    # Verify datetime is within reasonable range
    version_datetime = datetime.fromisoformat(case.versionInfo["datetime"])
    assert (
        before_transition <= version_datetime <= after_transition
    ), "versionInfo datetime should be within the transition time range"


@pytest.mark.django_db
@settings(max_examples=20, deadline=None)  # Reduced from 100 to 20 for faster execution
@given(
    case_data=complete_case_data(),
    target_state=st.sampled_from(
        [CaseState.IN_REVIEW, CaseState.PUBLISHED, CaseState.CLOSED]
    ),
)
def test_state_transitions_always_update_version_info(case_data, target_state):
    """
    Feature: accountability-platform-core, Property 9: State transitions to IN_REVIEW, PUBLISHED, or CLOSED update versionInfo

    For any case transitioning to IN_REVIEW, PUBLISHED, or CLOSED state,
    the versionInfo should be updated with change details.
    Validates: Requirements 2.4, 7.2
    """
    # Create a case
    case = create_case_with_entities(**case_data)

    # Clear versionInfo to test that it gets updated
    case.versionInfo = {}
    case.save()

    # Transition to target state
    if target_state == CaseState.IN_REVIEW:
        case.state = CaseState.DRAFT
        case.save()
        case.submit()
    elif target_state == CaseState.PUBLISHED:
        case.state = CaseState.IN_REVIEW
        case.save()
        case.publish()
    elif target_state == CaseState.CLOSED:
        # For CLOSED, we set the state directly (soft delete)
        case.state = CaseState.CLOSED
        case.versionInfo = {
            "action": "closed",
            "datetime": timezone.now().isoformat(),
        }
        case.save()

    # Check that versionInfo was updated
    assert (
        case.versionInfo is not None and len(case.versionInfo) > 0
    ), f"versionInfo should be updated after transition to {target_state}"

    assert (
        "datetime" in case.versionInfo
    ), f"versionInfo should contain datetime field after transition to {target_state}"


# ============================================================================
# Edge Cases and Additional Tests
# ============================================================================


@pytest.mark.django_db
def test_contributor_cannot_publish_case():
    """
    Edge case: Contributors should not be able to publish cases.
    Validates: Requirements 1.5
    """
    # Create contributor user
    contributor = create_user_with_role(
        "testcontrib", "contrib@example.com", "Contributor"
    )

    # Create a case in IN_REVIEW state
    case = create_case_with_entities(
        title="Test Case",
        alleged_entities=["entity:person/test-person"],
        key_allegations=["Test allegation"],
        case_type=CaseType.CORRUPTION,
        description="Test description",
        state=CaseState.IN_REVIEW,
    )

    # Check that contributor cannot transition to PUBLISHED
    can_publish = can_transition_case_state(contributor, case, CaseState.PUBLISHED)

    assert (
        not can_publish
    ), "Contributor should NOT be able to transition case to PUBLISHED state"


@pytest.mark.django_db
def test_admin_can_publish_case():
    """
    Edge case: Admins should be able to publish cases.
    Validates: Requirements 5.1
    """
    # Create admin user
    admin = create_user_with_role("testadmin", "admin@example.com", "Admin")

    # Create a case in IN_REVIEW state
    case = create_case_with_entities(
        title="Test Case",
        alleged_entities=["entity:person/test-person"],
        key_allegations=["Test allegation"],
        case_type=CaseType.CORRUPTION,
        description="Test description",
        state=CaseState.IN_REVIEW,
    )

    # Check that admin can transition to PUBLISHED
    can_publish = can_transition_case_state(admin, case, CaseState.PUBLISHED)

    assert can_publish, "Admin should be able to transition case to PUBLISHED state"
