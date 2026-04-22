import type { FileItem } from '../types';

/**
 * Common video file extensions
 */
const VIDEO_EXTENSIONS = [
    '.mp4', '.mov', '.avi', '.mkv', '.webm', '.flv', '.wmv',
    '.m4v', '.mpg', '.mpeg', '.3gp', '.ogv', '.ts', '.m2ts', '.mxf'
];

/**
 * Common image file extensions
 */
const IMAGE_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg',
    '.tiff', '.tif', '.ico', '.heic', '.heif', '.avif'
];

/**
 * Check if a file is a video based on MIME type or file extension
 */
export function isVideoFile(file: FileItem): boolean {
    // Check MIME type first
    if (file.content_type?.startsWith('video/')) {
        return true;
    }

    // Check file extension as fallback
    const lowerBasename = file.basename.toLowerCase();
    return VIDEO_EXTENSIONS.some(ext => lowerBasename.endsWith(ext));
}

/**
 * Check if a file is an image based on MIME type or file extension
 */
export function isImageFile(file: FileItem): boolean {
    // Check MIME type first
    if (file.content_type?.startsWith('image/')) {
        return true;
    }

    // Check file extension as fallback
    const lowerBasename = file.basename.toLowerCase();
    return IMAGE_EXTENSIONS.some(ext => lowerBasename.endsWith(ext));
}

/**
 * Check if a file is previewable (has preview metadata, is an image, or is a video)
 */
export function isPreviewableFile(file: FileItem): boolean {
    return Boolean(file.preview || isImageFile(file) || isVideoFile(file));
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
