import { useTranslation } from 'react-i18next';
import './LanguagePanel.css';

const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'es', 'zh', 'ja', 'pt', 'ru', 'ar'] as const;

function getSupportedLanguage(language: string | undefined) {
  const normalizedLanguage = language?.split('-')[0] ?? 'en';
  return SUPPORTED_LANGUAGES.includes(normalizedLanguage as (typeof SUPPORTED_LANGUAGES)[number])
    ? (normalizedLanguage as (typeof SUPPORTED_LANGUAGES)[number])
    : 'en';
}

interface LanguagePanelProps {
  onClose?: () => void;
}

export function LanguagePanel({ onClose }: LanguagePanelProps) {
  const { i18n, t } = useTranslation('common');

  const currentLanguage = getSupportedLanguage(i18n.resolvedLanguage ?? i18n.language);

  const handleLanguageChange = (language: (typeof SUPPORTED_LANGUAGES)[number]) => {
    void i18n.changeLanguage(language);
    // Close the panel after selection
    onClose?.();
  };

  return (
    <div className="language-panel">
      <div className="language-panel-header">
        <h3>{t('language.title')}</h3>
      </div>
      
      <div className="language-panel-content">
        {SUPPORTED_LANGUAGES.map((language) => (
          <button
            key={language}
            className={`language-panel-item ${currentLanguage === language ? 'active' : ''}`}
            onClick={() => handleLanguageChange(language)}
          >
            {t('language.nativeName', { lng: language })}
          </button>
        ))}
      </div>
    </div>
  );
}
