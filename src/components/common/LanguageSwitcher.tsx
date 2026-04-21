import { useTranslation } from 'react-i18next';
import {
  HeaderMenu,
  HeaderMenuItem,
} from '@carbon/react';
import { EarthFilled } from '@carbon/icons-react';

const SUPPORTED_LANGUAGES = ['en', 'fr', 'de', 'es'] as const;

function getSupportedLanguage(language: string | undefined) {
  const normalizedLanguage = language?.split('-')[0] ?? 'en';
  return SUPPORTED_LANGUAGES.includes(normalizedLanguage as (typeof SUPPORTED_LANGUAGES)[number])
    ? (normalizedLanguage as (typeof SUPPORTED_LANGUAGES)[number])
    : 'en';
}

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation('common');

  const currentLanguage = getSupportedLanguage(i18n.resolvedLanguage ?? i18n.language);

  const handleLanguageChange = (language: (typeof SUPPORTED_LANGUAGES)[number]) => {
    void i18n.changeLanguage(language);
  };

  return (
    <HeaderMenu
      aria-label={t('language.menuAriaLabel')}
      menuLinkName={currentLanguage.toUpperCase()}
      renderMenuContent={() => (
        <span className="language-switcher__trigger">
          <EarthFilled size={16} />
        </span>
      )}
      className="language-switcher"
    >
      {SUPPORTED_LANGUAGES.map((language) => (
        <HeaderMenuItem
          key={language}
          aria-current={currentLanguage === language ? 'true' : undefined}
          onClick={() => handleLanguageChange(language)}
          isCurrentPage={currentLanguage === language}
        >
          {t('language.nativeName', { lng: language })}
        </HeaderMenuItem>
      ))}
    </HeaderMenu>
  );
}
