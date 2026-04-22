/**
 * File helper utilities
 * Includes file type detection logic from aspera-cli lib/aspera/preview/file_types.rb
 */

import type { FileItem } from '../types';

/**
 * Conversion types for file preview/processing
 */
export type ConversionType = 'image' | 'office' | 'pdf' | 'plaintext' | 'video';

/**
 * Special cases for MIME types mapping to conversion types
 */
const SUPPORTED_MIME_TYPES: Record<string, ConversionType> = {
    // Plaintext
    'application/json': 'plaintext',
    'text/plain': 'plaintext',

    // PDF
    'application/pdf': 'pdf',

    // Video
    'audio/ogg': 'video',
    'application/mxf': 'video',

    // Office
    'application/mac-binhex40': 'office',
    'application/msword': 'office',
    'application/vnd.ms-excel': 'office',
    'application/vnd.ms-powerpoint': 'office',
    'application/rtf': 'office',
    'application/x-abiword': 'office',
    'application/x-mspublisher': 'office',
    'image/vnd.dxf': 'office',
    'image/x-cmx': 'office',
    'image/x-freehand': 'office',
    'image/x-pict': 'office',
    'text/csv': 'office',
    'text/html': 'office',

    // Image
    'application/dicom': 'image',
    'application/postscript': 'image',
    'application/vnd.3gpp.pic-bw-small': 'image',
    'application/vnd.hp-hpgl': 'image',
    'application/vnd.hp-pcl': 'image',
    'application/vnd.mobius.msl': 'image',
    'application/vnd.mophun.certificate': 'image',
    'application/x-director': 'image',
    'application/x-font-type1': 'image',
    'application/x-msmetafile': 'image',
    'application/x-xfig': 'image',
    'font/ttf': 'image',
    'text/troff': 'image',
    'video/x-mng': 'image',
};

/**
 * Map a MIME type to a conversion type
 * @param mimetype - The MIME type to map
 * @returns The conversion type, or null if not found
 */
function mimeToType(mimetype: string): ConversionType | null {
    if (!mimetype) {
        return null;
    }

    // Check exact match first
    if (mimetype in SUPPORTED_MIME_TYPES) {
        return SUPPORTED_MIME_TYPES[mimetype];
    }

    // Check for MS Office formats
    if (mimetype.startsWith('application/vnd.ms-')) {
        return 'office';
    }

    // Check for OpenXML Office formats
    if (mimetype.startsWith('application/vnd.openxmlformats-officedocument')) {
        return 'office';
    }

    // Check for video types
    if (mimetype.startsWith('video/')) {
        return 'video';
    }

    // Check for image types
    if (mimetype.startsWith('image/')) {
        return 'image';
    }

    return null;
}

/**
 * Infer MIME type from file extension
 * @param filename - The filename to infer from
 * @returns The inferred MIME type or 'application/octet-stream' if unknown
 */
function inferMimeTypeFromExtension(filename: string): string {
    const ext = filename.toLowerCase().split('.').pop();

    if (!ext) {
        return 'application/octet-stream';
    }

    // Common extensions mapping
    const extensionMap: Record<string, string> = {
        // Images
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'png': 'image/png',
        'gif': 'image/gif',
        'bmp': 'image/bmp',
        'webp': 'image/webp',
        'svg': 'image/svg+xml',
        'tiff': 'image/tiff',
        'tif': 'image/tiff',
        'ico': 'image/x-icon',
        'heic': 'image/heic',
        'heif': 'image/heif',
        'avif': 'image/avif',

        // Videos
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'avi': 'video/x-msvideo',
        'mkv': 'video/x-matroska',
        'webm': 'video/webm',
        'flv': 'video/x-flv',
        'wmv': 'video/x-ms-wmv',
        'm4v': 'video/x-m4v',
        'mpg': 'video/mpeg',
        'mpeg': 'video/mpeg',
        '3gp': 'video/3gpp',
        'ogv': 'video/ogg',
        'ts': 'video/mp2t',
        'm2ts': 'video/mp2t',
        'mxf': 'application/mxf',

        // Office
        'doc': 'application/msword',
        'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'xls': 'application/vnd.ms-excel',
        'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'ppt': 'application/vnd.ms-powerpoint',
        'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'odt': 'application/vnd.oasis.opendocument.text',
        'ods': 'application/vnd.oasis.opendocument.spreadsheet',
        'odp': 'application/vnd.oasis.opendocument.presentation',
        'rtf': 'application/rtf',
        'csv': 'text/csv',
        'html': 'text/html',
        'htm': 'text/html',

        // PDF
        'pdf': 'application/pdf',

        // Plaintext
        'txt': 'text/plain',
        'json': 'application/json',
        'xml': 'application/xml',
        'md': 'text/plain',
        'log': 'text/plain',
    };

    return extensionMap[ext] || 'application/octet-stream';
}

/**
 * Get the conversion type for a file based on its MIME type and filename
 * @param filename - The name of the file
 * @param mimetype - The MIME type (optional, can be empty or null)
 * @returns The conversion type, or null if not determinable
 */
function getConversionType(
    filename: string,
    mimetype?: string | null
): ConversionType | null {
    // If no MIME type provided or it's the generic octet-stream, try to infer from extension
    const effectiveMimetype = mimetype && mimetype !== 'application/octet-stream'
        ? mimetype
        : inferMimeTypeFromExtension(filename);

    if (!effectiveMimetype || effectiveMimetype === 'application/octet-stream') {
        return null;
    }

    return mimeToType(effectiveMimetype);
}

/**
 * Check if a file is of a specific conversion type
 * @param filename - The filename
 * @param mimetype - The MIME type (optional)
 * @param type - The conversion type to check
 * @returns True if the file matches the conversion type
 */
function isFileOfType(
    filename: string,
    mimetype: string | null | undefined,
    type: ConversionType
): boolean {
    const conversionType = getConversionType(filename, mimetype);
    return conversionType === type;
}

/**
 * Get the conversion type for a file
 * Uses the file type detection logic from aspera-cli
 */
export function getFileConversionType(file: FileItem): ConversionType | null {
    return getConversionType(file.basename, file.content_type);
}

/**
 * Check if a file is a video based on MIME type or file extension
 * Uses the enhanced file type detection logic
 */
export function isVideoFile(file: FileItem): boolean {
    return isFileOfType(file.basename, file.content_type, 'video');
}

/**
 * Check if a file is an image based on MIME type or file extension
 * Uses the enhanced file type detection logic
 */
export function isImageFile(file: FileItem): boolean {
    return isFileOfType(file.basename, file.content_type, 'image');
}

/**
 * Check if a file is a PDF
 */
export function isPdfFile(file: FileItem): boolean {
    return isFileOfType(file.basename, file.content_type, 'pdf');
}

/**
 * Check if a file is an office document
 */
export function isOfficeFile(file: FileItem): boolean {
    return isFileOfType(file.basename, file.content_type, 'office');
}

/**
 * Check if a file is plaintext
 */
export function isPlaintextFile(file: FileItem): boolean {
    return isFileOfType(file.basename, file.content_type, 'plaintext');
}

/**
 * Check if a file has a thumbnail preview
 * All files with a known conversion type can have thumbnails
 */
export function hasThumbnail(file: FileItem): boolean {
    return Boolean(file.preview && getFileConversionType(file) !== null);
}

/**
 * Check if a file can be previewed as a video
 * Only video files can have video preview
 */
export function hasVideoPreview(file: FileItem): boolean {
    return Boolean(file.preview && isVideoFile(file));
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

// Made with Bob
