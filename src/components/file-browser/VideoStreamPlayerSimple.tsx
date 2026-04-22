import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../../stores/useAuthStore';

interface VideoStreamPlayerSimpleProps {
  fileId: string;
  className?: string;
}

/**
 * Simplified video player that relies on the browser's native capabilities
 * to handle HTTP Range requests automatically.
 *
 * The browser automatically sends Range requests as the user watches the
 * video, without requiring MediaSource.
 */
export function VideoStreamPlayerSimple({ fileId, className }: VideoStreamPlayerSimpleProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { credentials } = useAuthStore();

  useEffect(() => {
    let cancelled = false;

    const initVideo = () => {
      if (!credentials || credentials.access_type !== 'access-key') {
        if (!cancelled) {
          setError('Le streaming vidéo nécessite une connexion Access Key');
          setIsLoading(false);
        }
        return;
      }

      // Build the preview URL with authentication
      const baseUrl = credentials.url;
      const username = credentials.username;
      const password = credentials.password;
      
      // Build the URL with Basic Auth credentials embedded in it
      // Format: https://username:password@host/path
      const url = new URL(`${baseUrl}/files/${fileId}/preview`);
      const authenticatedUrl = `${url.protocol}//${username}:${password}@${url.host}${url.pathname}`;

      console.log('Video URL (native streaming):', authenticatedUrl.replace(password, '***'));

      if (videoRef.current) {
        videoRef.current.src = authenticatedUrl;
        
        // Events used to track video loading state
        const video = videoRef.current;
        
        const handleCanPlay = () => {
          console.log('Video is ready to play');
          if (!cancelled) {
            setIsLoading(false);
          }
        };

        const handleError = (e: Event) => {
          console.error('Video loading error:', e);
          if (!cancelled) {
            setError('Erreur lors du chargement de la vidéo');
            setIsLoading(false);
          }
        };

        const handleLoadStart = () => {
          console.log('Video loading started');
          if (!cancelled) {
            setIsLoading(true);
          }
        };

        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('error', handleError);
        video.addEventListener('loadstart', handleLoadStart);

        // Return cleanup function for this specific video element
        return () => {
          video.removeEventListener('canplay', handleCanPlay);
          video.removeEventListener('error', handleError);
          video.removeEventListener('loadstart', handleLoadStart);
        };
      }
    };

    const cleanup = initVideo();

    return () => {
      cancelled = true;
      if (cleanup) {
        cleanup();
      }
    };
  }, [fileId, credentials]);

  if (error) {
    return (
      <div className="video-stream-error">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="video-stream-container">
      {isLoading && (
        <div className="video-stream-loading">
          <div className="loading-spinner" />
          <p>Chargement de la vidéo...</p>
        </div>
      )}
      <video
        ref={videoRef}
        controls
        autoPlay
        className={className}
        style={{ display: isLoading ? 'none' : 'block' }}
        preload="metadata"
      >
        Votre navigateur ne supporte pas la lecture de vidéos.
      </video>
    </div>
  );
}
