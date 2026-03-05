"""
Pytest configuration for test suite.

Ensures environment variables are set to their default values during testing.
"""

import pytest

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType
from django.test import RequestFactory
from hypothesis import settings as hypothesis_settings

from cases.models import Case, JawafEntity, DocumentSource


User = get_user_model()

# Configure Hypothesis settings globally
hypothesis_settings.register_profile(
    "default",
    deadline=400,  # 400ms instead of default 200ms
)
hypothesis_settings.load_profile("default")


@pytest.fixture(autouse=True)
def reset_feature_flags(settings):
    """
    Reset all feature flags to their default values for each test.
    
    This ensures tests run with predictable, default behavior unless
    explicitly overridden within a specific test.
    """
    # Reset EXPOSE_CASES_IN_REVIEW to default (False)
    settings.EXPOSE_CASES_IN_REVIEW = False


@pytest.fixture
def request_factory():
    """Create a Django RequestFactory for creating mock requests."""
    return RequestFactory()


def create_mock_request(user, method='get', path='/'):
    """
    Create a mock request object with the given user.
    
    Args:
        user: The user to attach to the request
        method: HTTP method ('get', 'post', etc.)
        path: Request path
    
    Returns:
        Mock request object with user attached
    """
    factory = RequestFactory()
    request_method = getattr(factory, method.lower())
    request = request_method(path)
    request.user = user
    return request


def create_entities_from_ids(entity_ids):
    """
    Helper function to create JawafEntity objects from entity ID strings.
    
    Args:
        entity_ids: List of entity ID strings (e.g., ['entity:person/test'])
    
    Returns:
        List of JawafEntity objects
    """
    if not entity_ids:
        return []
    
    entities = []
    for nes_id in entity_ids:
        # Get or create entity with this nes_id
        entity, _ = JawafEntity.objects.get_or_create(nes_id=nes_id)
        entities.append(entity)
    
    return entities


def create_case_with_entities(**kwargs):
    """
    Helper function to create a Case with entity relationships.
    
    Handles conversion of entity ID lists to JawafEntity objects.
    
    Args:
        **kwargs: Case fields, including:
            - alleged_entities: List of entity ID strings
            - related_entities: List of entity ID strings
            - locations: List of entity ID strings
    
    Returns:
        Case object
    """
    # Extract entity fields
    alleged_entity_ids = kwargs.pop('alleged_entities', [])
    related_entity_ids = kwargs.pop('related_entities', [])
    location_ids = kwargs.pop('locations', [])
    
    # Create the case without entities
    case = Case.objects.create(**kwargs)
    
    # Add entities using set()
    if alleged_entity_ids:
        case.alleged_entities.set(create_entities_from_ids(alleged_entity_ids))
    if related_entity_ids:
        case.related_entities.set(create_entities_from_ids(related_entity_ids))
    if location_ids:
        case.locations.set(create_entities_from_ids(location_ids))
    
    return case


def create_document_source_with_entities(**kwargs):
    """
    Helper function to create a DocumentSource with entity relationships.
    
    Handles conversion of entity ID lists to JawafEntity objects.
    
    Args:
        **kwargs: DocumentSource fields, including:
            - related_entity_ids: List of entity ID strings (legacy name)
            - related_entities: List of entity ID strings
    
    Returns:
        DocumentSource object
    """
    # Extract entity fields (support both old and new names)
    related_entity_ids = kwargs.pop('related_entity_ids', kwargs.pop('related_entities', []))
    
    # Create the source without entities
    source = DocumentSource.objects.create(**kwargs)
    
    # Add entities using set()
    if related_entity_ids:
        source.related_entities.set(create_entities_from_ids(related_entity_ids))
    
    return source


def create_user_with_role(username, email, role, password="testpass123"):
    """
    Create a user with the specified role.
    
    Creates the role group if it doesn't exist and assigns the user to it.
    Also sets up necessary Django permissions.
    
    Args:
        username: Username for the user
        email: Email for the user
        role: Role name ('Admin', 'Moderator', 'Contributor')
        password: Password for the user (default: 'testpass123')
    
    Returns:
        User object with role assigned
    """
    user = User.objects.create_user(
        username=username,
        email=email,
        password=password
    )
    
    # Create or get the role group
    group, _ = Group.objects.get_or_create(name=role)
    user.groups.add(group)
    
    # Set staff status for Admin, Moderator, and Contributor
    if role in ['Admin', 'Moderator', 'Contributor']:
        user.is_staff = True
        user.save()
    
    # Set superuser status for Admin
    if role == 'Admin':
        user.is_superuser = True
        user.save()
    
    # Add necessary permissions for the role
    content_type = ContentType.objects.get_for_model(Case)
    user_content_type = ContentType.objects.get_for_model(User)
    
    # Get or create Case permissions
    view_perm, _ = Permission.objects.get_or_create(
        codename='view_case',
        content_type=content_type,
        defaults={'name': 'Can view case'}
    )
    change_perm, _ = Permission.objects.get_or_create(
        codename='change_case',
        content_type=content_type,
        defaults={'name': 'Can change case'}
    )
    add_perm, _ = Permission.objects.get_or_create(
        codename='add_case',
        content_type=content_type,
        defaults={'name': 'Can add case'}
    )
    delete_perm, _ = Permission.objects.get_or_create(
        codename='delete_case',
        content_type=content_type,
        defaults={'name': 'Can delete case'}
    )
    
    # Get or create User permissions (for moderators to manage users)
    user_view_perm, _ = Permission.objects.get_or_create(
        codename='view_user',
        content_type=user_content_type,
        defaults={'name': 'Can view user'}
    )
    user_change_perm, _ = Permission.objects.get_or_create(
        codename='change_user',
        content_type=user_content_type,
        defaults={'name': 'Can change user'}
    )
    user_add_perm, _ = Permission.objects.get_or_create(
        codename='add_user',
        content_type=user_content_type,
        defaults={'name': 'Can add user'}
    )
    user_delete_perm, _ = Permission.objects.get_or_create(
        codename='delete_user',
        content_type=user_content_type,
        defaults={'name': 'Can delete user'}
    )
    
    # Assign permissions based on role
    if role in ['Admin', 'Moderator', 'Contributor']:
        user.user_permissions.add(view_perm, change_perm, add_perm, delete_perm)
    
    # Moderators and Admins can manage users
    if role in ['Admin', 'Moderator']:
        user.user_permissions.add(user_view_perm, user_change_perm, user_add_perm, user_delete_perm)
    
    return user
