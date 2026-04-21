// Types for Aspera Browser application

export interface PreviewInfo {
    content_type: string;
}

export interface FileItem {
    basename: string;
    path: string;
    type: 'file' | 'directory' | 'symbolic_link';
    size: number;
    mtime: string;
    id: string; // Universal identifier: full path for Node User, file_id for Access Key
    preview?: string; // URL for thumbnail/preview for certain items
    file_id?: string; // @deprecated Use 'id' instead - kept for backward compatibility
    previewInfo?: PreviewInfo; // Preview metadata from API (Access Key mode)
    content_type?: string; // MIME type of the file
    target_id?: string; // For Access Key links: the file ID of the link target
    target_node_id?: string; // For Access Key links: the node ID where the target is located
}

export interface DirList {
    self: {
        path: string;
    };
    items: FileItem[];
}

// Connection protocol types
export type ConnectionProtocol = 'node-user' | 'access-key' | 'ssh';

// Base credentials
export interface BaseCredentials {
    protocol: ConnectionProtocol;
}

// Credentials for Node API (Node User and Access Key)
export interface NodeAPICredentials extends BaseCredentials {
    protocol: 'node-user' | 'access-key';
    url: string;
    username: string;
    password: string;
    useTokenAuth: boolean;
}

// Credentials for SSH
export interface SSHCredentials extends BaseCredentials {
    protocol: 'ssh';
    url: string; // Format: ssh://hostname:port
    username: string;
    authMethod: 'password' | 'privateKey';
    password?: string;
    privateKey?: string;
    passphrase?: string;
}

// Union type for all credential types
export type ConnectionCredentials = NodeAPICredentials | SSHCredentials;

export interface SavedAccount {
    id: string;
    name: string;
    credentials: ConnectionCredentials;
}

export interface NodeInfo {
    name: string;
    url: string;
}

export interface TransferSpec {
    remote_host: string;
    remote_user: string;
    direction: 'send' | 'receive';
    paths: Array<{ source: string; destination?: string }>;
    authentication?: 'token' | 'password';
    token?: string;
}

export interface TransferInfo {
    uuid: string;
    title: string;
    status: 'initiating' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled' | 'willretry' | 'removed';
    direction: 'send' | 'receive';
    bytes_written: number;
    bytes_expected: number;
    percentage: number;
    calculated_rate_kbps: number;
    remaining_usec: number;
    start_time: string;
    end_time?: string;
    current_file: string;
    files?: Array<{ path: string }>;
    error_desc?: string;
    transfer_spec: TransferSpec;
    elapsed_usec?: number;
}

export interface BreadcrumbItem {
    dirname: string;
    path: string;
}

export type ViewMode = 'list' | 'cards';

export interface AppConfig {
    logLevel: string;
    apiConnectProxy: string;
    isFixedURL: boolean;
    fixedURL: string;
    isFixedConnectAuth: boolean;
    fixedConnectAuth: boolean;
    enableGoto: boolean;
    enableCredLocalStorage: boolean;
    defaultCred: ConnectionCredentials;
    connectInstaller: string;
    connectMinVersion: string;
}

