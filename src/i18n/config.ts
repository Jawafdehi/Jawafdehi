import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector/cjs';
import enTranslations from './locales/en.json';
import neTranslations from './locales/ne.json';

const isSSR = typeof window === 'undefined';

// Language detection configuration
const languageDetectorOptions = {
  // Order of detection methods
  order: ['localStorage', 'navigator'],

  // Keys to lookup language from
  lookupLocalStorage: 'i18nextLng',

  // Cache user language on
  caches: ['localStorage'],

  // Only detect from these sources
  checkWhitelist: true,
};

if (!isSSR) {
  i18n.use(LanguageDetector);
}

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
    fallbackLng: 'ne', // Nepali is the default language
    ...(isSSR ? { lng: 'ne' } : { detection: languageDetectorOptions }),
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
}

export default i18n;
