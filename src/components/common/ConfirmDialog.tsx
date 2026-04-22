import { Modal } from '@carbon/react';
import { useTranslation } from 'react-i18next';

interface FileToDelete {
  basename?: string;
  path?: string;
  name?: string;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
  files?: FileToDelete[];
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  danger = false,
  files,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');

  return (
    <Modal
      open={open}
      onRequestClose={onCancel}
      modalHeading={title}
      primaryButtonText={t('actions.confirm')}
      secondaryButtonText={t('actions.cancel')}
      onRequestSubmit={onConfirm}
      danger={danger}
    >
      <p>{message}</p>
      {files && files.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <ul style={{
            listStyle: 'none',
            padding: 0,
            maxHeight: '200px',
            overflowY: 'auto',
            border: '1px solid #e0e0e0',
            borderRadius: '4px',
            backgroundColor: '#f4f4f4'
          }}>
            {files.map((file, index) => (
              <li
                key={index}
                style={{
                  padding: '0.5rem 1rem',
                  borderBottom: index < files.length - 1 ? '1px solid #e0e0e0' : 'none',
                  wordBreak: 'break-word'
                }}
              >
                {file.basename || file.name || file.path || 'Unknown file'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Modal>
  );
}

