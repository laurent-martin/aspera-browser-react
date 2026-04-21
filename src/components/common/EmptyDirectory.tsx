import { useTranslation } from 'react-i18next';
import './EmptyDirectory.css';

/**
 * Component to display when a directory is empty
 */
export function EmptyDirectory() {
  const { t } = useTranslation('fileBrowser');
  
  return (
    <div className="empty-directory">
      {t('messages.emptyDirectory')}
    </div>
  );
}
