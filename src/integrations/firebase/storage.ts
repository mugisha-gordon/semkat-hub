import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './client';

 function withTimeout<T>(promise: Promise<T>, timeoutMs: number, message: string): Promise<T> {
   return new Promise<T>((resolve, reject) => {
     const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
     promise
       .then((value) => {
         clearTimeout(timer);
         resolve(value);
       })
       .catch((err) => {
         clearTimeout(timer);
         reject(err);
       });
   });
 }

/**
 * Upload a video file to Firebase Storage
 */
export async function uploadVideo(
  file: File,
  userId: string,
  options?: {
    onProgress?: (progress: number, bytesTransferred?: number) => void;
  }
): Promise<{ videoUrl: string; coverUrl?: string }> {
  // Validate file type
  if (!file.type.startsWith('video/')) {
    throw new Error('File must be a video');
  }

  // Validate file size (max 200MB - increased for better UX)
  const maxSize = 200 * 1024 * 1024; // 200MB
  if (file.size > maxSize) {
    throw new Error('Video file size must be less than 200MB');
  }

  // Generate unique filename - sanitize filename to avoid issues
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filename = `videos/${userId}/${timestamp}_${sanitizedName}`;
  const videoRef = ref(storage, filename);

  try {
    const attemptResumable = async () => {
      const uploadTask = uploadBytesResumable(videoRef, file, {
        contentType: file.type || 'video/mp4',
      });

      await new Promise<void>((resolve, reject) => {
        const totalTimeoutMs = 10 * 60 * 1000;
        const idleTimeoutMs = 45 * 1000;

        let totalTimer: any;
        let idleTimer: any;

        const clearTimers = () => {
          if (totalTimer) clearTimeout(totalTimer);
          if (idleTimer) clearTimeout(idleTimer);
        };

        const fail = (err: any) => {
          clearTimers();
          try {
            uploadTask.cancel();
          } catch {
            // ignore
          }
          reject(err);
        };

        const resetIdle = () => {
          if (idleTimer) clearTimeout(idleTimer);
          idleTimer = setTimeout(() => {
            fail(new Error('Upload stalled. Please check your connection and try again.'));
          }, idleTimeoutMs);
        };

        totalTimer = setTimeout(() => {
          fail(new Error('Upload timed out. Please try again.'));
        }, totalTimeoutMs);

        resetIdle();
        options?.onProgress?.(0, 0);

        uploadTask.on(
          'state_changed',
          (snapshot) => {
            resetIdle();
            const progress = snapshot.totalBytes
              ? (snapshot.bytesTransferred / snapshot.totalBytes) * 100
              : 0;
            options?.onProgress?.(progress, snapshot.bytesTransferred);
          },
          (error) => {
            console.error('Upload error:', error);
            fail(error);
          },
          () => {
            clearTimers();
            options?.onProgress?.(100, file.size);
            resolve();
          }
        );
      });
    };

    try {
      await attemptResumable();
    } catch (resumableError: any) {
      const msg = String(resumableError?.message || resumableError);
      console.warn('Resumable upload failed, falling back to non-resumable uploadBytes:', resumableError);
      options?.onProgress?.(0, 0);
      await withTimeout(
        uploadBytes(videoRef, file, { contentType: file.type || 'video/mp4' }),
        10 * 60 * 1000,
        'Upload timed out. Please try again.'
      );
      options?.onProgress?.(100, file.size);
      void msg;
    }

    // Get download URL after upload completes
    // Add small delay to ensure upload is fully processed
    await new Promise(resolve => setTimeout(resolve, 200));
    
    let videoUrl: string | null = null;
    let retries = 3;
    
    while (retries > 0) {
      try {
        videoUrl = await withTimeout(
          getDownloadURL(videoRef),
          30 * 1000,
          'Failed to get video URL. Please try again.'
        );
        if (videoUrl && videoUrl.length > 0) {
          break;
        }
      } catch (error: any) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to get video download URL after 3 attempts: ${error.message}`);
        }
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    if (!videoUrl) {
      throw new Error('Failed to get video download URL after upload');
    }

    return { videoUrl };
  } catch (error: any) {
    console.error('Error uploading video:', error);
    throw new Error(`Failed to upload video: ${error.message}`);
  }
}

/**
 * Upload an image file to Firebase Storage
 */
export async function uploadImage(
  file: File,
  path: string
): Promise<string> {
  // Validate file type
  if (!file.type.startsWith('image/')) {
    throw new Error('File must be an image');
  }

  // Validate file size (max 50MB)
  const maxSize = 50 * 1024 * 1024; // 50MB
  if (file.size > maxSize) {
    throw new Error('Image file size must be less than 50MB');
  }

  const imageRef = ref(storage, path);

  try {
    // Upload with explicit contentType (required by storage.rules contentType matcher)
    // Add a timeout + a few retries for flaky networks
    let uploadRetries = 3;
    while (uploadRetries > 0) {
      try {
        await withTimeout(
          uploadBytes(imageRef, file, { contentType: file.type || 'image/jpeg' }),
          2 * 60 * 1000,
          'Image upload timed out. Please try again.'
        );
        break;
      } catch (error: any) {
        uploadRetries--;
        if (uploadRetries === 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    // Retry download URL retrieval (sometimes immediate read can race)
    let imageUrl: string | null = null;
    let urlRetries = 3;
    while (urlRetries > 0) {
      try {
        imageUrl = await withTimeout(
          getDownloadURL(imageRef),
          30 * 1000,
          'Failed to get image URL. Please try again.'
        );
        if (imageUrl && imageUrl.length > 0) break;
      } catch (error: any) {
        urlRetries--;
        if (urlRetries === 0) throw error;
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    if (!imageUrl) {
      throw new Error('Failed to get image download URL after upload');
    }

    return imageUrl;
  } catch (error: any) {
    console.error('Error uploading image:', error);
    throw new Error(`Failed to upload image: ${error.message}`);
  }
}

/**
 * Delete a file from Firebase Storage
 */
export async function deleteFile(fileUrl: string): Promise<void> {
  try {
    // The Firebase v9 `ref` function supports full URLs (including download URLs)
    // as well as relative storage paths.
    const fileRef = ref(storage, fileUrl);
    await deleteObject(fileRef);
  } catch (error: any) {
    console.error('Error deleting file:', error);
    throw new Error(`Failed to delete file: ${error.message}`);
  }
}
