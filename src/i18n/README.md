# Internationalization (i18n) Guide

This directory contains all internationalization configuration and translation files for Jawafdehi Initiative.

## Overview

The platform supports two languages:
- **Nepali (ne)** - Default language
- **English (en)** - Secondary language

## File Structure

```
src/i18n/
├── config.ts              # i18next configuration and initialization
├── locales/
│   ├── en.json           # English translations
│   └── ne.json           # Nepali translations
└── README.md              # This file
```

## Translation Files

### Location
- English: `/src/i18n/locales/en.json`
- Nepali: `/src/i18n/locales/ne.json`

### Key Naming Convention

Translation keys use dot-separated hierarchical naming:
- `nav.home` - Navigation items
- `header.title` - Header-specific text
- `cases.title` - Page-specific content
- `common.viewDetails` - Shared/common text

### Structure Example

```json
{
  "nav": {
    "home": "Home",
    "cases": "Cases"
  },
  "cases": {
    "title": "Corruption Cases",
    "status": {
      "ongoing": "Ongoing"
    }
  }
}
```

## Adding/Editing Translations

### 1. Adding a New Translation Key

1. Open the appropriate translation file (`en.json` or `ne.json`)
2. Add the key following the hierarchical structure
3. Add the same key to the other language file
4. Use the key in your component: `t("your.key.path")`

### 2. Editing Existing Translations

1. Find the key in the translation file
2. Update the value
3. Ensure both language files are updated if needed

### 3. Using Translations in Components

```tsx
import { useTranslation } from "react-i18next";

function MyComponent() {
  const { t } = useTranslation();

  return (
    <div>
      <h1>{t("nav.home")}</h1>
      <p>{t("cases.description")}</p>
    </div>
  );
}
```

### 4. Translation with Variables

```json
{
  "footer": {
    "copyright": "© {{year}} Jawafdehi Initiative. All rights reserved."
  }
}
```

```tsx
{t("footer.copyright", { year: new Date().getFullYear() })}
```

## Language Switching

The language switcher is located in the header (`LanguageToggle` component). Language preference is automatically persisted in `localStorage` and survives page reloads.

### Default Language

Nepali (`ne`) is set as the default language. This is configured in `/src/i18n/config.ts`:

```typescript
fallbackLng: 'ne',
lng: 'ne',
```

## Dynamic Content (Not Translated)

**Important:** Dynamic case content from the Entity API (case titles, descriptions, entity names, etc.) is intentionally left in English until API-side i18n is implemented.

These areas are marked with comments in the code:
- Case cards (`CaseCard` component)
- Case detail pages (`CaseDetail` page)
- Cases listing page (`Cases` page) - dynamic content only

### Example Comment

```tsx
{/* NOTE: Dynamic case content from Entity API remains in English until API-side i18n is implemented.
    See GitHub issue for i18n. */}
```

## Future: API-Side Translations

When the Entity API supports i18n, dynamic content translation can be integrated by:

1. Updating API calls to include language parameter
2. Removing the comments marking untranslated content
3. Using API-provided translations instead of hardcoded English text

## Testing Translations

1. Start the development server: `npm run dev`
2. Use the language switcher in the header to toggle between languages
3. Verify all static UI text changes appropriately
4. Verify dynamic case content remains in English (as intended)

## Dependencies

- `react-i18next` - React bindings for i18next
- `i18next` - Core internationalization framework

Language detection and localStorage persistence are handled directly in `config.ts` (no `i18next-browser-languagedetector`); the stored preference is the single source of truth and browser/Google auto-translation is suppressed via `translate="no"` + `<meta name="google" content="notranslate">` in `index.html`.

## Resources

- [react-i18next Documentation](https://react.i18next.com/)
- [i18next Documentation](https://www.i18next.com/)

