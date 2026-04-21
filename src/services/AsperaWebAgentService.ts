import { initSession, registerStatusCallback, startTransfer, registerActivityCallback, getAllTransfers, stopTransfer, resumeTransfer, removeTransfer, showDirectory, launch, showSelectFileDialog, showSelectFolderDialog, initDragDrop, createDropzone, removeDropzone, getInfo, testConnection } from '@ibm-aspera/sdk';
import type { TransferSpec, AsperaSdkTransfer, InitOptions, SdkStatus, DataTransferResponse } from '@ibm-aspera/sdk';
import { useTransferStore } from '../stores/useTransferStore';
import type { TransferInfo } from '../types';

/**
 * Service to manage Aspera transfers via the web agent (desktop)
 * Based on the IBM Aspera JavaScript SDK
 */
type AsperaSdkError = {
    message?: string;
    error?: {
        user_message?: string;
        internal_message?: string;
    };
};

type StatusChangeCallback = (status: SdkStatus) => void;

class AsperaWebAgentService {
    private initialized = false;
    private launchAttempted = false;
    private dragDropInitialized = false;
    private statusChangeCallbacks: StatusChangeCallback[] = [];
    private currentStatus: SdkStatus | null = null;

    /**
     * Initialize the Aspera Web Agent SDK
     */
    async initialize(): Promise<void> {
        if (this.initialized) {
            return;
        }

        const options: InitOptions = {
            appId: 'aspera-browser-web-agent',
            connectSettings: {
                useConnect: false,
                fallback: false,
                minVersion: '3.10.1',
                dragDropEnabled: true,
                method: 'extension',
                hideIncludedInstaller: false,
            },
        };

        return new Promise((resolve, reject) => {
            let retryCount = 0;
            const maxRetries = 1; // One retry after launch attempt

            // Register status callback to know when the SDK is ready
            registerStatusCallback((status: SdkStatus) => {
                console.log('Aspera SDK Status:', status);

                // Update current status and notify callbacks
                this.currentStatus = status;
                this.notifyStatusChange(status);

                if (status === 'RUNNING') {
                    this.initialized = true;
                    this.launchAttempted = false; // Reset for future calls

                    this.initializeDragDrop()
                        .then(() => {
                            this.setupTransferMonitoring();
                            console.log('Aspera Web Agent SDK initialized successfully');
                            resolve();
                        })
                        .catch((error) => {
                            reject(error);
                        });
                } else if (status === 'FAILED' || status === 'DISCONNECTED') {
                    // Mark as not initialized when disconnected
                    this.initialized = false;

                    // If Desktop is not running and we haven't tried to launch it yet
                    if (!this.launchAttempted && retryCount < maxRetries) {
                        this.launchAttempted = true;
                        retryCount++;
                        console.log('Aspera Desktop not detected. Attempting to launch...');

                        try {
                            // Launch Aspera Desktop
                            launch();
                            console.log('Launch command sent. Waiting for Desktop to start...');

                            // Give it more time to start (15 seconds after launch)
                            setTimeout(() => {
                                if (!this.initialized) {
                                    reject(new Error('Aspera Desktop was launched but failed to connect. Please ensure it is installed and try again.'));
                                }
                            }, 15000);
                        } catch (error) {
                            console.error('Failed to launch Aspera Desktop:', error);
                            reject(new Error('Unable to launch Aspera Desktop. Please ensure it is installed and start it manually.'));
                        }
                    } else {
                        reject(new Error('Unable to connect to Aspera Desktop. Please ensure it is installed and running.'));
                    }
                }
            });

            // Start initialization (non-blocking)
            initSession(options);

            // Initial timeout (10 seconds)
            setTimeout(() => {
                if (!this.initialized && !this.launchAttempted) {
                    // This will trigger the FAILED/DISCONNECTED status callback
                    console.log('Initial connection timeout. Will attempt to launch Desktop...');
                }
            }, 10000);
        });
    }

    /**
     * Notify all registered callbacks of a status change
     */
    private notifyStatusChange(status: SdkStatus): void {
        this.statusChangeCallbacks.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                console.error('Error in status change callback:', error);
            }
        });
    }

    /**
     * Register a callback to be notified of status changes
     */
    onStatusChange(callback: StatusChangeCallback): () => void {
        this.statusChangeCallbacks.push(callback);

        // If we already have a status, notify immediately
        if (this.currentStatus) {
            callback(this.currentStatus);
        }

        // Return unsubscribe function
        return () => {
            const index = this.statusChangeCallbacks.indexOf(callback);
            if (index > -1) {
                this.statusChangeCallbacks.splice(index, 1);
            }
        };
    }

    /**
     * Check if Aspera Web Agent is available
     */
    async isAvailable(): Promise<boolean> {
        // If we have a current status, use it
        if (this.currentStatus === 'RUNNING') {
            return true;
        }

        if (this.currentStatus === 'FAILED' || this.currentStatus === 'DISCONNECTED') {
            return false;
        }

        // Otherwise, try to test the connection (as per SDK examples)
        try {
            await testConnection();
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Retrieve Aspera agent / SDK info
     */
    async getInfo() {
        if (!this.initialized) {
            await this.initialize();
        }

        return getInfo();
    }

    /**
     * Set up transfer monitoring
     */
    private setupTransferMonitoring(): void {
        // Retrieve all existing transfers
        getAllTransfers()
            .then((transfers) => {
                transfers.forEach((transfer) => {
                    this.updateTransferInStore(transfer);
                });
            })
            .catch((error) => {
                console.error('Error retrieving transfers:', error);
            });

        // Register callback for updates
        registerActivityCallback((response) => {
            response.transfers.forEach((transfer) => {
                this.updateTransferInStore(transfer);
            });
        });
    }

    /**
     * Update a transfer in the store
     */
    private updateTransferInStore(sdkTransfer: AsperaSdkTransfer): void {
        const store = useTransferStore.getState();

        const transferInfo: TransferInfo = {
            uuid: sdkTransfer.uuid,
            direction: sdkTransfer.transfer_spec?.direction === 'send' ? 'send' : 'receive',
            status: this.mapTransferStatus(sdkTransfer.status),
            title: sdkTransfer.title || 'Transfert',
            percentage: sdkTransfer.percentage || 0,
            bytes_expected: sdkTransfer.bytes_expected || 0,
            bytes_written: sdkTransfer.bytes_written || 0,
            calculated_rate_kbps: sdkTransfer.calculated_rate_kbps || 0,
            remaining_usec: sdkTransfer.remaining_usec || 0,
            elapsed_usec: sdkTransfer.elapsed_usec || 0,
            current_file: sdkTransfer.current_file || '',
            error_desc: sdkTransfer.error_desc,
            start_time: sdkTransfer.add_time || new Date().toISOString(),
            end_time: sdkTransfer.end_time,
            transfer_spec: {
                remote_host: sdkTransfer.transfer_spec?.remote_host || '',
                remote_user: sdkTransfer.transfer_spec?.remote_user || '',
                direction: sdkTransfer.transfer_spec?.direction || 'receive',
                paths: sdkTransfer.transfer_spec?.paths || [],
                token: sdkTransfer.transfer_spec?.token,
            },
        };

        // Check if the transfer already exists
        const existingTransfer = store.transfers.find((t) => t.uuid === sdkTransfer.uuid);

        if (existingTransfer) {
            store.updateTransfer(sdkTransfer.uuid, transferInfo);
        } else {
            store.addTransfer(transferInfo);
        }
    }

    /**
     * Map SDK status to our format
     */
    private mapTransferStatus(status: string): TransferInfo['status'] {
        switch (status) {
            case 'completed':
                return 'completed';
            case 'failed':
                return 'failed';
            case 'cancelled':
            case 'removed':
                return 'cancelled';
            case 'running':
            case 'initiating':
                return 'running';
            case 'queued':
            case 'willretry':
                return 'queued';
            default:
                return 'queued';
        }
    }

    /**
     * Start a download with Aspera Web Agent
     * @param transferSpec - Complete transfer specification from the file service
     */
    async download(transferSpec: TransferSpec): Promise<string> {
        if (!this.initialized) {
            await this.initialize();
        }

        // SDK options
        const asperaSpec = {
            allow_dialogs: false, // Avoid blocking dialogs
            use_absolute_destination_path: false,
        };

        try {
            console.log('Starting download transfer with spec:', transferSpec);
            const response = await startTransfer(transferSpec, asperaSpec);
            console.log('Transfer started successfully:', response);
            return response.uuid;
        } catch (error) {
            console.error('Error starting transfer:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));

            // Extract error message if available
            let errorMessage = 'Unable to start download';
            if (error && typeof error === 'object') {
                const err = error as AsperaSdkError;
                if (err.error?.user_message) {
                    errorMessage = err.error.user_message;
                } else if (err.error?.internal_message) {
                    errorMessage = err.error.internal_message;
                } else if (err.message) {
                    errorMessage = err.message;
                }
            }

            throw new Error(errorMessage);
        }
    }

    /**
     * Start an upload with Aspera Web Agent
     * If files are provided (from drag and drop), starts transfer directly
     * Otherwise, opens the native file selector
     * @param transferSpec - Complete transfer specification from the file service
     * @param files - Optional files from drag and drop
     */
    async uploadWithFilePicker(transferSpec: TransferSpec, files?: Array<{ name: string }>): Promise<string> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            let filePaths: Array<{ source: string }>;

            // If files are provided (from drag and drop), use them directly
            if (files && files.length > 0) {
                console.log('Using provided files for upload:', files);
                filePaths = files.map(file => ({ source: file.name }));
            } else {
                // Otherwise, open the SDK file picker
                console.log('Opening file picker for upload...');
                const filePickerResponse: DataTransferResponse = await showSelectFileDialog();
                console.log('File picker response:', filePickerResponse);

                // Check if user cancelled
                if (!filePickerResponse.dataTransfer || filePickerResponse.dataTransfer.files.length === 0) {
                    throw new Error('No files selected');
                }

                filePaths = filePickerResponse.dataTransfer.files.map(file => ({
                    source: file.name,
                }));
            }

            // Update transfer spec with selected files
            const updatedTransferSpec: TransferSpec = {
                ...transferSpec,
                paths: filePaths,
            };

            // SDK options
            const asperaSpec = {
                allow_dialogs: false,
                use_absolute_destination_path: false,
            };

            console.log('Starting upload transfer with spec:', updatedTransferSpec);
            const response = await startTransfer(updatedTransferSpec, asperaSpec);
            console.log('Transfer started successfully:', response);
            return response.uuid;
        } catch (error) {
            console.error('Error starting upload:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));

            // Extract error message if available
            let errorMessage = 'Unable to start upload';
            if (error && typeof error === 'object') {
                const err = error as AsperaSdkError;
                if (err.error?.user_message) {
                    errorMessage = err.error.user_message;
                } else if (err.error?.internal_message) {
                    errorMessage = err.error.internal_message;
                } else if (err.message) {
                    errorMessage = err.message;
                }
            }

            throw new Error(errorMessage);
        }
    }

    /**
     * Start a folder upload with Aspera Web Agent using the SDK folder picker
     * Opens the native folder selector and starts the transfer
     * @param transferSpec - Complete transfer specification from the file service
     */
    async uploadFolderWithFilePicker(transferSpec: TransferSpec): Promise<string> {
        if (!this.initialized) {
            await this.initialize();
        }

        try {
            console.log('Opening folder picker for upload...');

            // Open the SDK folder picker
            const folderPickerResponse: DataTransferResponse = await showSelectFolderDialog();

            console.log('Folder picker response:', folderPickerResponse);

            // Check if user cancelled
            if (!folderPickerResponse.dataTransfer || folderPickerResponse.dataTransfer.files.length === 0) {
                throw new Error('No folder selected');
            }

            // Update transfer spec with selected folder
            const updatedTransferSpec: TransferSpec = {
                ...transferSpec,
                paths: folderPickerResponse.dataTransfer.files.map(file => ({
                    source: file.name,
                })),
            };

            // SDK options
            const asperaSpec = {
                allow_dialogs: false,
                use_absolute_destination_path: false,
            };

            console.log('Starting folder upload transfer with spec:', updatedTransferSpec);
            const response = await startTransfer(updatedTransferSpec, asperaSpec);
            console.log('Transfer started successfully:', response);
            return response.uuid;
        } catch (error) {
            console.error('Error starting folder upload:', error);
            console.error('Error details:', JSON.stringify(error, null, 2));

            // Extract error message if available
            let errorMessage = 'Unable to start folder upload';
            if (error && typeof error === 'object') {
                const err = error as AsperaSdkError;
                if (err.error?.user_message) {
                    errorMessage = err.error.user_message;
                } else if (err.error?.internal_message) {
                    errorMessage = err.error.internal_message;
                } else if (err.message) {
                    errorMessage = err.message;
                }
            }

            throw new Error(errorMessage);
        }
    }

    /**
     * Start an upload with Aspera Web Agent
     * If files are provided (from drag and drop), starts transfer directly
     * Otherwise, opens the native file selector
     * @param transferSpec - Complete transfer specification from the file service
     * @param files - Optional files from drag and drop
     */
    async upload(transferSpec: TransferSpec, files?: Array<{ name: string }>): Promise<string> {
        return this.uploadWithFilePicker(transferSpec, files);
    }

    /**
     * Stop a transfer
     */
    async stopTransfer(uuid: string): Promise<void> {
        try {
            await stopTransfer(uuid);
        } catch (error) {
            console.error('Error stopping transfer:', error);
            throw error;
        }
    }

    /**
     * Resume a transfer
     */
    async resumeTransfer(uuid: string): Promise<void> {
        try {
            await resumeTransfer(uuid);
        } catch (error) {
            console.error('Error resuming transfer:', error);
            throw error;
        }
    }

    /**
     * Remove a transfer from the list
     */
    async removeTransfer(uuid: string): Promise<void> {
        try {
            await removeTransfer(uuid);
        } catch (error) {
            console.error('Error removing transfer:', error);
            throw error;
        }
    }

    /**
     * Open the transfer destination folder
     */
    async showDirectory(uuid: string): Promise<void> {
        try {
            await showDirectory(uuid);
        } catch (error) {
            console.error('Error opening folder:', error);
            throw error;
        }
    }

    /**
     * Initialize SDK drag and drop support
     */
    private async initializeDragDrop(): Promise<void> {
        if (this.dragDropInitialized) {
            return;
        }

        await initDragDrop();
        this.dragDropInitialized = true;
    }

    /**
     * Register an Aspera SDK dropzone on a DOM element selector
     */
    async registerDropzone(
        selector: string,
        onDropEvent: (data: { event: DragEvent; files: DataTransferResponse }) => void
    ): Promise<void> {
        if (!this.initialized) {
            await this.initialize();
        }

        await this.initializeDragDrop();
        await createDropzone(onDropEvent, selector, { drop: true, allowPropagation: true });
    }

    /**
     * Remove an Aspera SDK dropzone from a DOM element selector
     */
    async unregisterDropzone(selector: string): Promise<void> {
        if (!this.initialized) {
            return;
        }

        try {
            await removeDropzone(selector);
        } catch (error) {
            console.warn('Error removing dropzone:', error);
        }
    }

    /**
     * Download multiple files
     * @deprecated Use download() with a transfer spec from the file service instead
     */
    async downloadMultiple(): Promise<string> {
        throw new Error('downloadMultiple is deprecated. Use download() with a transfer spec from the file service.');
    }
}

export const asperaWebAgentService = new AsperaWebAgentService();
