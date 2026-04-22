import type { ConnectionCredentials } from '../types';
import type { IFileService } from './IFileService';
import { NodeUserService } from './NodeUserService';
import { AccessKeyService } from './AccessKeyService';
import { SSHService } from './SSHService';

/**
 * Factory to create the appropriate service based on connection access type
 */
export class FileServiceFactory {
    private static instance: IFileService | null = null;

    /**
     * Creates or returns an instance of the appropriate service based on credentials
     */
    static async getService(credentials: ConnectionCredentials): Promise<IFileService> {
        // Validate credentials
        if (!credentials || !credentials.access_type) {
            throw new Error('Invalid credentials: access_type is required');
        }

        // If access_type changes, create a new instance
        if (this.instance) {
            // Check if access_type has changed
            const needsNewInstance = this.shouldCreateNewInstance(credentials);
            if (!needsNewInstance) {
                await this.instance.setCredentials(credentials);
                return this.instance;
            }
        }

        // Create a new instance based on access_type
        switch (credentials.access_type) {
            case 'node-user':
                this.instance = new NodeUserService();
                break;
            case 'access-key':
                this.instance = new AccessKeyService();
                break;
            case 'ssh':
                this.instance = new SSHService();
                break;
            default:
                throw new Error(`Unknown access_type: ${(credentials as ConnectionCredentials).access_type}. Valid access types are: node-user, access-key, ssh`);
        }

        await this.instance.setCredentials(credentials);
        return this.instance;
    }

    /**
     * Determines if a new instance should be created
     */
    private static shouldCreateNewInstance(credentials: ConnectionCredentials): boolean {
        if (!this.instance) {
            return true;
        }

        // Check the type of current instance
        const currentAccessType = this.getCurrentAccessType();
        return currentAccessType !== credentials.access_type;
    }

    /**
     * Returns the access_type of the current instance
     */
    private static getCurrentAccessType(): string | null {
        if (!this.instance) {
            return null;
        }

        if (this.instance instanceof NodeUserService) {
            return 'node-user';
        } else if (this.instance instanceof AccessKeyService) {
            return 'access-key';
        } else if (this.instance instanceof SSHService) {
            return 'ssh';
        }

        return null;
    }

    /**
     * Resets the instance (useful for tests or disconnection)
     */
    static reset(): void {
        this.instance = null;
    }
}

