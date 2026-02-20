# Jawafdehi API

A Django-based public accountability platform for tracking allegations of corruption and misconduct by public entities in Nepal.

## About the Meta Repository

Contributors to this repository should be aware of the [Jawafdehi meta-repository](https://github.com/NewNepal-org/jawafdehi-meta). The meta repo provides documentation, specs, and other shared resources across the Jawafdehi product family. 

**For Jawafdehi team members and interns**: Working from the meta repo setup is strongly encouraged, as it provides rich context for AI-powered development tools (Cursor, Kiro, GitHub Copilot, etc.) and makes cross-service coordination easier.

**For open source contributors**: You can contribute directly to this repository by cloning it and submitting a PR. The meta repo is optional for external contributors.


## Setup Instructions

### Prerequisites

- Python 3.12+
- Poetry (Python package manager)
- PostgreSQL (for production) or SQLite (for development)

### Installation

1. **Clone the repository and navigate to the project**
   ```bash
   cd services/jawafdehi-api
   ```

2. **Install dependencies with Poetry**
   ```bash
   poetry install
   ```

3. **Activate the virtual environment**
   ```bash
   poetry shell
   ```

4. **Verify Django installation**
   ```bash
   python manage.py --version
   # Should output: 5.2.9
   ```

5. **Configure environment variables**
   
   Copy the example environment file and update it:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   - `SECRET_KEY`: Django secret key
   - `DEBUG`: Set to `True` for development
   - `DATABASE_URL`: PostgreSQL connection string (or use SQLite for dev)
   - `NES_API_URL`: Nepal Entity Service API URL
   - `ALLOWED_HOSTS`: Comma-separated hostnames
   - `CSRF_TRUSTED_ORIGINS`: Comma-separated origins

6. **Run database migrations**
   ```bash
   python manage.py migrate
   ```

7. **Create user groups (Admin/Moderator/Contributor)**
   ```bash
   python manage.py create_groups
   ```

8. **Create a superuser account**
   ```bash
   python manage.py createsuperuser
   ```
   
   Follow the prompts to set username, email, and password.

9. **Start the development server**
   ```bash
   python manage.py runserver
   ```
   
   The API will be available at `http://localhost:8000`

10. **Access the admin portal**
    
    Navigate to `http://localhost:8000/admin` and login with your superuser credentials.

### Seed Data (Optional)

To populate the database with sample allegations for testing:

```bash
python manage.py seed_allegations
```

### Running Tests

```bash
poetry run pytest
```

### Code Quality

Format code:
```bash
poetry run black .
poetry run isort .
```

Lint code:
```bash
poetry run flake8
```

## Features

- Track allegations against public entities
- Document evidence with sources
- Timeline management for allegations
- Response system for accused entities
- RESTful API with OpenAPI documentation
- Integration with Nepal Entity Service (NES)
- Admin interface powered by Jazzmin (Bootstrap 4)

## Permissions Model

### Case Revisions

Each allegation uses a revision system to track changes:
- **Published version** - The current live allegation visible to the public
- **Draft revision** - Edits create a new revision in Draft status
- Revisions maintain history of all changes to an allegation

### Allegation Status Workflow

#### Creating New Allegations
1. **Draft** - Initial status when an allegation is created
2. **In Review** - Contributor submits the draft for review (visible to Moderators)
3. **Published/Closed** - Moderator approves and sets final status

#### Editing Existing Allegations
Editing a published allegation creates a new revision:
1. User edits the allegation (creates a new draft revision)
2. Submits for review (revision status: **In Review**)
3. Moderator approves, changing revision status to **Draft**, **Published**, or **Closed**
4. If approved as Published, the new revision becomes the live version

### User Roles

#### Admin
- Manage all Moderators (create, edit, delete, assign permissions)
- Manage all Contributors (create, edit, delete, assign to cases)
- Full access to all Allegations, Evidence, Sources, and Responses
- Assign Contributors to specific cases

#### Moderator
- Manage Contributors (create, edit, delete, assign to cases)
- Full access to all Allegations, Evidence, Sources, and Responses
- Assign Contributors to specific cases

#### Contributor
- Create new Allegations (initial status: Draft)
- Submit drafts for review (changes status to In Review)
- Access Evidence, Sources, and Responses only for assigned cases
- Edit content only for assigned cases
- Change case status only between "Draft" and "In Review"

### Permission Matrix

| Action | Admin | Moderator | Contributor |
|--------|-------|-----------|-------------|
| Manage Moderators | ✓ | ✗ | ✗ |
| Manage Contributors | ✓ | ✓ | ✗ |
| Create Allegations | ✓ | ✓ | ✓ |
| Assign Contributors to Cases | ✓ | ✓ | ✗ |
| Access All Cases | ✓ | ✓ | ✗ |
| Access Assigned Cases | ✓ | ✓ | ✓ |
| Manage Evidence (assigned cases) | ✓ | ✓ | ✓ |
| Manage Sources (assigned cases) | ✓ | ✓ | ✓ |
| Manage Responses (assigned cases) | ✓ | ✓ | ✓ |
| Change Case Status (all statuses) | ✓ | ✓ | ✗ |
| Change Case Status (Draft ↔ In Review) | ✓ | ✓ | ✓ |
| Approve & Publish/Close Cases | ✓ | ✓ | ✗ |

### Case Assignment

Contributors must be explicitly assigned to cases by Admins or Moderators. Once assigned, Contributors gain access to:
- View and edit the Allegation
- Add and manage Evidence
- Document Sources
- Handle Responses

Contributors cannot access cases they are not assigned to.

## User Workflows

### Public (Unauthenticated) Workflows

#### Browse Cases
```
1. View list of published cases
2. Apply filters (entity, category, status)
3. Search cases by keyword
4. Select case to view details
```

#### View Case Details
```
1. Read case content
2. View associated evidence
3. Review documented sources
4. Read entity responses
5. View case timeline
```

#### Access API
```
1. Query cases via RESTful API
2. Access OpenAPI documentation
3. Retrieve public data programmatically
```

### Contributor Workflows

#### Create New Case
```
1. Create case (status ← Draft)
2. Add evidence and sources
3. Submit for review (status ← In Review)
4. Wait for moderator/admin approval
```

#### Edit Assigned Case
```
1. Access assigned case
2. Edit case (creates new draft revision)
3. Modify evidence and sources
4. Submit revision (status ← In Review)
5. Wait for moderator/admin to approve and publish
```

#### Manage Case Content (Assigned Cases Only)
```
1. Add/edit evidence
2. Document sources
3. Toggle status between Draft and In Review
```

### Moderator Workflows

#### Manage Contributors
```
1. Create/edit/delete contributor accounts
2. Assign contributors to specific cases
```

#### Manage Cases
```
1. Create new case (status ← Draft)
2. Edit any case (creates new revision)
3. Review submissions (status = In Review)
4. Approve revision (status ← Published or Closed)
5. Access all cases regardless of assignment
```

#### Manage Content
```
1. Add/edit/delete evidence for any case
2. Document sources for any case
3. Handle responses for any case
```

### Admin Workflows

#### Manage Moderators
```
1. Create/edit/delete moderator accounts
2. Assign permissions to moderators
```

#### Manage Contributors
```
1. Create/edit/delete contributor accounts
2. Assign contributors to specific cases
```

#### Manage Cases
```
1. Create new case (status ← Draft)
2. Edit any case (creates new revision)
3. Review submissions (status = In Review)
4. Approve revision (status ← Published or Closed)
5. Access all cases regardless of assignment
```

#### Manage Content
```
1. Add/edit/delete evidence for any case
2. Document sources for any case
3. Handle responses for any case
```

## License

MIT

