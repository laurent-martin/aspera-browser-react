import axios, { type AxiosInstance, type AxiosError } from 'axios';
import type { NodeAPICredentials } from '../types';
import type { components } from '../types/asperaNodeApi';

/**
 * Types extracted from OpenAPI for simplified usage
 */
export type FilesBrowseRequest = components['schemas']['filesBrowseRequest'];
export type FilesBrowseResponse = components['schemas']['filesBrowseResponse'];
export type FilesBrowseMeta = components['schemas']['filesBrowseMeta'];
export type NodeInfoResponse = components['schemas']['info-get-200'];
export type ApiError = components['schemas']['error'];
export type ApiErrorBody = components['schemas']['errorBody'];

/**
 * Interface for browse response compatible with legacy format
 */
export interface DirList {
    self: {
        path: string;
    };
    items: Array<{
        basename: string;
        path: string;
        type: 'file' | 'directory' | 'symbolic_link';
        size: number;
        mtime: string;
    }>;
}

/**
 * Custom error class for Node API errors
 */
export class AsperaNodeApiError extends Error {
    public statusCode?: number;
    public errorCode?: number;
    public details?: ApiError;

    constructor(
        message: string,
        statusCode?: number,
        errorCode?: number,
        details?: ApiError
    ) {
        super(message);
        this.name = 'AsperaNodeApiError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.details = details;
    }
}

/**
 * Service for interacting with Aspera Node API
 * Based on OpenAPI specification v4.4.6
 *
 * @see https://raw.githubusercontent.com/laurent-martin/aspera-api-examples/refs/heads/main/openapi/IBM%20Aspera%20Node%20API-4.4.6.yaml
 */
class AsperaNodeApiService {
    private client: AxiosInstance;

    constructor() {
        this.client = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });

        // Interceptor to handle errors consistently
        this.client.interceptors.response.use(
            (response) => response,
            (error: AxiosError<ApiError>) => {
                if (error.response?.data) {
                    const apiError = error.response.data;
                    throw new AsperaNodeApiError(
                        apiError.error?.user_message || apiError.error?.reason || 'Unknown API error',
                        error.response.status,
                        apiError.error?.code,
                        apiError
                    );
                }
                throw new AsperaNodeApiError(
                    error.message || 'Network error',
                    error.response?.status
                );
            }
        );
    }

    /**
     * Configure credentials for authentication
     * @param credentials - Node API credentials (Node User or Access Key)
     */
    setCredentials(credentials: NodeAPICredentials): void {
        this.client.defaults.baseURL = credentials.url;
        this.client.defaults.auth = {
            username: credentials.username,
            password: credentials.password,
        };
    }

    /**
     * Get node information
     * GET /info
     *
     * @returns Node information (name, version, capabilities, etc.)
     * @throws {AsperaNodeApiError} If the request fails
     */
    async info(): Promise<NodeInfoResponse> {
        const response = await this.client.get<NodeInfoResponse>('/info');
        return response.data;
    }

    /**
     * List directory contents
     * POST /files/browse
     *
     * @param path - Directory path to browse
     * @param options - Filtering and sorting options (optional)
     * @returns List of files and directories
     * @throws {AsperaNodeApiError} If the request fails
     */
    async browse(
        path: string,
        options?: Omit<FilesBrowseRequest, 'path'>
    ): Promise<DirList> {
        const request: FilesBrowseRequest = {
            path,
            ...options,
        };

        const response = await this.client.post<FilesBrowseResponse>(
            '/files/browse',
            request
        );

        // Convert to DirList format for compatibility
        return {
            self: {
                path: response.data.self?.path || path,
            },
            items: (response.data.items || []).map((item) => ({
                basename: item.basename || '',
                path: item.path || '',
                type: (item.type as 'file' | 'directory' | 'symbolic_link') || 'file',
                size: item.size || 0,
                mtime: item.mtime || '',
            })),
        };
    }

    /**
     * Setup a download
     * POST /files/download_setup
     *
     * @param paths - List of files to download
     * @returns Transfer configuration with token
     * @throws {AsperaNodeApiError} If the request fails
     */
    async downloadSetup(paths: Array<{ source: string }>): Promise<unknown> {
        const response = await this.client.post('/files/download_setup', {
            transfer_requests: [
                {
                    transfer_request: {
                        paths,
                    },
                },
            ],
        });
        return response.data;
    }

    /**
     * Setup an upload
     * POST /files/upload_setup
     *
     * @param paths - List of files to upload
     * @param destinationPath - Destination path
     * @returns Transfer configuration with token
     * @throws {AsperaNodeApiError} If the request fails
     */
    async uploadSetup(
        paths: Array<{ source: string }>,
        destinationPath: string
    ): Promise<unknown> {
        const response = await this.client.post('/files/upload_setup', {
            transfer_requests: [
                {
                    transfer_request: {
                        paths,
                        destination_root: destinationPath,
                    },
                },
            ],
        });
        return response.data;
    }

    /**
     * Create a directory
     * POST /files/create
     *
     * @param path - Directory path to create
     * @returns Creation result
     * @throws {AsperaNodeApiError} If the request fails
     */
    async createDir(path: string): Promise<unknown> {
        const response = await this.client.post('/files/create', {
            path,
        });
        return response.data;
    }

    /**
     * Delete files or directories
     * POST /files/delete
     *
     * @param paths - List of paths to delete
     * @returns Deletion result
     * @throws {AsperaNodeApiError} If the request fails
     */
    async deleteFiles(paths: Array<{ path: string }>): Promise<unknown> {
        const response = await this.client.post('/files/delete', {
            paths,
        });
        return response.data;
    }

    /**
     * Rename a file or directory
     * POST /files/rename
     *
     * @param path - Source path
     * @param newPath - New path
     * @returns Rename result
     * @throws {AsperaNodeApiError} If the request fails
     */
    async rename(path: string, newPath: string): Promise<unknown> {
        const response = await this.client.post('/files/rename', {
            paths: [
                {
                    source: path,
                    destination: newPath,
                },
            ],
        });
        return response.data;
    }
}

/**
 * Singleton instance of the Node API service
 */
export const asperaNodeApi = new AsperaNodeApiService();
