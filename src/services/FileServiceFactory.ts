import type { ConnectionCredentials } from '../types';
import type { IFileService } from './IFileService';
import { NodeUserService } from './NodeUserService';
import { AccessKeyService } from './AccessKeyService';
import { SSHService } from './SSHService';

/**
 * Factory to create the appropriate service based on connection protocol
 */
export class FileServiceFactory {
    private static instance: IFileService | null = null;

    /**
     * Creates or returns an instance of the appropriate service based on credentials
     */
    static async getService(credentials: ConnectionCredentials): Promise<IFileService> {
        // Validate credentials
        if (!credentials || !credentials.protocol) {
            throw new Error('Invalid credentials: protocol is required');
        }

        // If protocol changes, create a new instance
        if (this.instance) {
            // Check if protocol has changed
            const needsNewInstance = this.shouldCreateNewInstance(credentials);
            if (!needsNewInstance) {
                await this.instance.setCredentials(credentials);
                return this.instance;
            }
        }

        // Create a new instance based on protocol
        switch (credentials.protocol) {
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
                throw new Error(`Unknown protocol: ${(credentials as any).protocol}. Valid protocols are: node-user, access-key, ssh`);
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
        const currentProtocol = this.getCurrentProtocol();
        return currentProtocol !== credentials.protocol;
    }

    /**
     * Returns the protocol of the current instance
     */
    private static getCurrentProtocol(): string | null {
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

