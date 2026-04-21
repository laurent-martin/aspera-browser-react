import { useState } from 'react';
import type { FileItem } from '../types';
import { isPreviewableFile } from '../utils/fileHelpers';

/**
 * Custom hook to manage MediaViewer state and handlers
 */
export function useMediaViewer() {
    const [viewerFile, setViewerFile] = useState<FileItem | null>(null);
    const [isViewerOpen, setIsViewerOpen] = useState(false);

    const handleThumbnailClick = (file: FileItem, e: React.MouseEvent) => {
        e.stopPropagation();
        if (isPreviewableFile(file)) {
            setViewerFile(file);
            setIsViewerOpen(true);
        }
    };

    const handleCloseViewer = () => {
        setIsViewerOpen(false);
        setViewerFile(null);
    };

    return {
        viewerFile,
        isViewerOpen,
        handleThumbnailClick,
        handleCloseViewer,
    };
}
