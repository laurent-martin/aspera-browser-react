import { useEffect, useState, useRef } from 'react';
import { Modal } from '@carbon/react';
import { useAuthStore } from '../../stores/useAuthStore';
import { FileServiceFactory } from '../../services/FileServiceFactory';
import { VideoStreamPlayerSimple } from './VideoStreamPlayerSimple';
import type { FileItem } from '../../types';
import './MediaViewer.css';

interface MediaViewerProps {
  file: FileItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MediaViewer({ file, isOpen, onClose }: MediaViewerProps) {
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | 'video-stream' | null>(null);
  const { credentials } = useAuthStore();
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadMedia = async () => {
      if (!file || !isOpen) {
        // Cleanup previous URL
        if (objectUrlRef.current) {
          URL.revokeObjectURL(objectUrlRef.current);
          objectUrlRef.current = null;
        }
        if (!cancelled) {
          setMediaUrl(null);
          setMediaType(null);
          setError(null);
        }
        return;
      }

      if (cancelled) return;
      
      setIsLoading(true);
      setError(null);

      try {
        // Determine which media type to display
        const contentType = file.content_type || file.previewInfo?.content_type || '';
        
        // Check whether this is a video
        const isVideo = contentType.startsWith('video/') || file.basename.toLowerCase().match(/\.(mp4|mov|avi|mkv|webm)$/);
        
        if (isVideo && credentials.protocol === 'access-key' && file.file_id) {
          // For videos over access-key connections, use streaming playback
          const fileService = await FileServiceFactory.getService(credentials);
          const accessKeyService = fileService as {
            getVideoPreviewRange?: (fileId: string, start?: number, end?: number) => Promise<Blob>;
            getVideoPreview?: (fileId: string) => Promise<Blob>;
            getPreview?: (fileId: string) => Promise<Blob>;
          };

          // Check whether streaming is supported
          if (accessKeyService.getVideoPreviewRange) {
            // Use the streaming player
            if (!cancelled) {
              setMediaType('video-stream');
              setIsLoading(false);
            }
            return;
          }

          // Fallback: try the full video preview
          let videoPreviewSuccess = false;
          if (accessKeyService.getVideoPreview) {
            try {
              const blob = await accessKeyService.getVideoPreview(file.file_id);
              if (cancelled) return;
              
              const url = URL.createObjectURL(blob);
              objectUrlRef.current = url;
              setMediaUrl(url);
              setMediaType('video');
              videoPreviewSuccess = true;
            } catch (videoErr: unknown) {
              // If 404, fall back to the image preview
              const isAxiosError = videoErr && typeof videoErr === 'object' && 'response' in videoErr;
              if (isAxiosError && (videoErr as { response?: { status?: number } }).response?.status === 404) {
                console.log('Video preview unavailable, falling back to image preview');
              } else {
                // Re-throw other errors
                throw videoErr;
              }
            }
          }

          // Fall back to the image preview if video preview failed or is unavailable
          if (!videoPreviewSuccess && accessKeyService.getPreview) {
            const blob = await accessKeyService.getPreview(file.file_id);
            if (cancelled) return;
            
            const url = URL.createObjectURL(blob);
            objectUrlRef.current = url;
            setMediaUrl(url);
            setMediaType('image');
          } else if (!videoPreviewSuccess) {
            throw new Error('Aucune méthode de prévisualisation disponible');
          }
        } else if (file.preview) {
          // Display the thumbnail at full size for non-video files
          if (!cancelled) {
            setMediaType('image');
          }
          
          if (credentials.protocol === 'access-key' && file.file_id) {
            const fileService = await FileServiceFactory.getService(credentials);
            const accessKeyService = fileService as {
              getPreview?: (fileId: string) => Promise<Blob>;
            };

            if (accessKeyService.getPreview) {
              const blob = await accessKeyService.getPreview(file.file_id);
              if (cancelled) return;
              
              const url = URL.createObjectURL(blob);
              objectUrlRef.current = url;
              setMediaUrl(url);
            } else if (!cancelled) {
              setMediaUrl(file.preview);
            }
          } else if (!cancelled) {
            setMediaUrl(file.preview);
          }
        } else if (!cancelled) {
          setError('Aucun aperçu disponible');
        }
      } catch (err) {
        console.error('Failed to load media:', err);
        if (!cancelled) {
          setError('Erreur lors du chargement du média');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadMedia();

    return () => {
      cancelled = true;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [file, isOpen, credentials]);

  if (!isOpen || !file) {
    return null;
  }

  return (
    <Modal
      open={isOpen}
      onRequestClose={onClose}
      passiveModal
      className="media-viewer-modal"
      size="lg"
    >
      <div className="media-viewer-container">
        <div className="media-viewer-header">
          <h3 className="media-viewer-title">{file.basename}</h3>
        </div>

        <div className="media-viewer-content">
          {isLoading && (
            <div className="media-viewer-loading">
              <div className="loading-spinner" />
              <p>Chargement...</p>
            </div>
          )}
          
          {error && (
            <div className="media-viewer-error">
              <p>{error}</p>
            </div>
          )}
          
          {!isLoading && !error && mediaUrl && mediaType === 'image' && (
            <img
              src={mediaUrl}
              alt={file.basename}
              className="media-viewer-image"
            />
          )}
          
          {!isLoading && !error && mediaUrl && mediaType === 'video' && (
            <video
              src={mediaUrl}
              controls
              autoPlay
              className="media-viewer-video"
            >
              Votre navigateur ne supporte pas la lecture de vidéos.
            </video>
          )}
          
          {!isLoading && !error && mediaType === 'video-stream' && file.file_id && (
            <VideoStreamPlayerSimple
              fileId={file.file_id}
              className="media-viewer-video"
            />
          )}
        </div>
      </div>
    </Modal>
  );
}

