import { useTranslation } from 'react-i18next';
import {
  Button,
  ContentSwitcher,
  Switch,
} from '@carbon/react';
import {
  Download,
  Upload,
  TrashCan,
  FolderAdd,
  Renew,
} from '@carbon/icons-react';
import { useFileStore } from '../../stores/useFileStore';
import { buildBreadcrumbItems } from '../../utils/fileHelpers';
import { FileListView } from './FileListView';
import { FileCardView } from './FileCardView';
import { BreadcrumbNav } from '../common/Breadcrumb';
import type { FileItem, BreadcrumbItem } from '../../types';
import './FileBrowser.css';

interface FileBrowserProps {
  isLoading: boolean;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
  onDownload: () => void;
  onUpload: (files: File[], isFolder?: boolean) => void;
  isDropTargetActive?: boolean;
  onDelete: () => void;
  onCreateFolder: () => void;
  onRename?: (file: FileItem) => void;
  onInfo?: (file: FileItem) => void;
}

export function FileBrowser({
  isLoading,
  onRefresh,
  onNavigate,
  onDownload,
  onUpload,
  onDelete,
  onCreateFolder,
  onRename,
  onInfo,
  isDropTargetActive = false,
}: FileBrowserProps) {
  const { t } = useTranslation(['common', 'fileBrowser']);
  const {
    currentPath,
    files,
    selectedFiles,
    viewMode,
    fileIdPath,
    breadcrumbNames,
    toggleFileSelection,
    setSelectedFiles,
    clearSelection,
    setViewMode,
    setFileIdPath,
    setBreadcrumbNames,
  } = useFileStore();

  // Build breadcrumb items based on fileIdPath for Access Key or currentPath for others
  const breadcrumbItems: BreadcrumbItem[] = buildBreadcrumbItems(
    fileIdPath,
    breadcrumbNames,
    currentPath
  );

  const handleBreadcrumbNavigate = (path: string) => {
    if (fileIdPath.length > 0) {
      // For Access Key: navigate using file IDs
      const pathParts = path.split('/').filter(Boolean);
      const targetDepth = pathParts.length;
      
      // Truncate fileIdPath to match the target depth + 1 (root is at index 0)
      const newFileIdPath = fileIdPath.slice(0, targetDepth + 1);
      setFileIdPath(newFileIdPath);
      
      // Truncate breadcrumbNames to match the target depth
      const newBreadcrumbNames = breadcrumbNames.slice(0, targetDepth);
      setBreadcrumbNames(newBreadcrumbNames);
      
      // Navigate to the last file ID in the truncated path
      const targetFileId = newFileIdPath[newFileIdPath.length - 1];
      onNavigate(targetFileId);
    } else {
      // For other access types: use path-based navigation
      onNavigate(path);
    }
  };

  const handleFileOpen = (file: FileItem) => {
    // For symbolic links with target_id (Access Key mode), navigate to the target
    if (file.type === 'symbolic_link' && file.target_id) {
      onNavigate(file.target_id);
    } else if (file.type === 'directory') {
      onNavigate(file.path);
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedFiles(files);
    } else {
      clearSelection();
    }
  };

  const handleDownloadFile = (file: FileItem) => {
    setSelectedFiles([file]);
    onDownload();
  };

  const handleDeleteFile = (file: FileItem) => {
    setSelectedFiles([file]);
    onDelete();
  };

  const handleRenameFile = (file: FileItem) => {
    if (onRename) {
      onRename(file);
    }
  };

  const handleInfoFile = (file: FileItem) => {
    if (onInfo) {
      onInfo(file);
    }
  };

  return (
    <div className="file-browser">
      {isDropTargetActive && (
        <div className="drop-overlay">
          <Upload size={48} />
          <p>{t('fileBrowser:messages.dropFiles')}</p>
        </div>
      )}

      <div className="file-browser-toolbar">
        <div className="toolbar-breadcrumb">
          <BreadcrumbNav items={breadcrumbItems} onNavigate={handleBreadcrumbNavigate} />
        </div>
        
        <div className="toolbar-actions">
          <div className="toolbar-buttons">
            <Button
              kind="primary"
              size="sm"
              renderIcon={isLoading ? undefined : Renew}
              onClick={onRefresh}
              disabled={isLoading}
            >
              {t('common:actions.refresh')}
            </Button>
            <Button
              kind="primary"
              size="sm"
              renderIcon={Download}
              onClick={onDownload}
              disabled={selectedFiles.length === 0 || isLoading}
            >
              {t('common:actions.download')}
            </Button>
            <Button
              kind="primary"
              size="sm"
              renderIcon={Upload}
              onClick={() => onUpload([], false)}
              disabled={isLoading}
            >
              {t('common:actions.uploadFiles')}
            </Button>
            <Button
              kind="primary"
              size="sm"
              renderIcon={Upload}
              onClick={() => onUpload([], true)}
              disabled={isLoading}
            >
              {t('common:actions.uploadFolder')}
            </Button>
            <Button
              kind="primary"
              size="sm"
              renderIcon={FolderAdd}
              onClick={onCreateFolder}
              disabled={isLoading}
            >
              {t('fileBrowser:toolbar.newFolder')}
            </Button>
            <Button
              kind="danger"
              size="sm"
              renderIcon={TrashCan}
              onClick={onDelete}
              disabled={selectedFiles.length === 0 || isLoading}
            >
              {t('common:actions.delete')}
            </Button>
          </div>
          
          <div className="toolbar-view-switcher">
            <ContentSwitcher
              selectedIndex={viewMode === 'list' ? 0 : 1}
              onChange={(e) => setViewMode(e.name as 'list' | 'cards')}
              size="sm"
            >
              <Switch
                name="list"
                text="☰"
                data-tooltip={t('fileBrowser:viewModes.list')}
              />
              <Switch
                name="cards"
                text="⊞"
                data-tooltip={t('fileBrowser:viewModes.cards')}
              />
            </ContentSwitcher>
          </div>
        </div>
      </div>

      <div id="aspera-dropzone" className="file-browser-content">
          {viewMode === 'list' ? (
            <FileListView
              files={files}
              selectedFiles={selectedFiles}
              onFileSelect={toggleFileSelection}
              onFileOpen={handleFileOpen}
              onSelectAll={handleSelectAll}
              onDownload={handleDownloadFile}
              onDelete={handleDeleteFile}
              onRename={handleRenameFile}
              onInfo={handleInfoFile}
            />
          ) : (
            <FileCardView
              files={files}
              selectedFiles={selectedFiles}
              onFileSelect={toggleFileSelection}
              onFileOpen={handleFileOpen}
              onDownload={handleDownloadFile}
              onDelete={handleDeleteFile}
              onRename={handleRenameFile}
              onInfo={handleInfoFile}
            />
          )}
      </div>
    </div>
  );
}

