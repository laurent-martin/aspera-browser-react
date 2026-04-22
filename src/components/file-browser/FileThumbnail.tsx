import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';
import { FileServiceFactory } from '../../services/FileServiceFactory';
import type { FileItem } from '../../types';

interface FileThumbnailProps {
  file: FileItem;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function FileThumbnail({
  file,
  size = 32,
  className,
  style,
}: FileThumbnailProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const { credentials } = useAuthStore();

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const loadPreview = async () => {
      if (!file.preview) {
        if (!cancelled) {
          setPreviewUrl(null);
          setError(false);
        }
        return;
      }

      // Reset state at start of async operation
      if (!cancelled) {
        setPreviewUrl(null);
        setError(false);
      }

      try {
        if (credentials.access_type === 'access-key' && file.file_id) {
          const fileService = await FileServiceFactory.getService(credentials);
          const accessKeyService = fileService as {
            getPreview?: (fileId: string) => Promise<Blob>;
          };

          if (accessKeyService.getPreview) {
            const blob = await accessKeyService.getPreview(file.file_id);
            if (cancelled) return;
            
            objectUrl = URL.createObjectURL(blob);
            setPreviewUrl(objectUrl);
            return;
          }
        }

        if (!cancelled) {
          setPreviewUrl(file.preview);
        }
      } catch (err) {
        console.error('Failed to load preview:', err);
        if (!cancelled) {
          setError(true);
        }
      }
    };

    void loadPreview();

    return () => {
      cancelled = true;
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [file.preview, file.file_id, credentials]);

  if (error || !previewUrl || !file.preview || !file.previewInfo) {
    return null;
  }

  return (
    <img
      src={previewUrl}
      alt={file.basename}
      className={className}
      style={style ?? {
        maxWidth: `${size}px`,
        maxHeight: `${size}px`,
        objectFit: 'contain',
        borderRadius: '2px',
        verticalAlign: 'middle',
      }}
      onError={() => setError(true)}
    />
  );
}

