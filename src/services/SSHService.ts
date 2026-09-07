import type { SSHCredentials, DirList, NodeInfo, ConnectionCredentials, FileItem, SSHFileListResponse, SSHFile } from '../types';
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
/** Returns the default proxy URL based on the current environment.
 *  On localhost, points to the local SSH proxy backend.
 *  Elsewhere, falls back to a relative path (works when the proxy is co-hosted).
 */
function defaultProxyUrl(): string {
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        return `http://localhost:${window.location.port === '3000' ? '3001' : '3001'}/api/ssh`;
    }
    return '/api/ssh';
}

export class SSHService implements IFileService {
    private credentials: SSHCredentials | null = null;
    private backendUrl: string = defaultProxyUrl();
    private host: string = '';
    private port: number = 22;

    setCredentials(credentials: ConnectionCredentials): void {
        if (credentials.access_type !== 'ssh') {
            throw new Error('Invalid access_type for SSHService');
        }

        this.credentials = credentials as SSHCredentials;

        // Use explicitly configured proxy URL, or auto-detect
        this.backendUrl = this.credentials.proxyUrl
            ? `${this.credentials.proxyUrl.replace(/\/$/, '')}/api/ssh`
            : defaultProxyUrl();

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

    /**
     * Wraps fetch to produce a clear error when the SSH proxy backend is unreachable.
     */
    private async request(path: string, body: unknown): Promise<Response> {
        const url = `${this.backendUrl}${path}`;
        let response: Response;
        try {
            response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
        } catch (err) {
            throw new Error(
                `SSH proxy backend unreachable at ${this.backendUrl} — ${err instanceof Error ? err.message : String(err)}`
            );
        }
        return response;
    }

    async info(): Promise<NodeInfo> {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await this.request('/info', {
            host: this.host,
            port: this.port,
            username: this.credentials.username,
            authMethod: this.credentials.authMethod,
            ...this.getAuthPayload(),
        });

        if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(`SSH connection failed: ${body?.error ?? response.statusText}`);
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

        const response = await this.request('/browse', {
            host: this.host,
            port: this.port,
            username: this.credentials.username,
            authMethod: this.credentials.authMethod,
            ...this.getAuthPayload(),
            path,
        });

        if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(`Browse failed: ${body?.error ?? response.statusText}`);
        }

        const data = await response.json();
        return this.normalizeSSHFileList(data, path);
    }

    /**
     * Normalize SSH response to common DirList format
     */
    private normalizeSSHFileList(data: SSHFileListResponse, path: string): DirList {
        const items: FileItem[] = (data.files || []).map((file: SSHFile) => {
            const itemPath = `${path}/${file.filename}`.replace(/\/+/g, '/');
            return {
                basename: file.filename,
                path: itemPath,
                id: itemPath, // Universal identifier: full path for SSH
                type: file.attrs.isDirectory ? 'directory' : 'file',
                size: file.attrs.size || 0,
                mtime: new Date(file.attrs.mtime * 1000).toISOString(),
            };
        });

        return {
            self: {
                path,
            },
            items,
        };
    }

    /**
     * Build a transfer spec for SSH transfers (download or upload)
     */
    async buildDownloadTransferSpec(paths: string[]): Promise<TransferSpec> {
        return this.buildServerTransferSpec('receive', paths);
    }

    async buildUploadTransferSpec(paths: string[], destinationPath: string): Promise<TransferSpec> {
        return this.buildServerTransferSpec('send', paths, destinationPath);
    }

    private buildServerTransferSpec(direction: 'send' | 'receive', paths: string[], destinationPath?: string): TransferSpec {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }
        if (this.credentials.authMethod !== 'password') {
            throw new Error('Private key authentication not yet implemented for SSH transfers');
        }

        const transferSpec: TransferSpec = {
            direction,
            remote_host: this.host,
            remote_user: this.credentials.username,
            ssh_port: this.port,
            fasp_port: this.port === 22 ? 33001 : this.port,
            paths: paths.map(path => ({ source: path })),
            target_rate_kbps: 100000,
            rate_policy: 'fair',
            cipher: 'aes-128' as 'aes128',
            resume_policy: 'sparse_checksum',
        };

        if (direction === 'send' && destinationPath) {
            transferSpec.destination_root = destinationPath;
        }

        (transferSpec as Record<string, unknown>).remote_password = this.credentials.password;

        return transferSpec;
    }

    async downloadSetup(paths: Array<{ source: string }>) {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await this.request('/download-setup', {
            host: this.host,
            port: this.port,
            username: this.credentials.username,
            authMethod: this.credentials.authMethod,
            ...this.getAuthPayload(),
            paths: paths.map(p => p.source),
        });

        if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(`Download setup failed: ${body?.error ?? response.statusText}`);
        }

        return await response.json();
    }

    async uploadSetup(paths: Array<{ source: string }>, destinationPath: string) {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await this.request('/upload-setup', {
            host: this.host,
            port: this.port,
            username: this.credentials.username,
            authMethod: this.credentials.authMethod,
            ...this.getAuthPayload(),
            paths: paths.map(p => p.source),
            destination: destinationPath,
        });

        if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(`Upload setup failed: ${body?.error ?? response.statusText}`);
        }

        return await response.json();
    }

    async createDir(parentPath: string, name: string) {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const path = `${parentPath.replace(/\/$/, '')}/${name}`;

        const response = await this.request('/mkdir', {
            host: this.host,
            port: this.port,
            username: this.credentials.username,
            authMethod: this.credentials.authMethod,
            ...this.getAuthPayload(),
            path,
        });

        if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(`Create directory failed: ${body?.error ?? response.statusText}`);
        }

        return await response.json();
    }

    async deleteFiles(ids: string[]) {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await this.request('/delete', {
            host: this.host,
            port: this.port,
            username: this.credentials.username,
            authMethod: this.credentials.authMethod,
            ...this.getAuthPayload(),
            paths: ids,
        });

        if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(`Delete failed: ${body?.error ?? response.statusText}`);
        }

        return await response.json();
    }

    async rename(path: string, newPath: string) {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await this.request('/rename', {
            host: this.host,
            port: this.port,
            username: this.credentials.username,
            authMethod: this.credentials.authMethod,
            ...this.getAuthPayload(),
            oldPath: path,
            newPath,
        });

        if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(`Rename failed: ${body?.error ?? response.statusText}`);
        }

        return await response.json();
    }

    /**
     * Get raw file information as JSON
     * @param id - For SSH: full path of the file/directory
     */
    async getFileInfo(id: string): Promise<Record<string, unknown>> {
        if (!this.credentials) {
            throw new Error('Credentials not set');
        }

        const response = await this.request('/stat', {
            host: this.host,
            port: this.port,
            username: this.credentials.username,
            authMethod: this.credentials.authMethod,
            ...this.getAuthPayload(),
            path: id,
        });

        if (!response.ok) {
            const body = await response.json().catch(() => null);
            throw new Error(`Get file info failed: ${body?.error ?? response.statusText}`);
        }

        return await response.json();
    }
}

