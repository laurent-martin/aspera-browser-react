import {
  Button,
  ProgressBar,
  Tag,
} from '@carbon/react';
import {
  Pause,
  Play,
  Close,
  ChevronDown,
  ChevronUp,
  Folder,
} from '@carbon/icons-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTransferStore } from '../../stores/useTransferStore';
import { formatFileSize, formatTransferRate, formatDuration, formatPercentage } from '../../utils/formatters';
import type { TransferInfo } from '../../types';
import './TransferPanel.css';

interface TransferItemProps {
  transfer: TransferInfo;
  onPause: (uuid: string) => void;
  onResume: (uuid: string) => void;
  onRemove: (uuid: string) => void;
  onShowDirectory: (uuid: string) => void;
}

function TransferItem({ transfer, onPause, onResume, onRemove, onShowDirectory }: TransferItemProps) {
  const { t } = useTranslation(['common', 'transfer']);
  const [isExpanded, setIsExpanded] = useState(false);

  const getStatusColor = (status: TransferInfo['status']) => {
    switch (status) {
      case 'completed':
        return 'green';
      case 'failed':
      case 'cancelled':
        return 'red';
      case 'running':
        return 'blue';
      default:
        return 'gray';
    }
  };

  const getStatusLabel = (status: TransferInfo['status']) => {
    return t(`transfer:status.${status}`);
  };

  return (
    <div className="transfer-item">
      <div className="transfer-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="transfer-info">
          <div className="transfer-title">
            {transfer.direction === 'send' ? '↑' : '↓'} {transfer.title}
          </div>
          <Tag type={getStatusColor(transfer.status)} size="sm">
            {getStatusLabel(transfer.status)}
          </Tag>
        </div>
        <div className="transfer-actions">
          {transfer.status === 'running' && (
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Pause}
              iconDescription={t('common:actions.pause')}
              hasIconOnly
              onClick={(e) => {
                e.stopPropagation();
                onPause(transfer.uuid);
              }}
            />
          )}
          {(transfer.status === 'cancelled' || transfer.status === 'failed') && (
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Play}
              iconDescription={t('common:actions.resume')}
              hasIconOnly
              onClick={(e) => {
                e.stopPropagation();
                onResume(transfer.uuid);
              }}
            />
          )}
          {transfer.status !== 'running' && (
            <Button
              kind="ghost"
              size="sm"
              renderIcon={Close}
              iconDescription={t('common:actions.remove')}
              hasIconOnly
              onClick={(e) => {
                e.stopPropagation();
                onRemove(transfer.uuid);
              }}
            />
          )}
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {transfer.status === 'running' && (
        <div className="transfer-progress">
          <ProgressBar
            value={transfer.percentage * 100}
            label={formatPercentage(transfer.percentage)}
          />
          <div className="transfer-stats">
            <span>{formatFileSize(transfer.bytes_written)} / {formatFileSize(transfer.bytes_expected)}</span>
            <span>{formatTransferRate(transfer.calculated_rate_kbps)}</span>
            <span>{t('transfer:details.eta', { time: formatDuration(transfer.remaining_usec / 1000) })}</span>
          </div>
        </div>
      )}

      {isExpanded && (
        <div className="transfer-details">
          <div className="detail-row">
            <span className="detail-label">{t('transfer:details.currentFile')}</span>
            <span className="detail-value">{transfer.current_file || '—'}</span>
          </div>
          {transfer.files && (
            <div className="detail-row">
              <span className="detail-label">{t('transfer:details.numberOfFiles')}</span>
              <span className="detail-value">{transfer.files.length}</span>
            </div>
          )}
          {transfer.error_desc && (
            <div className="detail-row error">
              <span className="detail-label">{t('transfer:details.error')}</span>
              <span className="detail-value">{transfer.error_desc}</span>
            </div>
          )}
          {transfer.status === 'completed' && transfer.elapsed_usec && (
            <div className="detail-row">
              <span className="detail-label">{t('transfer:details.duration')}</span>
              <span className="detail-value">{formatDuration(transfer.elapsed_usec / 1000)}</span>
            </div>
          )}
          {transfer.status === 'completed' && transfer.direction === 'receive' && (
            <div className="detail-row">
              <Button
                kind="tertiary"
                size="sm"
                renderIcon={Folder}
                onClick={() => onShowDirectory(transfer.uuid)}
              >
                {t('transfer:details.openFolder')}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function TransferPanel() {
  const { t } = useTranslation(['common', 'transfer']);
  const { transfers, removeTransfer, clearInactiveTransfers } = useTransferStore();
  const [agentVersion, setAgentVersion] = useState<string | null>(null);
  const [isCheckingAgent, setIsCheckingAgent] = useState(false);
  const [agentStatusMessage, setAgentStatusMessage] = useState<string | null>(null);

  const handlePause = async (uuid: string) => {
    try {
      const { asperaWebAgentService } = await import('../../services/AsperaWebAgentService');
      await asperaWebAgentService.stopTransfer(uuid);
    } catch (error) {
      console.error('Pause transfer failed:', uuid, error);
    }
  };

  const handleResume = async (uuid: string) => {
    try {
      const { asperaWebAgentService } = await import('../../services/AsperaWebAgentService');
      await asperaWebAgentService.resumeTransfer(uuid);
    } catch (error) {
      console.error('Resume transfer failed:', uuid, error);
    }
  };

  const handleRemove = async (uuid: string) => {
    try {
      const { asperaWebAgentService } = await import('../../services/AsperaWebAgentService');
      await asperaWebAgentService.removeTransfer(uuid);
      removeTransfer(uuid);
    } catch (error) {
      console.error('Remove transfer failed:', uuid, error);
      // Remove from store anyway
      removeTransfer(uuid);
    }
  };

  const handleShowDirectory = async (uuid: string) => {
    try {
      const { asperaWebAgentService } = await import('../../services/AsperaWebAgentService');
      await asperaWebAgentService.showDirectory(uuid);
    } catch (error) {
      console.error('Show directory failed:', uuid, error);
    }
  };

  const handleCheckAgent = async () => {
    setIsCheckingAgent(true);
    setAgentStatusMessage(null);

    try {
      const { asperaWebAgentService } = await import('../../services/AsperaWebAgentService');
      const info = await asperaWebAgentService.getInfo();
      const version = info.version ?? null;

      if (version) {
        setAgentVersion(version);
        setAgentStatusMessage(t('transfer:agent.available'));
      } else {
        setAgentVersion(null);
        setAgentStatusMessage(t('transfer:agent.unknown'));
      }
    } catch (error) {
      console.error('Check agent failed:', error);
      setAgentVersion(null);
      setAgentStatusMessage(t('transfer:agent.unavailable'));
    } finally {
      setIsCheckingAgent(false);
    }
  };

  const runningCount = transfers.filter((t) => t.status === 'running').length;

  return (
    <div className="transfer-panel">
      <div className="transfer-panel-header">
        <h3>{t('transfer:panel.title')} ({transfers.length})</h3>
        {runningCount > 0 && (
          <Tag type="blue" size="sm">
            {t('transfer:panel.running', { count: runningCount })}
          </Tag>
        )}
        <Button
          kind="ghost"
          size="sm"
          onClick={handleCheckAgent}
          disabled={isCheckingAgent}
        >
          {t('transfer:agent.check')}
        </Button>
        {transfers.length > 0 && (
          <Button
            kind="ghost"
            size="sm"
            onClick={clearInactiveTransfers}
          >
            {t('common:actions.clearInactive')}
          </Button>
        )}
      </div>
      {(agentVersion || agentStatusMessage) && (
        <div className="transfer-agent-status">
          <strong>{t('transfer:agent.label')}</strong>{' '}
          {agentVersion ? agentVersion : agentStatusMessage}
        </div>
      )}
      <div className="transfer-list">
        {transfers.length === 0 ? (
          <div className="empty-state">
            <p>{t('transfer:panel.noActiveTransfers')}</p>
          </div>
        ) : (
          transfers.map((transfer) => (
            <TransferItem
              key={transfer.uuid}
              transfer={transfer}
              onPause={handlePause}
              onResume={handleResume}
              onRemove={handleRemove}
              onShowDirectory={handleShowDirectory}
            />
          ))
        )}
      </div>
    </div>
  );
}

