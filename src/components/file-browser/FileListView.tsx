import { useRef, useCallback } from 'react';
import {
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  TableSelectAll,
  TableSelectRow,
} from '@carbon/react';
import { useTranslation } from 'react-i18next';
import type { FileItem } from '../../types';
import { formatFileSize, formatDate } from '../../utils/formatters';
import { hasThumbnail, hasVideoPreview, isOpenableFile } from '../../utils/fileHelpers';
import { useMediaViewer } from '../../hooks/useMediaViewer';
import { EmptyDirectory } from '../common/EmptyDirectory';
import { FileTypeIcon } from './FileTypeIcon';
import { FileThumbnail } from './FileThumbnail';
import { MediaViewer } from './MediaViewer';

interface FileListViewProps {
  files: FileItem[];
  selectedFiles: FileItem[];
  onFileSelect: (file: FileItem) => void;
  onFileOpen: (file: FileItem) => void;
  onSelectAll: (selected: boolean) => void;
}

export function FileListView({
  files,
  selectedFiles,
  onFileSelect,
  onFileOpen,
  onSelectAll,
}: FileListViewProps) {
  const { t } = useTranslation('fileBrowser');
  const { viewerFile, isViewerOpen, handleThumbnailClick, handleCloseViewer } = useMediaViewer();
  const lastSelectedIndexRef = useRef<number>(-1);

  // Handle row click - only for opening directories
  const handleRowClick = useCallback((file: FileItem) => {
    // Only handle opening directories/links on row click
    if (isOpenableFile(file)) {
      onFileOpen(file);
    }
  }, [onFileOpen]);

  // Handle checkbox selection with multi-selection support
  const handleCheckboxSelect = useCallback((file: FileItem, index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const isShift = e.shiftKey;

    if (isShift && lastSelectedIndexRef.current !== -1) {
      // Range selection with Shift
      e.preventDefault();
      const start = Math.min(lastSelectedIndexRef.current, index);
      const end = Math.max(lastSelectedIndexRef.current, index);
      const filesToSelect = files.slice(start, end + 1);
      
      // Add all files in the range to the selection
      filesToSelect.forEach(f => {
        if (!selectedFiles.find(sf => sf.path === f.path)) {
          onFileSelect(f);
        }
      });
    } else {
      // Single or multi-selection with Ctrl/Cmd
      onFileSelect(file);
      lastSelectedIndexRef.current = index;
    }
  }, [files, selectedFiles, onFileSelect]);

  // Handle double-click
  const handleRowDoubleClick = useCallback((file: FileItem, e: React.MouseEvent) => {
    e.preventDefault();
    if (isOpenableFile(file)) {
      onFileOpen(file);
    }
  }, [onFileOpen]);

  const selectedRowIds = selectedFiles.map((f) => f.path);
  const allSelected = files.length > 0 && selectedFiles.length === files.length;

  if (files.length === 0) {
    return <EmptyDirectory />;
  }

  return (
    <>
      <div className="file-list-view">
        <Table aria-label={t('viewModes.list')} stickyHeader>
          <TableHead>
            <TableRow>
              <TableSelectAll
                id="file-list-select-all"
                name="file-list-select-all"
                checked={allSelected}
                onSelect={() => onSelectAll(!allSelected)}
              />
              <TableHeader className="file-list-view__header file-list-view__header--icon">
                {t('table.headers.type')}
              </TableHeader>
              <TableHeader className="file-list-view__header file-list-view__header--thumbnail" />
              <TableHeader className="file-list-view__header file-list-view__header--name">
                {t('table.headers.name')}
              </TableHeader>
              <TableHeader className="file-list-view__header file-list-view__header--files">
                {t('table.headers.files')}
              </TableHeader>
              <TableHeader className="file-list-view__header file-list-view__header--size">
                {t('table.headers.size')}
              </TableHeader>
              <TableHeader className="file-list-view__header file-list-view__header--modified">
                {t('table.headers.modified')}
              </TableHeader>
            </TableRow>
          </TableHead>
          <TableBody>
            {files.map((file) => {
              const isSelected = selectedRowIds.includes(file.path);
              const rowClickable = isOpenableFile(file);

              return (
                <TableRow
                  key={file.path}
                  isSelected={isSelected}
                  className={rowClickable ? 'file-list-view__row file-list-view__row--clickable' : 'file-list-view__row'}
                  onClick={() => handleRowClick(file)}
                  onDoubleClick={(e) => handleRowDoubleClick(file, e)}
                  title={rowClickable ? t('actions.openFolder') : file.basename}
                >
                  <TableSelectRow
                    id={`file-list-select-${file.path}`}
                    name={`file-list-select-${file.path}`}
                    checked={isSelected}
                    onSelect={(e) => handleCheckboxSelect(file, files.indexOf(file), e)}
                  />
                  <TableCell
                    className="file-list-view__cell file-list-view__cell--icon"
                    title={file.type === 'directory' ? t('types.folder') : t('types.file')}
                  >
                    {hasThumbnail(file) || hasVideoPreview(file) ? (
                      <button
                        type="button"
                        className="file-list-view__thumbnail-button file-list-view__thumbnail-button--previewable"
                        onClick={(e) => handleThumbnailClick(file, e)}
                        title={t('actions.preview')}
                        aria-label={t('actions.preview')}
                      >
                        <FileTypeIcon file={file} size={40} />
                      </button>
                    ) : (
                      <FileTypeIcon file={file} size={40} />
                    )}
                  </TableCell>
                  <TableCell className="file-list-view__cell file-list-view__cell--thumbnail">
                    <button
                      type="button"
                      className={hasThumbnail(file) || hasVideoPreview(file)
                        ? 'file-list-view__thumbnail-button file-list-view__thumbnail-button--previewable'
                        : 'file-list-view__thumbnail-button'}
                      onClick={(e) => handleThumbnailClick(file, e)}
                      title={hasThumbnail(file) || hasVideoPreview(file) ? t('actions.preview') : ''}
                      aria-label={hasThumbnail(file) || hasVideoPreview(file) ? t('actions.preview') : undefined}
                    >
                      <FileThumbnail
                        file={file}
                        size={32}
                        style={{
                          maxWidth: '32px',
                          maxHeight: '32px',
                          objectFit: 'contain',
                          borderRadius: '2px',
                          verticalAlign: 'middle',
                        }}
                      />
                    </button>
                  </TableCell>
                  <TableCell
                    className={rowClickable
                      ? 'file-list-view__cell file-list-view__cell--name file-list-view__cell--name-clickable'
                      : 'file-list-view__cell file-list-view__cell--name'}
                    title={file.basename}
                  >
                    {file.basename}
                  </TableCell>
                  <TableCell
                    className="file-list-view__cell file-list-view__cell--files"
                    title={file.type === 'directory' && file.recursive_file_count !== undefined ? `${t('table.headers.files')}: ${file.recursive_file_count}` : ''}
                  >
                    {file.type === 'directory' && file.recursive_file_count !== undefined && file.recursive_file_count > 0 ? file.recursive_file_count : '—'}
                  </TableCell>
                  <TableCell
                    className="file-list-view__cell file-list-view__cell--size"
                    title={file.type !== 'symbolic_link' ? `${t('table.headers.size')}: ${formatFileSize(file.size)}` : ''}
                  >
                    {file.type !== 'symbolic_link' ? formatFileSize(file.size) : '—'}
                  </TableCell>
                  <TableCell
                    className="file-list-view__cell file-list-view__cell--modified"
                    title={`${t('table.headers.modified')}: ${formatDate(file.mtime)}`}
                  >
                    {formatDate(file.mtime)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <MediaViewer
        file={viewerFile}
        isOpen={isViewerOpen}
        onClose={handleCloseViewer}
      />
    </>
  );
}


