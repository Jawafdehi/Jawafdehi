import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import neTranslations from './locales/ne.json';

const isSSR = typeof window === 'undefined';

// Nepali-first: everyone defaults to Nepali; English is opt-in via the language toggle and remembered across visits. We intentionally do NOT auto-detect navigator.language, to avoid a Nepali->English flash on the Nepali-only prerender and to keep the stored preference the single source of truth (browser/Google auto-translation is suppressed in index.html).
const getPreferredLanguage = (): 'en' | 'ne' => {
  if (isSSR) return 'ne';

  let storedLanguage: string | null = null;
  try {
    storedLanguage = window.localStorage.getItem('i18nextLng');
  } catch {
    // Storage blocked or unavailable
  }
  return storedLanguage?.startsWith('en') ? 'en' : 'ne';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        translation: enTranslations,
      },
      ne: {
        translation: neTranslations,
      },
    },
    fallbackLng: 'ne',
    lng: 'ne',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for better compatibility
    },
  });

if (!isSSR) {
  const syncDocumentLanguage = (language: string) => {
    document.documentElement.lang = language.startsWith('en') ? 'en' : 'ne';
  };

  syncDocumentLanguage(i18n.language || i18n.resolvedLanguage || 'ne');
  i18n.on('languageChanged', syncDocumentLanguage);

  i18n.on('languageChanged', (lng) => {
    try {
      window.localStorage.setItem('i18nextLng', lng);
    } catch {
      // Storage blocked or unavailable
    }
  });

  const preferredLanguage = getPreferredLanguage();
  if (preferredLanguage !== i18n.language) {
    window.requestAnimationFrame(() => {
      void i18n.changeLanguage(preferredLanguage);
    });
  }
}

export default i18n;
