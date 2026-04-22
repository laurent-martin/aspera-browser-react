import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Header,
  HeaderName,
  HeaderGlobalBar,
  HeaderGlobalAction,
} from '@carbon/react';
import { UserMultiple, Activity, Help, EarthFilled, Asleep, Light } from '@carbon/icons-react';
import { TransferPanel } from '../transfer/TransferPanel';
import { LanguagePanel } from './LanguagePanel';
import { AccountPanel } from './AccountPanel';
import { useAuthStore } from '../../stores/useAuthStore';
import { useThemeStore } from '../../stores/useThemeStore';
import './AppLayout.css';

interface AppLayoutProps {
  children: React.ReactNode;
  onDisconnect: () => void;
  onConfigureAccount: () => void;
  onSelectAccount: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onEditAccount: (accountId: string) => void;
  isWebAgentAvailable: boolean | null;
}

export function AppLayout({ children, onDisconnect, onConfigureAccount, onSelectAccount, onDeleteAccount, onEditAccount, isWebAgentAvailable }: AppLayoutProps) {
  const { t, i18n } = useTranslation(['common', 'help', 'connection']);
  const { savedAccounts, currentAccountId } = useAuthStore();
  const { theme, toggleTheme } = useThemeStore();
  const currentLanguage = i18n.language.split('-')[0].toUpperCase();
  const [isTransferPanelOpen, setIsTransferPanelOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isAccountPanelOpen, setIsAccountPanelOpen] = useState(false);
  const [isLanguagePanelOpen, setIsLanguagePanelOpen] = useState(false);

  return (
    <div className="app-layout">
      <Header aria-label={t('common:app.name')}>
        <HeaderName prefix={t('common:app.prefix')}>
          {t('common:app.name')}
        </HeaderName>
        {currentAccountId && (() => {
          const account = savedAccounts.find(a => a.id === currentAccountId);
          if (!account) return null;
          
          const protocolKey = account.credentials.protocol === 'node-user'
            ? 'protocolNodeGen3'
            : account.credentials.protocol === 'access-key'
            ? 'protocolNodeGen4'
            : 'protocolSSH';
          
          return (
            <div className="connection-info">
              {t(`connection:settings.${protocolKey}`)}: {account.name}
            </div>
          );
        })()}
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label={t('common:labels.accounts')}
            onClick={() => {
              setIsAccountPanelOpen(!isAccountPanelOpen);
              setIsTransferPanelOpen(false);
              setIsHelpOpen(false);
              setIsLanguagePanelOpen(false);
            }}
            isActive={isAccountPanelOpen}
          >
            <UserMultiple size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label={t('common:labels.transferActivity')}
            onClick={() => {
              setIsTransferPanelOpen(!isTransferPanelOpen);
              setIsHelpOpen(false);
              setIsAccountPanelOpen(false);
              setIsLanguagePanelOpen(false);
            }}
            isActive={isTransferPanelOpen}
            className={
              isWebAgentAvailable === false
                ? 'web-agent-warning'
                : isWebAgentAvailable === true
                ? 'web-agent-available'
                : ''
            }
          >
            <Activity size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label={t('common:labels.help')}
            onClick={() => {
              setIsHelpOpen(!isHelpOpen);
              setIsTransferPanelOpen(false);
              setIsAccountPanelOpen(false);
              setIsLanguagePanelOpen(false);
            }}
            isActive={isHelpOpen}
          >
            <Help size={20} />
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label={t('common:theme.toggleAriaLabel')}
            onClick={toggleTheme}
          >
            {theme === 'light' ? <Asleep size={20} /> : <Light size={20} />}
          </HeaderGlobalAction>
          <HeaderGlobalAction
            aria-label={t('common:language.menuAriaLabel')}
            onClick={() => {
              setIsLanguagePanelOpen(!isLanguagePanelOpen);
              setIsTransferPanelOpen(false);
              setIsHelpOpen(false);
              setIsAccountPanelOpen(false);
            }}
            isActive={isLanguagePanelOpen}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <EarthFilled size={20} />
              <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{currentLanguage}</span>
            </div>
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <div className="app-body">
        <div className="app-content">
          {children}
        </div>

        {isAccountPanelOpen && (
          <aside className="side-panel">
            <AccountPanel
              onDisconnect={() => {
                onDisconnect();
                setIsAccountPanelOpen(false);
              }}
              onConfigureAccount={() => {
                onConfigureAccount();
                setIsAccountPanelOpen(false);
              }}
              onSelectAccount={(accountId) => {
                onSelectAccount(accountId);
                setIsAccountPanelOpen(false);
              }}
              onDeleteAccount={(accountId) => {
                onDeleteAccount(accountId);
              }}
              onEditAccount={(accountId) => {
                onEditAccount(accountId);
                setIsAccountPanelOpen(false);
              }}
            />
          </aside>
        )}

        {isTransferPanelOpen && (
          <aside className="side-panel">
            <TransferPanel />
          </aside>
        )}

        {isHelpOpen && (
          <aside className="side-panel">
            <div className="help-panel">
              <h3>{t('help:title')}</h3>
              <div className="help-content">
                <h4>{t('help:sections.navigation.title')}</h4>
                <p>{t('help:sections.navigation.content')}</p>
                
                <h4>{t('help:sections.fileSelection.title')}</h4>
                <p>{t('help:sections.fileSelection.content')}</p>
                
                <h4>{t('help:sections.download.title')}</h4>
                <p>{t('help:sections.download.content')}</p>
                
                <h4>{t('help:sections.upload.title')}</h4>
                <p>{t('help:sections.upload.content')}</p>
                
                <h4>{t('help:sections.viewModes.title')}</h4>
                <p>{t('help:sections.viewModes.content')}</p>
              </div>
            </div>
          </aside>
        )}

        {isLanguagePanelOpen && (
          <aside className="side-panel">
            <LanguagePanel onClose={() => setIsLanguagePanelOpen(false)} />
          </aside>
        )}
      </div>
    </div>
  );
}


