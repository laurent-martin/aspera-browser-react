import type { DirList, ConnectionCredentials, NodeInfo } from '../types';
import type { TransferSpec } from '@ibm-aspera/sdk';

/**
 * Common interface for all file management services
 * Allows abstracting different implementations (Node API Gen3, Gen4, SSH)
 */
export interface IFileService {
    /**
     * Configure credentials for the connection
     * For Access Key, this also fetches metadata including root_file_id
     */
    setCredentials(credentials: ConnectionCredentials): void | Promise<void>;

    /**
     * Retrieve server/node information
     */
    info(): Promise<NodeInfo>;

    /**
     * List directory contents
     * @param id - Universal identifier: full path for Node User, file_id for Access Key
     */
    browse(id: string): Promise<DirList>;

    /**
     * Build a transfer spec for downloading files
     * @param paths - Array of file paths to download
     * @returns Complete TransferSpec ready for Aspera Web Agent
     */
    buildDownloadTransferSpec(paths: string[]): Promise<TransferSpec>;

    /**
     * Build a transfer spec for uploading files
     * @param paths - Array of source file paths to upload
     * @param destinationPath - Destination directory path on the server
     * @returns Complete TransferSpec ready for Aspera Web Agent
     */
    buildUploadTransferSpec(paths: string[], destinationPath: string): Promise<TransferSpec>;

    /**
     * Prepare file download
     * @deprecated Use buildDownloadTransferSpec instead
     */
    downloadSetup(paths: Array<{ source: string }>): Promise<any>;

    /**
     * Prepare file upload
     * @deprecated Use buildUploadTransferSpec instead
     */
    uploadSetup(paths: Array<{ source: string }>, destinationPath: string): Promise<any>;

    /**
     * Create a new directory
     * @param parentId - Universal identifier: full path for Node User, file_id for Access Key
     * @param name - Name of the directory to create
     */
    createDir(parentId: string, name: string): Promise<any>;

    /**
     * Delete files or directories
     * @param ids - Array of universal identifiers (paths for Node User, file_ids for Access Key)
     */
    deleteFiles(ids: string[]): Promise<any>;

    /**
     * Rename a file or directory
     * @param id - Universal identifier of the file/directory to rename
     * @param newName - New name for the file/directory
     */
    rename(id: string, newName: string): Promise<any>;
}

