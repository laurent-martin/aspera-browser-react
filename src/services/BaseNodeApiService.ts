import axios, { type AxiosInstance } from 'axios';
import type { NodeAPICredentials, DirList, NodeInfo, ConnectionCredentials } from '../types';
import type { IFileService } from './IFileService';
import type { TransferSpec } from '@ibm-aspera/sdk';

/**
 * Base service for Node API implementations (Node User and Access Key)
 * Provides common Axios configuration and shared methods
 */
export abstract class BaseNodeApiService implements IFileService {
    protected client: AxiosInstance;
    protected credentials: NodeAPICredentials | null = null;

    constructor() {
        this.client = this.createAxiosClient();
    }

    /**
     * Create and configure Axios client with common settings
     */
    protected createAxiosClient(): AxiosInstance {
        const client = axios.create({
            timeout: 30000,
            headers: {
                'Content-Type': 'application/json',
            },
        });

        // Add response interceptor for better error handling
        client.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response?.status === 401) {
                    console.error('Authentication failed (401):', {
                        url: error.config?.url,
                        baseURL: error.config?.baseURL,
                        auth: error.config?.auth ? 'present' : 'missing',
                    });
                }
                return Promise.reject(error);
            }
        );

        return client;
    }

    /**
     * Validate protocol matches expected protocol for this service
     */
    protected validateProtocol(credentials: ConnectionCredentials, expectedProtocol: string): void {
        if (credentials.protocol !== expectedProtocol) {
            throw new Error(`Invalid protocol for ${this.constructor.name}`);
        }
    }

    /**
     * Common implementation of info() for Node API services
     */
    async info(): Promise<NodeInfo> {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await this.client.get('/info', {
            headers: {
                'Accept': 'application/json',
            },
        });

        return {
            name: response.data.name || this.credentials.username,
            url: response.data.url || this.credentials.url,
        };
    }

    /**
     * Build a transfer spec for downloading files
     * Calls the Node API download_setup endpoint and returns the transfer spec
     */
    async buildDownloadTransferSpec(paths: string[]): Promise<TransferSpec> {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await this.client.post('/files/download_setup', {
            transfer_requests: [
                {
                    transfer_request: {
                        paths: paths.map(path => ({ source: path })),
                    },
                },
            ],
        });

        // Extract the transfer spec from the API response
        const transferSpecs = response.data?.transfer_specs;
        if (!transferSpecs || transferSpecs.length === 0) {
            throw new Error('No transfer spec returned from API');
        }

        const transferSpec = transferSpecs[0]?.transfer_spec;
        if (!transferSpec) {
            throw new Error('Invalid transfer spec format from API');
        }

        return transferSpec as TransferSpec;
    }

    /**
     * Build a transfer spec for uploading files
     * Calls the Node API upload_setup endpoint and returns the transfer spec
     */
    async buildUploadTransferSpec(paths: string[], destinationPath: string): Promise<TransferSpec> {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await this.client.post('/files/upload_setup', {
            transfer_requests: [
                {
                    transfer_request: {
                        paths: paths.map(path => ({ source: path })),
                        destination_root: destinationPath,
                    },
                },
            ],
        });

        // Extract the transfer spec from the API response
        const transferSpecs = response.data?.transfer_specs;
        if (!transferSpecs || transferSpecs.length === 0) {
            throw new Error('No transfer spec returned from API');
        }

        const transferSpec = transferSpecs[0]?.transfer_spec;
        if (!transferSpec) {
            throw new Error('Invalid transfer spec format from API');
        }

        return transferSpec as TransferSpec;
    }

    /**
     * Common implementation of downloadSetup() for Node API services
     * @deprecated Use buildDownloadTransferSpec instead
     */
    async downloadSetup(paths: Array<{ source: string }>) {
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
     * Common implementation of uploadSetup() for Node API services
     * @deprecated Use buildUploadTransferSpec instead
     */
    async uploadSetup(paths: Array<{ source: string }>, destinationPath: string) {
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

    // Abstract methods that must be implemented by subclasses
    abstract setCredentials(credentials: ConnectionCredentials): void | Promise<void>;
    abstract browse(id: string): Promise<DirList>;
    abstract createDir(parentId: string, name: string): Promise<any>;
    abstract deleteFiles(ids: string[]): Promise<any>;
    abstract rename(id: string, newName: string): Promise<any>;
}
