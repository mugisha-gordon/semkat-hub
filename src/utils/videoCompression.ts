/**
 * Video compression utility for client-side video processing
 * Uses canvas and MediaRecorder APIs for compression
 */

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidth?: number;
  maxHeight?: number;
  videoBitrate?: number;
  onProgress?: (progress: number) => void;
}

/**
 * Compress a video file using canvas-based re-encoding
 * Falls back to original if compression fails or isn't needed
 */
export async function compressVideo(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const {
    maxSizeMB = 50,
    maxWidth = 1280,
    maxHeight = 720,
    videoBitrate = 2500000, // 2.5 Mbps
    onProgress,
  } = options;

  const maxSizeBytes = maxSizeMB * 1024 * 1024;

  // If file is already small enough, return as-is
  if (file.size <= maxSizeBytes) {
    onProgress?.(100);
    return file;
  }

  // Check for MediaRecorder support
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported('video/webm')) {
    console.warn('MediaRecorder not supported, returning original file');
    onProgress?.(100);
    return file;
  }

  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      reject(new Error('Canvas context not available'));
      return;
    }

    const videoUrl = URL.createObjectURL(file);
    video.src = videoUrl;

    video.onloadedmetadata = () => {
      // Calculate new dimensions
      let { videoWidth, videoHeight } = video;
      
      if (videoWidth > maxWidth || videoHeight > maxHeight) {
        const ratio = Math.min(maxWidth / videoWidth, maxHeight / videoHeight);
        videoWidth = Math.floor(videoWidth * ratio);
        videoHeight = Math.floor(videoHeight * ratio);
      }

      canvas.width = videoWidth;
      canvas.height = videoHeight;

      // Set up MediaRecorder
      const stream = canvas.captureStream(30); // 30 FPS
      
      // Try to add audio if available
      try {
        const audioContext = new AudioContext();
        const source = audioContext.createMediaElementSource(video);
        const destination = audioContext.createMediaStreamDestination();
        source.connect(destination);
        source.connect(audioContext.destination);
        
        destination.stream.getAudioTracks().forEach(track => {
          stream.addTrack(track);
        });
      } catch (e) {
        console.warn('Could not add audio track:', e);
      }

      const recorder = new MediaRecorder(stream, {
        mimeType: 'video/webm',
        videoBitsPerSecond: videoBitrate,
      });

      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        URL.revokeObjectURL(videoUrl);
        
        const blob = new Blob(chunks, { type: 'video/webm' });
        
        // If compressed file is larger, use original
        if (blob.size >= file.size) {
          onProgress?.(100);
          resolve(file);
          return;
        }

        const compressedFile = new File(
          [blob],
          file.name.replace(/\.[^.]+$/, '.webm'),
          { type: 'video/webm' }
        );

        onProgress?.(100);
        resolve(compressedFile);
      };

      recorder.onerror = (e) => {
        URL.revokeObjectURL(videoUrl);
        console.error('Recording error:', e);
        // Fall back to original file
        onProgress?.(100);
        resolve(file);
      };

      // Start recording
      video.currentTime = 0;
      video.play();
      recorder.start();

      // Track progress
      const duration = video.duration;
      const progressInterval = setInterval(() => {
        if (video.currentTime > 0) {
          const progress = Math.min((video.currentTime / duration) * 95, 95);
          onProgress?.(progress);
        }
      }, 200);

      // Render frames
      const renderFrame = () => {
        if (video.paused || video.ended) {
          clearInterval(progressInterval);
          recorder.stop();
          return;
        }
        ctx.drawImage(video, 0, 0, videoWidth, videoHeight);
        requestAnimationFrame(renderFrame);
      };

      video.onplay = () => {
        renderFrame();
      };

      video.onended = () => {
        clearInterval(progressInterval);
        recorder.stop();
      };

      video.onerror = () => {
        clearInterval(progressInterval);
        URL.revokeObjectURL(videoUrl);
        // Fall back to original file
        onProgress?.(100);
        resolve(file);
      };
    };

    video.onerror = () => {
      URL.revokeObjectURL(videoUrl);
      reject(new Error('Failed to load video'));
    };
  });
}

/**
 * Check if video needs compression
 */
export function shouldCompressVideo(file: File, maxSizeMB: number = 50): boolean {
  return file.size > maxSizeMB * 1024 * 1024;
}

/**
 * Get video dimensions
 */
export function getVideoDimensions(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const url = URL.createObjectURL(file);
    video.src = url;
    
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
        duration: video.duration,
      });
    };
    
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load video metadata'));
    };
  });
}
