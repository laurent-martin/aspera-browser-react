import type { SSHCredentials, DirList, NodeInfo, ConnectionCredentials, FileItem } from '../types';
import type { IFileService } from './IFileService';
import type { TransferSpec } from '@ibm-aspera/sdk';

/**
 * Service for SSH/SFTP connection
 * Note: This implementation requires a backend or browser extension to work
 * as browsers cannot establish SSH connections directly.
 *
 * Implementation options:
 * 1. Use a backend proxy that handles SSH connections
 * 2. Use a WebAssembly SSH extension
 * 3. Use a service worker with SSH capabilities
 */
export class SSHService implements IFileService {
    private credentials: SSHCredentials | null = null;
    private backendUrl: string = '/api/ssh'; // URL of the SSH proxy backend
    private host: string = '';
    private port: number = 22;

    setCredentials(credentials: ConnectionCredentials): void {
        if (credentials.access_type !== 'ssh') {
            throw new Error('Invalid access_type for SSHService');
        }

        this.credentials = credentials as SSHCredentials;

        // Parse and cache SSH URL
        const parsed = this.parseSSHUrl(this.credentials.url);
        this.host = parsed.host;
        this.port = parsed.port;
    }

    /**
     * Get authentication payload based on credentials
     */
    private getAuthPayload(): { password?: string; privateKey?: string; passphrase?: string } {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        return this.credentials.authMethod === 'password'
            ? { password: this.credentials.password }
            : {
                privateKey: this.credentials.privateKey,
                passphrase: this.credentials.passphrase
            };
    }

    async info(): Promise<NodeInfo> {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await fetch(`${this.backendUrl}/info`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                host: this.host,
                port: this.port,
                username: this.credentials.username,
                authMethod: this.credentials.authMethod,
                ...this.getAuthPayload(),
            }),
        });

        if (!response.ok) {
            throw new Error(`SSH connection failed: ${response.statusText}`);
        }

        await response.json();
        return {
            name: `${this.credentials.username}@${this.host}`,
            url: this.credentials.url,
        };
    }

    /**
     * Parse SSH URL to extract host and port
     * @param url SSH URL in format ssh://hostname:port
     * @returns Object with host and port
     */
    private parseSSHUrl(url: string): { host: string; port: number } {
        try {
            const urlObj = new URL(url);
            if (urlObj.protocol !== 'ssh:') {
                throw new Error('Invalid SSH URL: protocol must be ssh://');
            }
            const host = urlObj.hostname;
            const port = urlObj.port ? parseInt(urlObj.port, 10) : 22;

            if (!host) {
                throw new Error('Invalid SSH URL: hostname is required');
            }

            return { host, port };
        } catch (error) {
            throw new Error(`Failed to parse SSH URL: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    async browse(path: string): Promise<DirList> {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await fetch(`${this.backendUrl}/browse`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                host: this.host,
                port: this.port,
                username: this.credentials.username,
                authMethod: this.credentials.authMethod,
                ...this.getAuthPayload(),
                path,
            }),
        });

        if (!response.ok) {
            throw new Error(`Browse failed: ${response.statusText}`);
        }

        const data = await response.json();
        return this.normalizeSSHFileList(data, path);
    }

    /**
     * Normalize SSH response to common DirList format
     */
    private normalizeSSHFileList(data: any, path: string): DirList {
        const items: FileItem[] = (data.files || []).map((file: any) => ({
            basename: file.filename,
            path: `${path}/${file.filename}`.replace(/\/+/g, '/'),
            type: file.attrs.isDirectory ? 'directory' : 'file',
            size: file.attrs.size || 0,
            mtime: new Date(file.attrs.mtime * 1000).toISOString(),
        }));

        return {
            self: {
                path,
            },
            items,
        };
    }

    /**
     * Build a transfer spec for downloading files via SSH
     * Creates a manual transfer spec with SSH connection information
     */
    async buildDownloadTransferSpec(paths: string[]): Promise<TransferSpec> {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const transferSpec: TransferSpec = {
            direction: 'receive',
            remote_host: this.host,
            remote_user: this.credentials.username,
            ssh_port: this.port,
            fasp_port: this.port === 22 ? 33001 : this.port, // Use standard FASP port if SSH is on 22
            paths: paths.map(path => ({
                source: path,
            })),
            target_rate_kbps: 100000, // 100 Mbps by default
            rate_policy: 'fair',
            cipher: 'aes-128' as any,
            resume_policy: 'sparse_checksum',
        };

        // Add authentication based on method
        if (this.credentials.authMethod === 'password') {
            (transferSpec as any).remote_password = this.credentials.password;
        } else {
            // For private key authentication, we would need to handle this differently
            // This is a placeholder - actual implementation would depend on how the SDK handles SSH keys
            throw new Error('Private key authentication not yet implemented for SSH transfers');
        }

        return transferSpec;
    }

    /**
     * Build a transfer spec for uploading files via SSH
     * Creates a manual transfer spec with SSH connection information
     */
    async buildUploadTransferSpec(paths: string[], destinationPath: string): Promise<TransferSpec> {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const transferSpec: TransferSpec = {
            direction: 'send',
            remote_host: this.host,
            remote_user: this.credentials.username,
            ssh_port: this.port,
            fasp_port: this.port === 22 ? 33001 : this.port, // Use standard FASP port if SSH is on 22
            paths: paths.map(path => ({
                source: path,
            })),
            destination_root: destinationPath,
            target_rate_kbps: 100000, // 100 Mbps by default
            rate_policy: 'fair',
            cipher: 'aes-128' as any,
            resume_policy: 'sparse_checksum',
        };

        // Add authentication based on method
        if (this.credentials.authMethod === 'password') {
            (transferSpec as any).remote_password = this.credentials.password;
        } else {
            // For private key authentication, we would need to handle this differently
            // This is a placeholder - actual implementation would depend on how the SDK handles SSH keys
            throw new Error('Private key authentication not yet implemented for SSH transfers');
        }

        return transferSpec;
    }

    async downloadSetup(paths: Array<{ source: string }>) {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await fetch(`${this.backendUrl}/download-setup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                host: this.host,
                port: this.port,
                username: this.credentials.username,
                authMethod: this.credentials.authMethod,
                ...this.getAuthPayload(),
                paths: paths.map(p => p.source),
            }),
        });

        if (!response.ok) {
            throw new Error(`Download setup failed: ${response.statusText}`);
        }

        return await response.json();
    }

    async uploadSetup(paths: Array<{ source: string }>, destinationPath: string) {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await fetch(`${this.backendUrl}/upload-setup`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                host: this.host,
                port: this.port,
                username: this.credentials.username,
                authMethod: this.credentials.authMethod,
                ...this.getAuthPayload(),
                paths: paths.map(p => p.source),
                destination: destinationPath,
            }),
        });

        if (!response.ok) {
            throw new Error(`Upload setup failed: ${response.statusText}`);
        }

        return await response.json();
    }

    async createDir(path: string) {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await fetch(`${this.backendUrl}/mkdir`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                host: this.host,
                port: this.port,
                username: this.credentials.username,
                authMethod: this.credentials.authMethod,
                ...this.getAuthPayload(),
                path,
            }),
        });

        if (!response.ok) {
            throw new Error(`Create directory failed: ${response.statusText}`);
        }

        return await response.json();
    }

    async deleteFiles(ids: string[]) {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await fetch(`${this.backendUrl}/delete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                host: this.host,
                port: this.port,
                username: this.credentials.username,
                authMethod: this.credentials.authMethod,
                ...this.getAuthPayload(),
                paths: ids,
            }),
        });

        if (!response.ok) {
            throw new Error(`Delete failed: ${response.statusText}`);
        }

        return await response.json();
    }

    async rename(path: string, newPath: string) {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await fetch(`${this.backendUrl}/rename`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                host: this.host,
                port: this.port,
                username: this.credentials.username,
                authMethod: this.credentials.authMethod,
                ...this.getAuthPayload(),
                oldPath: path,
                newPath,
            }),
        });

        if (!response.ok) {
            throw new Error(`Rename failed: ${response.statusText}`);
        }

        return await response.json();
    }
}

