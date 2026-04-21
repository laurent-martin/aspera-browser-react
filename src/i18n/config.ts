import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import commonEN from '../locales/en/common.json';
import fileBrowserEN from '../locales/en/fileBrowser.json';
import transferEN from '../locales/en/transfer.json';
import helpEN from '../locales/en/help.json';
import connectionEN from '../locales/en/connection.json';

import commonFR from '../locales/fr/common.json';
import fileBrowserFR from '../locales/fr/fileBrowser.json';
import transferFR from '../locales/fr/transfer.json';
import helpFR from '../locales/fr/help.json';
import connectionFR from '../locales/fr/connection.json';

import commonDE from '../locales/de/common.json';
import fileBrowserDE from '../locales/de/fileBrowser.json';
import transferDE from '../locales/de/transfer.json';
import helpDE from '../locales/de/help.json';
import connectionDE from '../locales/de/connection.json';

import commonES from '../locales/es/common.json';
import fileBrowserES from '../locales/es/fileBrowser.json';
import transferES from '../locales/es/transfer.json';
import helpES from '../locales/es/help.json';
import connectionES from '../locales/es/connection.json';

import commonZH from '../locales/zh/common.json';
import fileBrowserZH from '../locales/zh/fileBrowser.json';
import transferZH from '../locales/zh/transfer.json';
import helpZH from '../locales/zh/help.json';
import connectionZH from '../locales/zh/connection.json';

import commonJA from '../locales/ja/common.json';
import fileBrowserJA from '../locales/ja/fileBrowser.json';
import transferJA from '../locales/ja/transfer.json';
import helpJA from '../locales/ja/help.json';
import connectionJA from '../locales/ja/connection.json';

import commonPT from '../locales/pt/common.json';
import fileBrowserPT from '../locales/pt/fileBrowser.json';
import transferPT from '../locales/pt/transfer.json';
import helpPT from '../locales/pt/help.json';
import connectionPT from '../locales/pt/connection.json';

import commonRU from '../locales/ru/common.json';
import fileBrowserRU from '../locales/ru/fileBrowser.json';
import transferRU from '../locales/ru/transfer.json';
import helpRU from '../locales/ru/help.json';
import connectionRU from '../locales/ru/connection.json';

import commonAR from '../locales/ar/common.json';
import fileBrowserAR from '../locales/ar/fileBrowser.json';
import transferAR from '../locales/ar/transfer.json';
import helpAR from '../locales/ar/help.json';
import connectionAR from '../locales/ar/connection.json';

// Define resources
const resources = {
    en: {
        common: commonEN,
        fileBrowser: fileBrowserEN,
        transfer: transferEN,
        help: helpEN,
        connection: connectionEN,
    },
    fr: {
        common: commonFR,
        fileBrowser: fileBrowserFR,
        transfer: transferFR,
        help: helpFR,
        connection: connectionFR,
    },
    de: {
        common: commonDE,
        fileBrowser: fileBrowserDE,
        transfer: transferDE,
        help: helpDE,
        connection: connectionDE,
    },
    es: {
        common: commonES,
        fileBrowser: fileBrowserES,
        transfer: transferES,
        help: helpES,
        connection: connectionES,
    },
    zh: {
        common: commonZH,
        fileBrowser: fileBrowserZH,
        transfer: transferZH,
        help: helpZH,
        connection: connectionZH,
    },
    ja: {
        common: commonJA,
        fileBrowser: fileBrowserJA,
        transfer: transferJA,
        help: helpJA,
        connection: connectionJA,
    },
    pt: {
        common: commonPT,
        fileBrowser: fileBrowserPT,
        transfer: transferPT,
        help: helpPT,
        connection: connectionPT,
    },
    ru: {
        common: commonRU,
        fileBrowser: fileBrowserRU,
        transfer: transferRU,
        help: helpRU,
        connection: connectionRU,
    },
    ar: {
        common: commonAR,
        fileBrowser: fileBrowserAR,
        transfer: transferAR,
        help: helpAR,
        connection: connectionAR,
    },
};

i18n
    // Detect user language
    .use(LanguageDetector)
    // Pass the i18n instance to react-i18next
    .use(initReactI18next)
    // Initialize i18next
    .init({
        resources,
        fallbackLng: 'en',
        defaultNS: 'common',
        ns: ['common', 'fileBrowser', 'transfer', 'help', 'connection'],

        interpolation: {
            escapeValue: false, // React already escapes values
        },

        detection: {
            // Order of language detection
            order: ['localStorage', 'navigator', 'htmlTag'],
            // Cache user language
            caches: ['localStorage'],
            lookupLocalStorage: 'i18nextLng',
        },

        react: {
            useSuspense: false,
        },
    });

export default i18n;

