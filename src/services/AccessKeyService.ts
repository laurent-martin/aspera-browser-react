import type { NodeAPICredentials, DirList, ConnectionCredentials } from '../types';
import { BaseNodeApiService } from './BaseNodeApiService';
import type { components } from '../types/asperaNodeApi';

type AccessKeyMetadata = components['schemas']['accessKeyGETMetadata'];

/**
 * Extended file metadata that includes fields not in the OpenAPI spec
 * but present in actual API responses
 */
interface ExtendedFileMetadata {
    id?: string;
    name?: string;
    path?: string;
    size?: number;
    type?: "file" | "link" | "folder";
    modified_time?: string;
    mount_point?: boolean;
    access_levels?: ("list" | "read" | "write" | "delete" | "mkdir" | "rename" | "preview")[];
    access_level?: string;
    content_type?: string;
    preview?: {
        content_type: string;
    };
    target_id?: string;
    target_node_id?: string;
}

/**
 * Service for Access Key authentication
 * Uses the same Aspera Node API endpoints as Node User but with Access Key authentication
 *
 * Note: Access Key and Node User use the same Aspera Node API.
 * The only difference is the authentication method:
 * - Node User: Basic Auth with username/password
 * - Access Key: Basic Auth with access_key_id/secret
 *
 * Access Keys have a root_file_id that defines the storage root for file operations.
 */
export class AccessKeyService extends BaseNodeApiService {
    private rootFileId: string | null = null;
    private lastCredentialsKey: string | null = null;
    private previewCache = new Map<string, Blob>();

    async setCredentials(credentials: ConnectionCredentials): Promise<void> {
        this.validateAccessType(credentials, 'access-key');

        // Type assertion after access_type validation
        const nodeCredentials = credentials as NodeAPICredentials;

        // Create a unique key for these credentials to detect changes
        const credentialsKey = `${nodeCredentials.url}|${nodeCredentials.username}|${nodeCredentials.password}`;

        // Only fetch metadata if credentials have changed
        const credentialsChanged = this.lastCredentialsKey !== credentialsKey;

        this.credentials = nodeCredentials;
        this.client.defaults.baseURL = nodeCredentials.url;

        // Access Key uses Basic Auth with access_key_id as username and secret as password
        this.client.defaults.auth = {
            username: nodeCredentials.username, // access_key_id
            password: nodeCredentials.password,   // secret
        };

        // Retrieve access key metadata only if credentials changed
        if (credentialsChanged) {
            this.previewCache.clear();
            await this.fetchAccessKeyMetadata();
            this.lastCredentialsKey = credentialsKey;
        }
    }

    /**
     * Fetch access key metadata including root_file_id
     * This is called during connection setup
     */
    private async fetchAccessKeyMetadata(): Promise<void> {
        try {
            const response = await this.client.get<AccessKeyMetadata>('/self');
            this.rootFileId = response.data.root_file_id || null;

            if (this.rootFileId) {
                console.log('Access key root_file_id retrieved:', this.rootFileId);
            } else {
                console.warn('Access key metadata does not contain root_file_id');
            }
        } catch (error) {
            console.error('Failed to fetch access key metadata:', error);
            throw new Error('Failed to retrieve access key information');
        }
    }

    /**
     * Get the root file ID for this access key
     * This ID represents the storage root accessible by this access key
     */
    getRootFileId(): string | null {
        return this.rootFileId;
    }


    /**
     * Browse directory contents
     * @param id - For Access Key: file_id of the directory
     */
    async browse(id: string): Promise<DirList> {
        try {
            const response = await this.client.get<ExtendedFileMetadata[] | { error?: string; message?: string }>(
                `/files/${id}/files`,
                {
                    headers: {
                        'Accept': 'application/json',
                        'Accept-Version': '4.0',
                    },
                }
            );

            if (!Array.isArray(response.data)) {
                const errorData = response.data;
                throw new Error(
                    errorData?.error ||
                    errorData?.message ||
                    'Unexpected response format from access key browse endpoint'
                );
            }

            // Convert the response to DirList format for compatibility
            const items = response.data.map((item) => ({
                basename: item.name || '',
                path: item.path || '',
                type: item.type === 'folder' ? 'directory' as const :
                    item.type === 'link' ? 'symbolic_link' as const :
                        'file' as const,
                size: item.size || 0,
                mtime: item.modified_time || '',
                id: item.id || '', // Universal identifier: file_id for Access Key
                file_id: item.id, // Kept for backward compatibility
                content_type: item.content_type, // MIME type of the file
                previewInfo: item.preview ? {
                    content_type: item.preview.content_type || ''
                } : undefined, // Preview metadata if available
                target_id: item.target_id, // For links: the file ID of the link target
                target_node_id: item.target_node_id, // For links: the node ID where the target is located
            }));

            // For Access Key, the path will be constructed by the UI from breadcrumb navigation
            // We return a placeholder path that will be overridden by the calling code
            return {
                self: {
                    path: '/',
                },
                items,
            };
        } catch (error) {
            console.error('Failed to browse by ID:', error);
            throw error;
        }
    }

    /**
     * Get preview image for a file
     * GET /files/{id}/preview
     *
     * @param fileId - The file ID to get preview for
     * @returns Blob containing the preview image
     */
    async getPreview(fileId: string): Promise<Blob> {
        const cachedPreview = this.previewCache.get(fileId);
        if (cachedPreview) {
            return cachedPreview;
        }

        try {
            const response = await this.client.get(`/files/${fileId}/preview`, {
                headers: {
                    'Accept': 'image/png',
                },
                responseType: 'blob',
            });

            this.previewCache.set(fileId, response.data);
            return response.data;
        } catch (error) {
            console.error('Failed to get preview:', error);
            throw error;
        }
    }

    /**
     * Get video preview for a file
     * GET /files/{id}/preview with Accept: video/*
     *
     * @param fileId - The file ID to get video preview for
     * @returns Blob containing the video preview
     * @throws Error if video preview is not available (404)
     */
    async getVideoPreview(fileId: string): Promise<Blob> {
        try {
            const response = await this.client.get(`/files/${fileId}/preview`, {
                headers: {
                    'Accept': 'video/*',
                },
                responseType: 'blob',
            });

            return response.data;
        } catch (error) {
            console.error('Failed to get video preview:', error);
            throw error;
        }
    }

    /**
     * Get video preview with byte range support for streaming
     * GET /files/{id}/preview with Accept: video/* and Range header
     *
     * @param fileId - The file ID to get video preview for
     * @param start - Start byte position (optional)
     * @param end - End byte position (optional)
     * @returns Object containing the blob chunk and content range info
     * @throws Error if video preview is not available (404)
     */
    async getVideoPreviewRange(
        fileId: string,
        start?: number,
        end?: number
    ): Promise<{ blob: Blob; contentRange?: string; totalSize?: number }> {
        try {
            const headers: Record<string, string> = {
                'Accept': 'video/*',
            };

            // Add Range header if start or end is specified
            if (start !== undefined || end !== undefined) {
                const rangeStart = start ?? 0;
                const rangeEnd = end !== undefined ? end : '';
                headers['Range'] = `bytes=${rangeStart}-${rangeEnd}`;
            }

            const response = await this.client.get(`/files/${fileId}/preview`, {
                headers,
                responseType: 'blob',
            });

            // Extract content range information from response headers
            const contentRange = response.headers['content-range'];
            const contentType = String(response.headers['content-type'] || 'video/mp4');
            let totalSize: number | undefined;

            if (contentRange) {
                // Content-Range format: "bytes start-end/total"
                const match = contentRange.match(/bytes \d+-\d+\/(\d+)/);
                if (match) {
                    totalSize = parseInt(match[1], 10);
                }
            }

            // Ensure the blob has the correct MIME type from the response
            const blob = new Blob([response.data], { type: contentType });

            console.log('Range response:', {
                contentRange,
                contentType,
                totalSize,
                blobSize: blob.size,
                blobType: blob.type
            });

            return {
                blob,
                contentRange,
                totalSize,
            };
        } catch (error) {
            console.error('Failed to get video preview range:', error);
            throw error;
        }
    }


    /**
     * Create a directory
     * @param parentId - For Access Key: file_id of parent directory
     * @param name - Name of the directory to create
     * @returns Creation result with the new directory's metadata
     */
    async createDir(parentId: string, name: string): Promise<ExtendedFileMetadata> {
        const response = await this.client.post<ExtendedFileMetadata>(
            `/files/${parentId}/files`,
            {
                type: 'folder',
                name,
            }
        );
        return response.data;
    }

    /**
     * Delete files or directories
     * @param ids - For Access Key: array of file_ids
     */
    async deleteFiles(ids: string[]) {
        // For Access Key, use DELETE /files/{id} for each file
        const deletePromises = ids.map(id =>
            this.client.delete(`/files/${id}`)
        );

        const results = await Promise.all(deletePromises);
        return results.map(r => r.data);
    }

    /**
     * Rename a file or directory
     * @param id - For Access Key: file_id of the file/directory
     * @param newName - New name (not full path, just the name)
     */
    async rename(id: string, newName: string) {
        // For Access Key, use PUT /files/{id} to update the name
        const response = await this.client.put(`/files/${id}`, {
            name: newName,
        });
        return response.data;
    }
}

