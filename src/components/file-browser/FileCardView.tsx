import { ClickableTile } from '@carbon/react';
import type { FileItem } from '../../types';
import { formatFileSize, formatDate } from '../../utils/formatters';
import { isPreviewableFile, isOpenableFile } from '../../utils/fileHelpers';
import { useMediaViewer } from '../../hooks/useMediaViewer';
import { EmptyDirectory } from '../common/EmptyDirectory';
import { FileItemVisual } from './FileItemVisual';
import { MediaViewer } from './MediaViewer';
import './FileCardView.css';

interface FileCardViewProps {
  files: FileItem[];
  selectedFiles: FileItem[];
  onFileSelect: (file: FileItem) => void;
  onFileOpen: (file: FileItem) => void;
}

export function FileCardView({
  files,
  selectedFiles,
  onFileSelect,
  onFileOpen,
}: FileCardViewProps) {
  const { viewerFile, isViewerOpen, handleThumbnailClick, handleCloseViewer } = useMediaViewer();
  
  const isSelected = (file: FileItem) =>
    selectedFiles.some((f) => f.path === file.path);

  if (files.length === 0) {
    return <EmptyDirectory />;
  }

  return (
    <>
    <div className="file-card-grid">
      {files.map((file) => (
        <div key={file.path} className="file-card-wrapper">
          <ClickableTile
            className={`file-card ${isSelected(file) ? 'selected' : ''}`}
            onClick={() => {
              onFileSelect(file);
            }}
            onDoubleClick={() => {
              if (isOpenableFile(file)) {
                onFileOpen(file);
              }
            }}
          >
            <div
              className="file-card-icon"
              onClick={(e) => {
                if (isPreviewableFile(file)) {
                  handleThumbnailClick(file, e);
                }
              }}
            >
              <FileItemVisual
                file={file}
                size={48}
                previewClassName="file-card-thumbnail"
                fallbackClassName={file.preview && file.previewInfo ? 'hidden' : undefined}
              />
            </div>
            <div className="file-card-name" title={file.basename}>
              {file.basename}
            </div>
            <div className="file-card-details">
              {file.type !== 'symbolic_link' && (
                <div className="file-card-size">{formatFileSize(file.size)}</div>
              )}
              <div className="file-card-date">{formatDate(file.mtime)}</div>
            </div>
          </ClickableTile>
        </div>
      ))}
    </div>
    <MediaViewer
      file={viewerFile}
      isOpen={isViewerOpen}
      onClose={handleCloseViewer}
    />
    </>
  );
}

