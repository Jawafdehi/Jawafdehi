# Jawafdehi Frontend

A civic tech platform built by Let's Build Nepal (LBN) and Jawafdehi.org to promote transparency and accountability in Nepali governance by documenting corruption cases and holding public entities accountable.

## About the Meta Repository

Contributors to this repository should be aware of the [Jawafdehi meta-repository](https://github.com/Jawafdehi/jawafdehi-meta). The meta repo provides documentation, specs, and other shared resources across the Jawafdehi product family. 

**For Jawafdehi team members and interns**: Working from the meta repo setup is strongly encouraged, as it provides rich context for AI-powered development tools (Cursor, Kiro, GitHub Copilot, etc.) and makes cross-service coordination easier.

**For open source contributors**: You can contribute directly to this repository by cloning it and submitting a PR. The meta repo is optional for external contributors.

## Features Implemented

### Public-Facing Features
- **Landing Page** (`/`) - Hero section, statistics, featured cases, and mission statement
- **Cases Directory** (`/cases`) - Searchable and filterable list of all corruption cases
- **Case Details** (`/case/:id`) - Detailed view of individual cases with timeline, allegations, evidence, audit trail
- **Entity Profiles** (`/entity/:id`) - Individual profiles for politicians, bureaucrats, and organizations showing all related allegations
- **About Page** (`/about`) - Mission, values, partners, and platform information

### Contributor Features
- **Report Allegation** (`/report`) - Form for citizens to submit new allegations
  - Anonymous or named submissions
  - File upload support for evidence
  - Source documentation
  - Allegation categorization

### Entity Features
- **Entity Response** (`/entity-response/:id`) - Interface for entities to respond to allegations
  - Identity verification workflow
  - Side-by-side display with allegations
  - Supporting document upload

### Admin/Moderation Features
- **Moderation Dashboard** (`/moderation`) - Review and approve submissions
  - Pending submissions queue
  - Review workflow
  - Status management
  - Internal notes and verification

### Platform Features
- **Feedback System** (`/feedback`) - Platform improvement suggestions and bug reports
- **Bilingual Support** - Language toggle for English/Nepali (UI component ready)
- **Audit Trail** - Complete history of case modifications with timestamps and users
- **Responsive Design** - Mobile, tablet, and desktop optimized

## Design System

The platform uses a professional design system with semantic tokens:
- **Primary Colors**: Navy blue for trust and authority
- **Accent Colors**: Amber for warnings, emerald for success
- **Typography**: Clear hierarchy with proper contrast
- **Components**: Fully themed shadcn components

---

# Development Setup

This project was initially prototyped using Lovable but is now fully decoupled and maintained independently by the Jawafdehi team.

## Prerequisites

- **Bun** - Fast JavaScript runtime and package manager - [install Bun](https://bun.sh/docs/installation)

## Local Development

Clone this repository and set up your local environment:

```sh
# Step 1: Clone the repository
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory
cd <YOUR_PROJECT_NAME>

# Step 3: Install dependencies
bun install

# Step 4: Start the development server
bun run dev
```

## Editing the Code

You can edit this project using any method that works best for you:

**Use your preferred IDE**

Work locally with VS Code, WebStorm, or any IDE of your choice. All changes should be committed through standard Git workflows.

**Edit files directly in GitHub**

- Navigate to the desired file(s)
- Click the "Edit" button (pencil icon) at the top right
- Make your changes and commit

**Use GitHub Codespaces**

- Navigate to the main page of the repository
- Click on the "Code" button (green button)
- Select the "Codespaces" tab
- Click on "New codespace" to launch a cloud development environment

## What technologies are used for this project?

This project is built with:

- Bun
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Deployment

The project is deployed on Google Cloud Platform using Cloud Run. See the repository's GitHub Actions workflows for CI/CD configuration.
