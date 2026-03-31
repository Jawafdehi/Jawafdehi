import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector/cjs';
import enTranslations from './locales/en.json';
import neTranslations from './locales/ne.json';

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

i18n
  .use(LanguageDetector)
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
    fallbackLng: 'en', // English is the default language
    detection: languageDetectorOptions,
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    react: {
      useSuspense: false, // Disable suspense for better compatibility
    },
  });

export default i18n;

