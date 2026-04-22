import { useEffect, useState } from 'react';
import { Document, Folder, Image, Video, Link } from '@carbon/icons-react';
import { useAuthStore } from '../../stores/useAuthStore';
import { FileServiceFactory } from '../../services/FileServiceFactory';
import type { FileItem } from '../../types';

interface FilePreviewImageProps {
  file: FileItem;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface FileItemVisualProps {
  file: FileItem;
  size?: number;
  previewClassName?: string;
  previewStyle?: React.CSSProperties;
  fallbackClassName?: string;
}

function getMediaType(file: FileItem): 'image' | 'video' | 'file' {
  if (!file.content_type) return 'file';

  if (file.content_type.startsWith('image/')) {
    return 'image';
  }

  if (file.content_type.startsWith('video/')) {
    return 'video';
  }

  return 'file';
}

function FilePreviewImage({
  file,
  size = 32,
  className,
  style,
}: FilePreviewImageProps) {
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

  if (error || !previewUrl) {
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

export function FileItemVisual({
  file,
  size = 20,
  previewClassName,
  previewStyle,
  fallbackClassName,
}: FileItemVisualProps) {
  if (file.preview && file.previewInfo) {
    return (
      <FilePreviewImage
        file={file}
        size={size}
        className={previewClassName}
        style={previewStyle}
      />
    );
  }

  // For symbolic links with target_id, display the folder icon with a link badge inside
  if (file.type === 'symbolic_link' && file.target_id) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Folder size={size} className={fallbackClassName} />
        <Link
          size={Math.floor(size * 0.4)}
          className={fallbackClassName}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 0.8
          }}
        />
      </div>
    );
  }

  if (file.type === 'directory') {
    return <Folder size={size} className={fallbackClassName} />;
  }

  if (getMediaType(file) === 'image') {
    return <Image size={size} className={fallbackClassName} />;
  }

  if (getMediaType(file) === 'video') {
    return <Video size={size} className={fallbackClassName} />;
  }

  return <Document size={size} className={fallbackClassName} />;
}
