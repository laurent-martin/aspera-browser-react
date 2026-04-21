import { Modal } from '@carbon/react';
import { useTranslation } from 'react-i18next';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  danger = false,
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
    </Modal>
  );
}

