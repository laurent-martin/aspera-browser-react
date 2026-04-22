import { useTranslation } from 'react-i18next';
import { Close, Settings } from '@carbon/icons-react';
import { useAuthStore } from '../../stores/useAuthStore';
import type { NodeAPICredentials, SSHCredentials } from '../../types';
import './AccountPanel.css';

interface AccountPanelProps {
  onDisconnect: () => void;
  onConfigureAccount: () => void;
  onSelectAccount: (accountId: string) => void;
  onDeleteAccount: (accountId: string) => void;
  onEditAccount: (accountId: string) => void;
}

export function AccountPanel({ onDisconnect, onConfigureAccount, onSelectAccount, onDeleteAccount, onEditAccount }: AccountPanelProps) {
  const { t } = useTranslation(['common', 'connection']);
  const { savedAccounts, currentAccountId } = useAuthStore();

  const getAccessTypeLabel = (accessType: string) => {
    const accessTypeKey = accessType === 'node-user'
      ? 'access_type_node_gen3'
      : accessType === 'access-key'
      ? 'access_type_node_gen4'
      : 'access_type_ssh';
    return t(`connection:settings.${accessTypeKey}`);
  };

  return (
    <div className="account-panel">
      <div className="account-panel-header">
        <h3>{t('labels.accounts')}</h3>
      </div>
      
      <div className="account-panel-content">
        <button
          className={`account-panel-item ${!currentAccountId ? 'disabled' : ''}`}
          onClick={onDisconnect}
          disabled={!currentAccountId}
        >
          {t('settings.menu.disconnect')}
        </button>

        <button
          className="account-panel-item"
          onClick={onConfigureAccount}
        >
          {t('settings.menu.configureAccount')}
        </button>

        {savedAccounts.length > 0 && (
          <>
            <div className="account-panel-divider" />
            <div className="account-panel-section-title">
              {t('settings.menu.accounts')}
            </div>
            {savedAccounts.map((account) => (
              <div key={account.id} className="account-item-container">
                <button
                  className={`account-panel-item account-item ${currentAccountId === account.id ? 'active' : ''}`}
                  onClick={() => onSelectAccount(account.id)}
                >
                  <div className="account-info">
                    <div className="account-name">{account.name}</div>
                    <div className="account-url">
                      {account.credentials.access_type === 'ssh'
                        ? (account.credentials as SSHCredentials).url
                        : (account.credentials as NodeAPICredentials).url
                      }
                    </div>
                    <div className="account-type">
                      {getAccessTypeLabel(account.credentials.access_type)}
                    </div>
                  </div>
                </button>
                <div className="account-actions">
                  <button
                    className="account-action-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditAccount(account.id);
                    }}
                    title={t('settings.menu.editAccount')}
                  >
                    <Settings size={16} />
                  </button>
                  <button
                    className="account-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteAccount(account.id);
                    }}
                    title={t('settings.menu.deleteAccount')}
                  >
                    <Close size={16} />
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
