import type { DirList, ConnectionCredentials, NodeAPICredentials } from '../types';
import { BaseNodeApiService } from './BaseNodeApiService';

/**
 * Service for Node User (formerly Node API Gen3)
 */
export class NodeUserService extends BaseNodeApiService {
    setCredentials(credentials: ConnectionCredentials): void {
        this.validateAccessType(credentials, 'node-user');

        // Type assertion after access_type validation
        const nodeCredentials = credentials as NodeAPICredentials;
        this.credentials = nodeCredentials;
        this.client.defaults.baseURL = nodeCredentials.url;
        this.client.defaults.auth = {
            username: nodeCredentials.username,
            password: nodeCredentials.password,
        };
    }

    /**
     * Browse directory contents
     * @param id - For Node User: full path of the directory
     */
    async browse(id: string): Promise<DirList> {
        const response = await this.client.post('/files/browse', {
            path: id, // For Node User, id is the path
        });

        // Add universal 'id' field to each item (full path for Node User)
        const data = response.data;
        if (data.items) {
            data.items = data.items.map((item: any) => ({
                ...item,
                id: item.path, // Universal identifier: full path for Node User
            }));
        }

        return data;
    }


    /**
     * Create a directory
     * @param parentId - For Node User: full path of parent directory
     * @param name - Name of the directory to create
     */
    async createDir(parentId: string, name: string) {
        // For Node User, parentId is the full path, so we construct the new path
        const newPath = parentId.endsWith('/') ? `${parentId}${name}` : `${parentId}/${name}`;

        const response = await this.client.post('/files/create', {
            paths: [
                {
                    path: newPath,
                    type: 'directory',
                },
            ],
        });
        return response.data;
    }

    /**
     * Delete files or directories
     * @param ids - For Node User: array of full paths
     */
    async deleteFiles(ids: string[]) {
        const response = await this.client.post('/files/delete', {
            paths: ids.map(id => ({ path: id })),
        });
        return response.data;
    }

    /**
     * Rename a file or directory
     * @param id - For Node User: full path of the file/directory
     * @param newName - New name (not full path, just the name)
     */
    async rename(id: string, newName: string) {
        // For Node User, id is the full path
        // Extract parent directory and construct new full path
        const lastSlashIndex = id.lastIndexOf('/');
        const parentPath = id.substring(0, lastSlashIndex);
        const newPath = parentPath ? `${parentPath}/${newName}` : newName;

        const response = await this.client.post('/files/rename', {
            paths: [
                {
                    source: id,
                    destination: newPath,
                },
            ],
        });
        return response.data;
    }

    /**
     * Get raw file information as JSON
     * @param id - For Node User: full path of the file/directory
     */
    async getFileInfo(id: string): Promise<any> {
        const response = await this.client.post('/files/browse', {
            path: id,
        });
        return response.data;
    }
}

