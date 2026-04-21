import type { FileItem } from '../types';

/**
 * Check if a file is previewable (has preview metadata or is a video)
 */
export function isPreviewableFile(file: FileItem): boolean {
    return Boolean(
        file.preview ||
        file.content_type?.includes('video/mp4') ||
        file.basename.toLowerCase().endsWith('.mp4')
    );
}

/**
 * Check if a file is openable (directory or symbolic link with target)
 */
export function isOpenableFile(file: FileItem): boolean {
    return file.type === 'directory' || (file.type === 'symbolic_link' && Boolean(file.target_id));
}

/**
 * Build breadcrumb items from file ID path or current path
 */
export function buildBreadcrumbItems(
    fileIdPath: string[],
    breadcrumbNames: string[],
    currentPath: string
): Array<{ dirname: string; path: string }> {
    if (fileIdPath.length > 0) {
        // For Access Key: use breadcrumbNames array
        return breadcrumbNames.map((dirname, index) => ({
            dirname,
            path: '/' + breadcrumbNames.slice(0, index + 1).join('/'),
        }));
    } else {
        // For other protocols: use path-based breadcrumb
        return currentPath
            .split('/')
            .filter(Boolean)
            .map((dirname, index, arr) => ({
                dirname,
                path: '/' + arr.slice(0, index + 1).join('/'),
            }));
    }
}
