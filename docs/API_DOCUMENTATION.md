# Jawafdehi API Documentation

This document explains how to access and use the OpenAPI documentation for the Jawafdehi Public Accountability API.

## Accessing the API Documentation

The API documentation is available through multiple endpoints:

### 1. Swagger UI (Interactive Documentation)

**URL:** `http://localhost:8000/api/swagger/`

The Swagger UI provides an interactive interface where you can:
- Browse all available endpoints
- View request/response schemas
- Try out API calls directly from the browser
- See example requests and responses

### 2. OpenAPI Schema (YAML)

**URL:** `http://localhost:8000/api/schema/`

This endpoint returns the complete OpenAPI 3.0 schema in YAML format. You can:
- Download the schema for use with API clients
- Import into tools like Postman or Insomnia
- Generate client libraries using OpenAPI generators

### 3. Generate Schema File

You can also generate the schema as a file using the Django management command:

```bash
python manage.py spectacular --color --file schema.yml
```

## API Overview

The Jawafdehi API provides read-only access to published accountability cases and document sources.

### Key Features

- **Public Access**: No authentication required
- **Published Cases Only**: Only cases with state=PUBLISHED are accessible
- **Filtering & Search**: Filter by case type and tags, search across multiple fields
- **Pagination**: Results are paginated with 20 items per page
- **Audit History**: View complete version history for published cases

## Available Endpoints

### Cases

#### List Cases
```
GET /api/cases/
```

**Query Parameters:**
- `case_type`: Filter by case type (CORRUPTION or PROMISES)
- `tags`: Filter cases containing a specific tag
- `search`: Full-text search across title, description, and key allegations
- `page`: Page number for pagination

**Example:**
```bash
curl "http://localhost:8000/api/cases/?case_type=CORRUPTION&page=1"
```

#### Retrieve Case
```
GET /api/cases/{id}/
```

Returns detailed information about a specific case, including:
- Complete case data with unified entity relationships
- Evidence and timeline
- Audit history (all published versions)

**Example:**
```bash
curl "http://localhost:8000/api/cases/1/"
```

### Document Sources

#### List Sources
```
GET /api/sources/
```

Returns sources associated with published cases.

**Query Parameters:**
- `page`: Page number for pagination

**Example:**
```bash
curl "http://localhost:8000/api/sources/"
```

#### Retrieve Source
```
GET /api/sources/{id_or_source_id}/
```

Returns detailed information about a specific document source.

The endpoint accepts either:
- Database id (numeric): `/api/sources/1/`
- Source ID (string): `/api/sources/source:20240115:abc123/`

**Examples:**
```bash
# Using database id
curl "http://localhost:8000/api/sources/1/"

# Using source_id
curl "http://localhost:8000/api/sources/source:20240115:abc123/"
```

## Response Format

All responses are in JSON format with the following structure:

### Paginated List Response
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/cases/?page=2",
  "previous": null,
  "results": [...]
}
```

### Case Object
```json
{
  "id": 1,
  "case_id": "case-abc123def456",
  "case_type": "CORRUPTION",
  "title": "Case Title",
  "case_start_date": "2024-01-15",
  "case_end_date": null,
  "entities": [
    {
      "id": 1,
      "nes_id": "entity:organization/nepal-government",
      "display_name": "Nepal Government",
      "type": "alleged",
      "notes": "Primary accused entity"
    },
    {
      "id": 2,
      "nes_id": "entity:person/ram-bahadur-shah",
      "display_name": "राम बहादुर शाह",
      "type": "witness",
      "notes": "Key witness testimony"
    }
  ],
  "locations": [
    {
      "id": 51,
      "nes_id": "entity:location/district/kathmandu",
      "display_name": "Kathmandu"
    }
  ],
  "tags": ["land-encroachment", "national-interest"],
  "description": "Detailed description...",
  "key_allegations": [
    "Allegation statement 1",
    "Allegation statement 2"
  ],
  "timeline": [
    {
      "date": "2024-01-15",
      "title": "Event title",
      "description": "Event description"
    }
  ],
  "evidence": [
    {
      "source_id": "source:20240115:abc123",
      "description": "Description of evidence"
    }
  ],
  "versionInfo": {
    "version_number": 1,
    "action": "published",
    "datetime": "2024-01-15T10:30:00Z"
  },
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:30:00Z"
}
```

**Field Notes:**
- `entities`: Unified non-location case entities
- `locations`: Location entities separated for UI/semantic clarity
- `type`: One of `alleged`, `related`, `witness`, `opposition`, `victim`

**Breaking change note:**
- `alleged_entities` and `related_entities` are no longer returned in case responses.
- Consumers should use the `entities` array and filter by `type`.

### Document Source Object

**Example Response:**
```json
{
  "id": 1,
  "source_id": "source:20240115:abc123",
  "title": "Source Title",
  "description": "Source description",
  "source_type": "MEDIA_NEWS",
  "url": [
    "https://example.com/document.pdf",
    "https://example.com/backup-link.pdf"
  ],
  "related_entities": [
    {
      "id": 1,
      "nes_id": "entity:person/john-doe",
      "display_name": "John Doe"
    }
  ],
  "created_at": "2024-01-15T10:00:00Z",
  "updated_at": "2024-01-15T10:00:00Z"
}
```

**Field Notes:**
- `source_type`: Optional field, may be `null` if the source has not been classified
- `related_entities`: May include additional fields such as `alleged_cases` and `related_cases`

**Source Type Values:**

The `source_type` field is optional and may be `null` if the source has not been classified. When present, it must be one of the following values:

- `LEGAL_COURT_ORDER` - Legal: Court Order/Verdict
- `LEGAL_PROCEDURAL` - Legal: Procedural/Law Enforcement
- `OFFICIAL_GOVERNMENT` - Official (Government)
- `FINANCIAL_FORENSIC` - Financial/Forensic Record
- `INTERNAL_CORPORATE` - Internal Corporate Doc
- `MEDIA_NEWS` - Media/News
- `INVESTIGATIVE_REPORT` - Investigative Report
- `PUBLIC_COMPLAINT` - Public Complaint/Whistleblower
- `LEGISLATIVE_DOC` - Legislative/Policy Doc
- `SOCIAL_MEDIA` - Social Media
- `OTHER_VISUAL` - Other / Visual Assets

> **Note:** The authoritative list of source type values is defined in the backend `SourceType` enum (see `cases/models.py`). For the most current list, consult the OpenAPI schema at `/api/schema/` or `/api/schema/?format=json`.

## Entity ID Format

Entity IDs follow the Nepal Entity Service (NES) format:

- **Persons**: `entity:person/{slug}`
- **Organizations**: `entity:organization/{type}/{slug}`
- **Locations**: `entity:location/{type}/{slug}`

Examples:
- `entity:person/rabi-lamichhane`
- `entity:organization/government/nepal-government`
- `entity:organization/political_party/rastriya-swatantra-party`
- `entity:location/district/kathmandu`
- `entity:location/region/kathmandu-valley`

## Relationship Types

The unified entity-case relationships system supports five relationship types:

| Type | Description | Usage |
|------|-------------|-------|
| `alleged` | Entities being accused of misconduct | Primary subjects of allegations |
| `related` | Entities connected to the case | Supporting actors, beneficiaries |
| `witness` | Entities providing testimony or evidence | Whistleblowers, informants |
| `opposition` | Entities opposing or investigating | Oversight bodies, opposition parties |
| `victim` | Entities harmed by the alleged misconduct | Affected communities, individuals |

### Relationship Metadata

Each relationship includes additional metadata:
- `notes`: Optional text field for relationship context
- `created_at`: Timestamp when relationship was established
- `entity_display_name`: Human-readable entity name
- `entity_nes_id`: Nepal Entity Service identifier (if available)

## API Statistics

### Statistics Endpoint

**Endpoint:** `GET /api/statistics/`

**Response:**
```json
{
  "published_cases": 127,
  "cases_under_investigation": 43,
  "cases_closed": 31,
  "entities_tracked": 89,
  "last_updated": "2024-12-04T10:30:00Z"
}
```

## Error Responses

The API returns standard HTTP status codes:

- `200 OK`: Successful request
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include a message:
```json
{
  "detail": "Not found."
}
```

## Rate Limiting

Currently, there are no rate limits on the public API. This may change in production.

## CORS

The API uses an explicit allowlist for origins and supports credentialed requests.
Allowed methods include `GET`, `HEAD`, `OPTIONS`, `POST`, `PUT`, `PATCH`, and `DELETE`.

## Development vs Production

### Development
- Base URL: `http://localhost:8000`
- Debug mode enabled
- CORS defaults to configured local frontend origins

### Production
- Base URL: TBD
- Debug mode disabled
- CORS restricted to specific domains
- HTTPS required

## Testing the API

### Using curl
```bash
# List cases
curl "http://localhost:8000/api/cases/"

# Search cases
curl "http://localhost:8000/api/cases/?search=corruption"

# Filter by case type
curl "http://localhost:8000/api/cases/?case_type=CORRUPTION"

# Get specific case
curl "http://localhost:8000/api/cases/1/"
```

### Using Python
```python
import requests

# List cases
response = requests.get('http://localhost:8000/api/cases/')
cases = response.json()

# Search cases
response = requests.get('http://localhost:8000/api/cases/', params={
    'search': 'corruption',
    'case_type': 'CORRUPTION'
})
results = response.json()['results']

# Get specific case
response = requests.get('http://localhost:8000/api/cases/1/')
case = response.json()
```

### Using JavaScript
```javascript
// List cases
fetch('http://localhost:8000/api/cases/')
  .then(response => response.json())
  .then(data => {
    data.results.forEach(caseItem => {
      console.log(`Case: ${caseItem.title}`);
      console.log(`Type: ${caseItem.case_type}`);
    });
  });

// Get specific case
fetch('http://localhost:8000/api/cases/1/')
  .then(response => response.json())
  .then(caseData => console.log(caseData));
```

## Support

For questions or issues with the API, please contact the development team or file an issue in the project repository.
