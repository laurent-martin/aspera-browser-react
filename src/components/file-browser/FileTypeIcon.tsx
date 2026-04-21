import { Document, Folder, Image, Video, Link } from '@carbon/icons-react';
import type { FileItem } from '../../types';

interface FileTypeIconProps {
  file: FileItem;
  size?: number;
  className?: string;
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

export function FileTypeIcon({ file, size = 20, className }: FileTypeIconProps) {
  // For symbolic links with target_id, display the folder icon with a link badge inside
  if (file.type === 'symbolic_link' && file.target_id) {
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <Folder size={size} className={className} />
        <Link
          size={Math.floor(size * 0.4)}
          className={className}
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
    return <Folder size={size} className={className} />;
  }

  if (getMediaType(file) === 'image') {
    return <Image size={size} className={className} />;
  }

  if (getMediaType(file) === 'video') {
    return <Video size={size} className={className} />;
  }

  return <Document size={size} className={className} />;
}

