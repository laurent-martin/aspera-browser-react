import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import type { DataTransferResponse } from '@ibm-aspera/sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Modal, TextInput, PasswordInput, Toggle, Loading, Select, SelectItem, TextArea } from '@carbon/react';
import { useTranslation } from 'react-i18next';
import { AppLayout } from './components/layout/AppLayout';
import { FileBrowser } from './components/file-browser/FileBrowser';
import { NotificationContainer } from './components/common/NotificationContainer';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { PromptDialog } from './components/common/PromptDialog';
import { FileInfoDialog } from './components/common/FileInfoDialog';
import { useAuthStore } from './stores/useAuthStore';
import { useFileStore } from './stores/useFileStore';
import { useNotificationStore } from './stores/useNotificationStore';
import { useTransferStore } from './stores/useTransferStore';
import { FileServiceFactory } from './services/FileServiceFactory';
import { validateCredentials, hasAllMandatoryFields } from './utils/validation';
import type { ConnectionAccessType, NodeAPICredentials, SSHCredentials, ConnectionCredentials, FileItem } from './types';
import './App.css';

const queryClient = new QueryClient();

function App() {
  const { t } = useTranslation('connection');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isWebAgentAvailable, setIsWebAgentAvailable] = useState<boolean | null>(null);
  const [isDropTargetActive, setIsDropTargetActive] = useState(false);
  const {
    credentials,
    currentAccountId,
    disconnect,
    addAccount,
    removeAccount,
    selectAccount,
    savedAccounts
  } = useAuthStore();
  const { setCurrentPath, setFiles, clearSelection, setFileIdPath, clearFileIdPath, setBreadcrumbNames, clearBreadcrumbNames, pushBreadcrumbName } = useFileStore();
  const { addNotification } = useNotificationStore();
  const { transfers } = useTransferStore();
  const previousTransfersRef = useRef(transfers);
  const uploadDestinationsRef = useRef<Map<string, { path: string; fileId?: string }>>(new Map());

  const [formData, setFormData] = useState<ConnectionCredentials>(credentials);
  const [accountName, setAccountName] = useState('');
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const validation = useMemo(() => validateCredentials(formData), [formData]);
  const validationErrors = validation.errors;
  const isFormValid = validation.valid && hasAllMandatoryFields(formData);
  
  // Dialog states
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; files: Array<{ id: string }> }>({ open: false, files: [] });
  const [folderDialog, setFolderDialog] = useState(false);
  const [fileInfoDialog, setFileInfoDialog] = useState<{ open: boolean; fileName: string; fileInfo: any }>({
    open: false,
    fileName: '',
    fileInfo: null
  });

  const handleSaveAccount = async () => {
    setIsLoading(true);
    try {
      // Generate default name based on access_type
      let defaultName = '';
      let accountId = '';
      
      if (formData.access_type === 'ssh') {
        const sshCreds = formData as SSHCredentials;
        defaultName = `${sshCreds.username}@${sshCreds.url}`;
        accountId = `ssh-${sshCreds.username}@${sshCreds.url}`;
      } else {
        const nodeCreds = formData as NodeAPICredentials;
        defaultName = `${nodeCreds.username}@${nodeCreds.url}`;
        accountId = `${formData.access_type}-${nodeCreds.username}@${nodeCreds.url}`;
      }
      
      const finalAccountName = accountName.trim() || defaultName;
      
      if (editingAccountId) {
        // Update existing account
        removeAccount(editingAccountId);
      }
      
      addAccount({
        id: accountId,
        name: finalAccountName,
        credentials: formData,
      });
      
      setIsSettingsOpen(false);
      setAccountName('');
      setEditingAccountId(null);
      addNotification({
        type: 'success',
        title: editingAccountId ? t('messages.accountUpdated') : t('messages.accountCreated'),
        subtitle: editingAccountId
          ? t('messages.accountUpdatedSubtitle', { name: finalAccountName })
          : t('messages.accountCreatedSubtitle', { name: finalAccountName }),
      });
    } catch (error) {
      console.error('Save account failed:', error);
      addNotification({
        type: 'error',
        title: t('messages.connectionFailed'),
        subtitle: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setCurrentPath('/');
    setFiles([]);
    clearSelection();
    clearFileIdPath();
    clearBreadcrumbNames();
    addNotification({
      type: 'info',
      title: t('messages.disconnected'),
    });
  };

  const handleConfigureAccount = () => {
    // Initialize with empty credentials for new account
    setFormData({
      access_type: 'node-user',
      url: '',
      username: '',
      password: '',
      useTokenAuth: true,
    } as NodeAPICredentials);
    setAccountName('');
    setEditingAccountId(null);
    setTouched({});
    setIsSettingsOpen(true);
  };

  const handleDeleteAccount = (accountId: string) => {
    const account = savedAccounts.find(a => a.id === accountId);
    if (!account) return;

    if (window.confirm(t('messages.accountDeleteConfirm', { name: account.name }))) {
      removeAccount(accountId);
      addNotification({
        type: 'info',
        title: t('messages.accountDeleted'),
        subtitle: t('messages.accountDeletedSubtitle', { name: account.name }),
      });
    }
  };

  const handleEditAccount = (accountId: string) => {
    const account = savedAccounts.find(a => a.id === accountId);
    if (!account) return;

    setFormData(account.credentials);
    setAccountName(account.name);
    setEditingAccountId(accountId);
    setTouched({});
    setIsSettingsOpen(true);
  };

  const handleSelectAccount = async (accountId: string) => {
    const account = savedAccounts.find(a => a.id === accountId);
    if (!account) return;

    setIsLoading(true);
    try {
      const fileService = await FileServiceFactory.getService(account.credentials);
      await fileService.info();
      
      selectAccount(accountId);
      
      // For Access Key, browse by root file ID, otherwise use path
      if (account.credentials.access_type === 'access-key') {
        const accessKeyService = fileService as { getRootFileId?: () => string | undefined };
        const rootFileId = accessKeyService.getRootFileId?.();
        if (rootFileId) {
          setFileIdPath([rootFileId]);
          // Initialize breadcrumb with root name (will be set from first browse)
          setBreadcrumbNames([]);
          await handleBrowse(rootFileId);
        } else {
          throw new Error('Root file ID not available for Access Key');
        }
      } else {
        await handleBrowse('/');
      }
      
      addNotification({
        type: 'success',
        title: t('messages.connectionSuccess'),
      });
    } catch (error) {
      console.error('Connection failed:', error);
      
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for specific error types
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number }; code?: string };
        if (axiosError.response?.status === 401) {
          errorMessage = t('messages.authenticationFailed');
        } else if (axiosError.response?.status === 404) {
          errorMessage = t('messages.serverNotFound');
        } else if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ERR_NETWORK') {
          errorMessage = t('messages.connectionRefused');
        }
      }
      
      addNotification({
        type: 'error',
        title: t('messages.connectionFailed'),
        subtitle: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBrowse = useCallback(async (
    pathOrFileId: string,
    newBreadcrumbName?: string,
    newFileId?: string
  ) => {
    setIsLoading(true);
    try {
      const { credentials } = useAuthStore.getState();
      const fileService = await FileServiceFactory.getService(credentials);
      
      // For Access Key, pathOrFileId is actually a file_id
      // For other protocols, it's a path
      const dirList = await fileService.browse(pathOrFileId);
      
      // For Access Key: generate preview URLs for files with preview info
      if (credentials.access_type === 'access-key') {
        const nodeCreds = credentials as NodeAPICredentials;
        const filesWithPreviews = dirList.items.map(item => {
          // Check if file has preview info and it's a PNG
          if (item.previewInfo && item.previewInfo.content_type === 'image/png' && item.file_id) {
            // Generate preview URL: GET /files/{id}/preview with Accept: image/png
            const previewUrl = `${nodeCreds.url}/files/${item.file_id}/preview`;
            return {
              ...item,
              preview: previewUrl,
            };
          }
          return item;
        });
        
        // For Access Key at root: keep breadcrumb empty (only home icon will show)
        // breadcrumbNames will be populated as user navigates into subdirectories
        
        // Only update breadcrumb and fileIdPath after successful browse
        if (newBreadcrumbName && newFileId) {
          const { fileIdPath } = useFileStore.getState();
          setFileIdPath([...fileIdPath, newFileId]);
          pushBreadcrumbName(newBreadcrumbName);
        }
        
        // Build currentPath from breadcrumbNames for display
        const { breadcrumbNames } = useFileStore.getState();
        const constructedPath = breadcrumbNames.length > 0 ? '/' + breadcrumbNames.join('/') : '/';
        setCurrentPath(constructedPath);
        setFiles(filesWithPreviews);
      } else {
        setCurrentPath(dirList.self.path);
        setFiles(dirList.items);
      }
      
      clearSelection();
      
      // Clear file ID path only for non-Access Key access types
      if (credentials.access_type !== 'access-key') {
        clearFileIdPath();
        clearBreadcrumbNames();
      }
    } catch (error) {
      console.error('Browse failed:', error);
      
      let errorMessage = error instanceof Error ? error.message : String(error);
      
      // Check for specific error types
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 401) {
          errorMessage = t('messages.authenticationFailed');
        } else if (axiosError.response?.status === 403) {
          errorMessage = t('messages.accessDenied');
        } else if (axiosError.response?.status === 404) {
          errorMessage = t('messages.pathNotFound');
        }
      }
      
      addNotification({
        type: 'error',
        title: t('messages.navigationFailed'),
        subtitle: errorMessage,
      });
      
      // Re-throw error so caller knows the browse failed
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [addNotification, clearBreadcrumbNames, clearFileIdPath, clearSelection, pushBreadcrumbName, setCurrentPath, setFileIdPath, setFiles, t]);


  const handleDownload = async () => {
    const { selectedFiles } = useFileStore.getState();
    if (selectedFiles.length === 0) return;

    setIsLoading(true);
    try {
      const { credentials } = useAuthStore.getState();
      
      // Get the file service to build the transfer spec
      const fileService = await FileServiceFactory.getService(credentials);
      const paths = selectedFiles.map(file => file.path);
      
      // Build the transfer spec from the service (calls API for Node User/Access Key, manual for SSH)
      const transferSpec = await fileService.buildDownloadTransferSpec(paths);
      
      // Check if Aspera Web Agent is available
      const { asperaWebAgentService } = await import('./services/AsperaWebAgentService');
      const isWebAgentAvailable = await asperaWebAgentService.isAvailable();
      
      if (isWebAgentAvailable) {
        // Use Aspera Web Agent for desktop download with the transfer spec
        await asperaWebAgentService.download(transferSpec);
        
        addNotification({
          type: 'success',
          title: t('messages.downloadInitiated'),
          subtitle: t('messages.downloadCount', { count: selectedFiles.length }),
        });
      } else {
        // Fallback: inform user that Web Agent is needed
        addNotification({
          type: 'info',
          title: t('messages.webAgentNotAvailable'),
          subtitle: t('messages.webAgentNotAvailableSubtitle'),
        });
        console.log('Download transfer spec ready:', transferSpec);
      }
    } catch (error) {
      console.error('Download failed:', error);
      addNotification({
        type: 'error',
        title: t('messages.downloadFailed'),
        subtitle: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = useCallback(async (files: Array<{ name: string }>, isFolder: boolean = false) => {
    const { currentPath, fileIdPath } = useFileStore.getState();
    const { credentials } = useAuthStore.getState();

    setIsLoading(true);
    try {
      const fileService = await FileServiceFactory.getService(credentials);
      const transferSpec = await fileService.buildUploadTransferSpec(
        files.map((file) => file.name),
        currentPath
      );

      const { asperaWebAgentService } = await import('./services/AsperaWebAgentService');
      const isWebAgentAvailable = await asperaWebAgentService.isAvailable();

      if (isWebAgentAvailable) {
        let transferUuid: string | undefined;
        
        if (files.length > 0) {
          // Files provided from drag and drop - start transfer directly
          transferUuid = await asperaWebAgentService.upload(transferSpec, files);
          addNotification({
            type: 'success',
            title: t('messages.uploadInitiated', { count: files.length }),
            subtitle: t('messages.uploadInitiatedSubtitle', { count: files.length }),
          });
        } else if (isFolder) {
          // First notification: guide user to select folder in dialog
          addNotification({
            type: 'info',
            title: t('messages.uploadSelectFolder'),
            subtitle: t('messages.uploadSelectFolderSubtitle'),
          });
          
          // Open dialog and start transfer
          transferUuid = await asperaWebAgentService.uploadFolderWithFilePicker(transferSpec);
          
          // Second notification: confirm transfer started
          addNotification({
            type: 'success',
            title: t('messages.uploadTransferStarted'),
            subtitle: t('messages.uploadTransferStartedSubtitle'),
          });
        } else {
          // First notification: guide user to select files in dialog
          addNotification({
            type: 'info',
            title: t('messages.uploadSelectFiles'),
            subtitle: t('messages.uploadSelectFilesSubtitle'),
          });
          
          // Open dialog and start transfer
          transferUuid = await asperaWebAgentService.uploadWithFilePicker(transferSpec);
          
          // Second notification: confirm transfer started
          addNotification({
            type: 'success',
            title: t('messages.uploadTransferStarted'),
            subtitle: t('messages.uploadTransferStartedSubtitle'),
          });
        }
        
        // Store the upload destination for this transfer
        if (transferUuid) {
          const currentFileId = credentials.access_type === 'access-key' && fileIdPath.length > 0
            ? fileIdPath[fileIdPath.length - 1]
            : undefined;
          
          uploadDestinationsRef.current.set(transferUuid, {
            path: currentPath,
            fileId: currentFileId,
          });
        }
      } else {
        addNotification({
          type: 'info',
          title: t('messages.webAgentRequired'),
          subtitle: t('messages.webAgentRequiredSubtitle'),
        });
        console.log('Upload transfer spec ready:', transferSpec);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      addNotification({
        type: 'error',
        title: t('messages.uploadFailed'),
        subtitle: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
      setIsDropTargetActive(false);
    }
  }, [addNotification, t]);

  const handleAsperaDropEvent = useCallback(async (data: { event: DragEvent; files: DataTransferResponse }) => {
    const { event, files } = data;

    if (event.type === 'dragenter' || event.type === 'dragover') {
      event.preventDefault();
      setIsDropTargetActive(true);
      return;
    }

    if (event.type === 'dragleave') {
      event.preventDefault();
      setIsDropTargetActive(false);
      return;
    }

    if (event.type !== 'drop') {
      return;
    }

    event.preventDefault();
    setIsDropTargetActive(false);

    const droppedFiles = files.dataTransfer?.files ?? [];
    if (droppedFiles.length === 0) {
      return;
    }

    await handleUpload(
      droppedFiles.map((file) => ({ name: file.name })),
      false
    );
  }, [handleUpload]);

  const handleDeleteRequest = () => {
    const { selectedFiles } = useFileStore.getState();
    if (selectedFiles.length === 0) return;
    setDeleteDialog({ open: true, files: selectedFiles });
  };

  const handleDeleteConfirm = async () => {
    const { currentPath, fileIdPath } = useFileStore.getState();
    setDeleteDialog({ open: false, files: [] });
    setIsLoading(true);
    
    try {
      const { credentials } = useAuthStore.getState();
      const fileService = await FileServiceFactory.getService(credentials);
      
      // Use file.id which is the universal identifier (path for Node User, file_id for Access Key)
      const ids = deleteDialog.files.map(file => file.id);
      await fileService.deleteFiles(ids);
      
      addNotification({
        type: 'success',
        title: t('messages.deleteSuccess', { count: deleteDialog.files.length }),
      });
      clearSelection();
      
      // Refresh the current directory
      if (credentials.access_type === 'access-key' && fileIdPath.length > 0) {
        const currentFileId = fileIdPath[fileIdPath.length - 1];
        await handleBrowse(currentFileId);
      } else {
        await handleBrowse(currentPath);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      addNotification({
        type: 'error',
        title: t('messages.deleteFailed'),
        subtitle: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateFolderRequest = () => {
    setFolderDialog(true);
  };

  const handleCreateFolderConfirm = async (folderName: string) => {
    const { currentPath, fileIdPath } = useFileStore.getState();
    setFolderDialog(false);
    setIsLoading(true);
    
    try {
      const { credentials } = useAuthStore.getState();
      const fileService = await FileServiceFactory.getService(credentials);
      
      // For Access Key, use file_id of current directory as parent
      // For other access types, use the current path as parent
      if (credentials.access_type === 'access-key' && fileIdPath.length > 0) {
        const currentFileId = fileIdPath[fileIdPath.length - 1];
        await fileService.createDir(currentFileId, folderName);
      } else {
        await fileService.createDir(currentPath, folderName);
      }
      
      addNotification({
        type: 'success',
        title: t('messages.folderCreated', { name: folderName }),
      });
      
      // Refresh the current directory
      if (credentials.access_type === 'access-key' && fileIdPath.length > 0) {
        const currentFileId = fileIdPath[fileIdPath.length - 1];
        await handleBrowse(currentFileId);
      } else {
        await handleBrowse(currentPath);
      }
    } catch (error) {
      console.error('Create folder failed:', error);
      addNotification({
        type: 'error',
        title: t('messages.folderCreateFailed'),
        subtitle: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleInfoRequest = async (file: FileItem) => {
    setIsLoading(true);
    try {
      const { credentials } = useAuthStore.getState();
      const fileService = await FileServiceFactory.getService(credentials);
      
      // Use file.id which is the universal identifier
      const fileInfo = await fileService.getFileInfo(file.id);
      
      setFileInfoDialog({
        open: true,
        fileName: file.basename,
        fileInfo,
      });
    } catch (error) {
      console.error('Get file info failed:', error);
      addNotification({
        type: 'error',
        title: t('messages.fileInfoFailed'),
        subtitle: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-reconnect on page load if user was previously connected
  useEffect(() => {
    let cancelled = false;

    const initializeConnection = async () => {
      if (!currentAccountId || !credentials) {
        return;
      }

      try {
        setIsLoading(true);

        const fileService = await FileServiceFactory.getService(credentials);

        if (credentials.access_type === 'access-key') {
          const accessKeyService = fileService as { getRootFileId?: () => string | undefined };
          const rootFileId = accessKeyService.getRootFileId?.();
          if (rootFileId && !cancelled) {
            setFileIdPath([rootFileId]);
            setBreadcrumbNames([]);
            await handleBrowse(rootFileId);
          }
        } else if (!cancelled) {
          await handleBrowse('/');
        }

        if (!cancelled) {
          console.log('Session restored successfully');
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error('Failed to restore session:', error);
        disconnect();
        addNotification({
          type: 'warning',
          title: t('messages.sessionExpired'),
          subtitle: t('messages.pleaseReconnect'),
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void initializeConnection();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check Aspera Web Agent availability on mount and listen for status changes
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    const initWebAgent = async () => {
      try {
        const { asperaWebAgentService } = await import('./services/AsperaWebAgentService');
        
        // Register for status change notifications
        unsubscribe = asperaWebAgentService.onStatusChange((status) => {
          if (!mounted) return;
          
          console.log('Web Agent status changed:', status);
          
          // Update availability based on status
          if (status === 'RUNNING') {
            setIsWebAgentAvailable(true);
          } else if (status === 'FAILED' || status === 'DISCONNECTED') {
            setIsWebAgentAvailable(false);
          }
        });
        
        // Check initial availability
        const available = await asperaWebAgentService.isAvailable();
        if (mounted) {
          setIsWebAgentAvailable(available);
        }
      } catch (error) {
        console.error('Failed to initialize Web Agent monitoring:', error);
        if (mounted) {
          setIsWebAgentAvailable(false);
        }
      }
    };

    void initWebAgent();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  useEffect(() => {
    if (!currentAccountId || isWebAgentAvailable !== true) {
      return;
    }

    let mounted = true;

    const registerAsperaDropzone = async () => {
      try {
        const { asperaWebAgentService } = await import('./services/AsperaWebAgentService');
        await asperaWebAgentService.registerDropzone('#aspera-dropzone', (data) => {
          if (!mounted) {
            return;
          }
          void handleAsperaDropEvent(data);
        });
      } catch (error) {
        console.error('Failed to register Aspera dropzone:', error);
      }
    };

    void registerAsperaDropzone();

    return () => {
      mounted = false;
      void import('./services/AsperaWebAgentService').then(({ asperaWebAgentService }) =>
        asperaWebAgentService.unregisterDropzone('#aspera-dropzone')
      );
    };
  }, [currentAccountId, handleAsperaDropEvent, isWebAgentAvailable]);

  // Monitor transfers and refresh folder when upload completes
  useEffect(() => {
    const previousTransfers = previousTransfersRef.current;
    
    // Check for completed uploads
    transfers.forEach((transfer) => {
      const previousTransfer = previousTransfers.find(t => t.uuid === transfer.uuid);
      
      // If transfer just completed and it was an upload (send direction)
      if (
        transfer.status === 'completed' &&
        transfer.direction === 'send' &&
        previousTransfer &&
        previousTransfer.status !== 'completed'
      ) {
        // Get the upload destination for this transfer
        const uploadDestination = uploadDestinationsRef.current.get(transfer.uuid);
        
        if (uploadDestination) {
          // Get current location
          const { currentPath, fileIdPath } = useFileStore.getState();
          const { credentials } = useAuthStore.getState();
          
          // Check if we're still in the same folder where the upload was initiated
          let shouldRefresh = false;
          
          if (credentials.access_type === 'access-key' && fileIdPath.length > 0) {
            const currentFileId = fileIdPath[fileIdPath.length - 1];
            shouldRefresh = currentFileId === uploadDestination.fileId;
          } else {
            shouldRefresh = currentPath === uploadDestination.path;
          }
          
          if (shouldRefresh) {
            console.log('Upload completed in current directory, refreshing...');
            
            if (credentials.access_type === 'access-key' && fileIdPath.length > 0) {
              const currentFileId = fileIdPath[fileIdPath.length - 1];
              handleBrowse(currentFileId).catch((error) => {
                console.error('Failed to refresh after upload:', error);
              });
            } else {
              handleBrowse(currentPath).catch((error) => {
                console.error('Failed to refresh after upload:', error);
              });
            }
          } else {
            console.log('Upload completed but user navigated away, skipping refresh');
          }
          
          // Clean up the stored destination
          uploadDestinationsRef.current.delete(transfer.uuid);
        }
      }
    });
    
    // Update ref for next comparison
    previousTransfersRef.current = transfers;
  }, [transfers, handleBrowse]);

  return (
    <QueryClientProvider client={queryClient}>
      <NotificationContainer />
      {isLoading && (
        <Loading
          description={t('messages.loading')}
          withOverlay={true}
          style={{ zIndex: 10000 }}
        />
      )}
      <AppLayout
        onDisconnect={handleDisconnect}
        onConfigureAccount={handleConfigureAccount}
        onSelectAccount={handleSelectAccount}
        onDeleteAccount={handleDeleteAccount}
        onEditAccount={handleEditAccount}
        isWebAgentAvailable={isWebAgentAvailable}
      >
        {currentAccountId ? (
          <FileBrowser
            isLoading={isLoading}
            isDropTargetActive={isDropTargetActive}
            onRefresh={() => {
              const { currentPath, fileIdPath } = useFileStore.getState();
              const { credentials } = useAuthStore.getState();
              
              // For Access Key, use the current file ID
              if (credentials.access_type === 'access-key' && fileIdPath.length > 0) {
                const currentFileId = fileIdPath[fileIdPath.length - 1];
                handleBrowse(currentFileId);
              } else {
                handleBrowse(currentPath);
              }
            }}
            onNavigate={(pathOrFileId: string) => {
              const { credentials } = useAuthStore.getState();
              const { files } = useFileStore.getState();
              
              // For Access Key, check if we're navigating to a directory or link with file_id
              if (credentials.access_type === 'access-key') {
                // Find the file item by path or by file_id (for links using target_id)
                const fileItem = files.find(f => f.path === pathOrFileId || f.file_id === pathOrFileId || f.target_id === pathOrFileId);
                
                if (fileItem) {
                  // For symbolic links with target_id, use target_id for navigation
                  if (fileItem.type === 'symbolic_link' && fileItem.target_id) {
                    // Pass breadcrumb name and file ID to handleBrowse
                    // They will only be applied after successful browse
                    handleBrowse(fileItem.target_id, fileItem.basename, fileItem.target_id).catch(() => {
                      // Error already handled in handleBrowse
                    });
                    return;
                  }
                  
                  // For regular directories, use file_id
                  if (fileItem.file_id && fileItem.type === 'directory') {
                    // Pass breadcrumb name and file ID to handleBrowse
                    // They will only be applied after successful browse
                    handleBrowse(fileItem.file_id, fileItem.basename, fileItem.file_id).catch(() => {
                      // Error already handled in handleBrowse
                    });
                    return;
                  }
                }
              }
              
              // Fallback to path-based navigation
              handleBrowse(pathOrFileId).catch(() => {
                // Error already handled in handleBrowse
              });
            }}
            onDownload={handleDownload}
            onUpload={handleUpload}
            onDelete={handleDeleteRequest}
            onCreateFolder={handleCreateFolderRequest}
            onInfo={handleInfoRequest}
          />
        ) : (
          <div className="welcome-screen">
            <h1>{t('welcome.title')}</h1>
            <p className="welcome-guidance">{t('welcome.selectAccount')}</p>
          </div>
        )}

        <Modal
          open={isSettingsOpen}
          onRequestClose={() => {
            setIsSettingsOpen(false);
            setAccountName('');
            setEditingAccountId(null);
            setTouched({});
          }}
          modalHeading={t('settings.title')}
          primaryButtonText={editingAccountId ? t('settings.updateAccount') : t('settings.createAccount')}
          secondaryButtonText={t('settings.cancel')}
          onRequestSubmit={handleSaveAccount}
          primaryButtonDisabled={isLoading || !isFormValid}
        >
          <div className="settings-form">
            <TextInput
              id="accountName"
              labelText={t('settings.accountName')}
              value={accountName}
              onChange={(e) => setAccountName(e.target.value)}
              disabled={isLoading}
              placeholder={t('settings.accountNamePlaceholder')}
            />
            
            <Select
              id="access_type"
              labelText={t('settings.access_type')}
              value={formData.access_type}
              onChange={(e) => {
                const access_type = e.target.value as ConnectionAccessType;
                if (access_type === 'ssh') {
                  setFormData({
                    access_type: 'ssh',
                    url: '',
                    username: '',
                    authMethod: 'password',
                    password: '',
                  } as SSHCredentials);
                } else {
                  setFormData({
                    access_type,
                    url: '',
                    username: '',
                    password: '',
                    useTokenAuth: true,
                  } as NodeAPICredentials);
                }
              }}
              disabled={isLoading}
            >
              <SelectItem value="node-user" text={t('settings.access_type_node_gen3')} />
              <SelectItem value="access-key" text={t('settings.access_type_node_gen4')} />
              <SelectItem value="ssh" text={t('settings.access_type_ssh')} />
            </Select>

            {formData.access_type === 'ssh' ? (
              <>
                <TextInput
                  id="sshUrl"
                  labelText={t('settings.sshUrl')}
                  value={(formData as SSHCredentials).url}
                  onChange={(e) => {
                    setFormData({ ...formData, url: e.target.value } as SSHCredentials);
                    setTouched({ ...touched, url: true });
                  }}
                  onBlur={() => setTouched({ ...touched, url: true })}
                  disabled={isLoading}
                  placeholder={t('settings.sshUrlPlaceholder')}
                  invalid={touched.url && !!validationErrors.url}
                  invalidText={validationErrors.url}
                />
                <TextInput
                  id="username"
                  labelText={t('settings.username')}
                  value={(formData as SSHCredentials).username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value } as SSHCredentials);
                    setTouched({ ...touched, username: true });
                  }}
                  onBlur={() => setTouched({ ...touched, username: true })}
                  disabled={isLoading}
                  invalid={touched.username && !!validationErrors.username}
                  invalidText={validationErrors.username}
                />
                
                <Select
                  id="authMethod"
                  labelText={t('settings.authMethod')}
                  value={(formData as SSHCredentials).authMethod}
                  onChange={(e) => {
                    const authMethod = e.target.value as 'password' | 'privateKey';
                    setFormData({
                      ...formData,
                      authMethod,
                      password: authMethod === 'password' ? (formData as SSHCredentials).password : undefined,
                      privateKey: authMethod === 'privateKey' ? (formData as SSHCredentials).privateKey : undefined,
                      passphrase: authMethod === 'privateKey' ? (formData as SSHCredentials).passphrase : undefined,
                    } as SSHCredentials);
                  }}
                  disabled={isLoading}
                >
                  <SelectItem value="password" text={t('settings.authMethodPassword')} />
                  <SelectItem value="privateKey" text={t('settings.authMethodPrivateKey')} />
                </Select>

                {(formData as SSHCredentials).authMethod === 'password' ? (
                  <PasswordInput
                    id="password"
                    labelText={t('settings.password')}
                    value={(formData as SSHCredentials).password || ''}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value } as SSHCredentials);
                      setTouched({ ...touched, password: true });
                    }}
                    onBlur={() => setTouched({ ...touched, password: true })}
                    disabled={isLoading}
                    invalid={touched.password && !!validationErrors.password}
                    invalidText={validationErrors.password}
                  />
                ) : (
                  <>
                    <TextArea
                      id="privateKey"
                      labelText={t('settings.privateKey')}
                      value={(formData as SSHCredentials).privateKey || ''}
                      onChange={(e) => {
                        setFormData({ ...formData, privateKey: e.target.value } as SSHCredentials);
                        setTouched({ ...touched, privateKey: true });
                      }}
                      onBlur={() => setTouched({ ...touched, privateKey: true })}
                      disabled={isLoading}
                      rows={4}
                      placeholder={t('settings.privateKeyPlaceholder')}
                      invalid={touched.privateKey && !!validationErrors.privateKey}
                      invalidText={validationErrors.privateKey}
                    />
                    <PasswordInput
                      id="passphrase"
                      labelText={t('settings.passphrase')}
                      value={(formData as SSHCredentials).passphrase || ''}
                      onChange={(e) => setFormData({ ...formData, passphrase: e.target.value } as SSHCredentials)}
                      disabled={isLoading}
                    />
                  </>
                )}
              </>
            ) : (
              <>
                <TextInput
                  id="url"
                  labelText={t('settings.nodeURL')}
                  value={(formData as NodeAPICredentials).url}
                  onChange={(e) => {
                    setFormData({ ...formData, url: e.target.value } as NodeAPICredentials);
                    setTouched({ ...touched, url: true });
                  }}
                  onBlur={() => setTouched({ ...touched, url: true })}
                  disabled={isLoading}
                  invalid={touched.url && !!validationErrors.url}
                  invalidText={validationErrors.url}
                />
                <TextInput
                  id="username"
                  labelText={t('settings.username')}
                  value={(formData as NodeAPICredentials).username}
                  onChange={(e) => {
                    setFormData({ ...formData, username: e.target.value } as NodeAPICredentials);
                    setTouched({ ...touched, username: true });
                  }}
                  onBlur={() => setTouched({ ...touched, username: true })}
                  disabled={isLoading}
                  invalid={touched.username && !!validationErrors.username}
                  invalidText={validationErrors.username}
                />
                <PasswordInput
                  id="password"
                  labelText={t('settings.password')}
                  value={(formData as NodeAPICredentials).password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value } as NodeAPICredentials);
                    setTouched({ ...touched, password: true });
                  }}
                  onBlur={() => setTouched({ ...touched, password: true })}
                  disabled={isLoading}
                  invalid={touched.password && !!validationErrors.password}
                  invalidText={validationErrors.password}
                />
                {formData.access_type === 'access-key' && (
                  <Toggle
                    id="useTokenAuth"
                    labelText={t('settings.useTokenAuth')}
                    toggled={(formData as NodeAPICredentials).useTokenAuth}
                    onToggle={(checked) => setFormData({ ...formData, useTokenAuth: checked } as NodeAPICredentials)}
                    disabled={isLoading}
                  />
                )}
              </>
            )}
          </div>
        </Modal>

        <ConfirmDialog
          open={deleteDialog.open}
          title={t('messages.deleteTitle')}
          message={t('messages.deleteConfirm', { count: deleteDialog.files.length })}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteDialog({ open: false, files: [] })}
          danger
        />

        <PromptDialog
          open={folderDialog}
          title={t('messages.newFolderTitle')}
          label={t('messages.newFolderLabel')}
          placeholder={t('messages.newFolderPlaceholder')}
          onConfirm={handleCreateFolderConfirm}
          onCancel={() => setFolderDialog(false)}
        />

        <FileInfoDialog
          open={fileInfoDialog.open}
          fileName={fileInfoDialog.fileName}
          fileInfo={fileInfoDialog.fileInfo}
          onClose={() => setFileInfoDialog({ open: false, fileName: '', fileInfo: null })}
        />
      </AppLayout>
    </QueryClientProvider>
  );
}

export default App;

