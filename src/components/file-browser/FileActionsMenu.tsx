import { OverflowMenu, OverflowMenuItem } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import type { FileItem } from '../../types';

interface FileActionsMenuProps {
  file: FileItem;
  onDownload: (file: FileItem) => void;
  onInfo: (file: FileItem) => void;
  onRename: (file: FileItem) => void;
  onDelete: (file: FileItem) => void;
  className?: string;
}

export function FileActionsMenu({
  file,
  onDownload,
  onInfo,
  onRename,
  onDelete,
  className = '',
}: FileActionsMenuProps) {
  const { t } = useTranslation('common');

  const handleAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <OverflowMenu
      className={`file-actions-menu ${className}`}
      aria-label={t('actions.moreActions')}
      size="sm"
      flipped
      onClick={(e) => e.stopPropagation()}
    >
      <OverflowMenuItem
        itemText={t('actions.download')}
        onClick={(e) => handleAction(e, () => onDownload(file))}
      />
      <OverflowMenuItem
        itemText={t('actions.info')}
        onClick={(e) => handleAction(e, () => onInfo(file))}
      />
      <OverflowMenuItem
        itemText={t('actions.rename')}
        onClick={(e) => handleAction(e, () => onRename(file))}
      />
      <OverflowMenuItem
        itemText={t('actions.delete')}
        onClick={(e) => handleAction(e, () => onDelete(file))}
        hasDivider
        isDelete
      />
    </OverflowMenu>
  );
}

// Made with Bob
