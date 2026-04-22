import { Modal, CodeSnippet } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import './FileInfoDialog.css';

interface FileInfoDialogProps {
  open: boolean;
  fileName: string;
  fileInfo: any;
  onClose: () => void;
}

export function FileInfoDialog({
  open,
  fileName,
  fileInfo,
  onClose,
}: FileInfoDialogProps) {
  const { t } = useTranslation('common');

  // Format JSON with proper indentation
  const formattedJson = fileInfo ? JSON.stringify(fileInfo, null, 2) : '';

  return (
    <Modal
      open={open}
      onRequestClose={onClose}
      modalHeading={t('actions.fileInfo')}
      passiveModal
      size="lg"
    >
      <div className="file-info-dialog">
        <h4 className="file-info-title">{fileName}</h4>
        <div className="file-info-content">
          <CodeSnippet
            type="multi"
            feedback={t('actions.copied')}
            copyButtonDescription={t('actions.copy')}
            wrapText
          >
            {formattedJson}
          </CodeSnippet>
        </div>
      </div>
    </Modal>
  );
}

// Made with Bob
