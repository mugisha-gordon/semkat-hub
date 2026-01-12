import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { createVideo } from "@/integrations/firebase/videos";
import { uploadVideo } from "@/integrations/firebase/storage";
import { Plus, Video, Upload, X, Zap, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { compressVideo, shouldCompressVideo } from "@/utils/videoCompression";

interface VideoPostFormProps {
  onSuccess?: () => void;
  triggerVariant?: "default" | "hero" | "outline" | "ghost";
  triggerSize?: "default" | "sm" | "lg" | "icon";
  triggerClassName?: string;
  triggerLabel?: string;
}

type UploadStage = 'idle' | 'compressing' | 'uploading' | 'creating' | 'complete';

const VideoPostForm = ({
  onSuccess,
  triggerVariant = "hero",
  triggerSize = "default",
  triggerClassName = "",
  triggerLabel = "Post Video",
}: VideoPostFormProps) => {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<UploadStage>('idle');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [uploadSpeed, setUploadSpeed] = useState<string>('');
  const videoInputRef = useRef<HTMLInputElement>(null);
  const uploadStartTime = useRef<number>(0);
  const lastBytesTransferred = useRef<number>(0);
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    description: "",
  });

  const calculateUploadSpeed = useCallback((bytesTransferred: number) => {
    const now = Date.now();
    const elapsed = (now - uploadStartTime.current) / 1000;
    if (elapsed > 0.5) {
      const bytesPerSecond = bytesTransferred / elapsed;
      if (bytesPerSecond > 1024 * 1024) {
        setUploadSpeed(`${(bytesPerSecond / (1024 * 1024)).toFixed(1)} MB/s`);
      } else if (bytesPerSecond > 1024) {
        setUploadSpeed(`${(bytesPerSecond / 1024).toFixed(0)} KB/s`);
      } else {
        setUploadSpeed(`${bytesPerSecond.toFixed(0)} B/s`);
      }
    }
  }, []);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Increased max size to 200MB for better UX
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Video file size must be less than 200MB');
      return;
    }

    setOriginalSize(file.size);

    // Only compress files over 30MB for faster uploads
    if (shouldCompressVideo(file, 30)) {
      setStage('compressing');
      setCompressionProgress(0);
      
      try {
        const compressedFile = await compressVideo(file, {
          maxSizeMB: 30,
          onProgress: setCompressionProgress,
        });
        
        setVideoFile(compressedFile);
        const previewUrl = URL.createObjectURL(compressedFile);
        setVideoPreview(previewUrl);
        
        const savings = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
        toast.success(`Compressed! Saved ${savings}%`);
      } catch (error) {
        console.error('Compression failed:', error);
        setVideoFile(file);
        const previewUrl = URL.createObjectURL(file);
        setVideoPreview(previewUrl);
      } finally {
        setStage('idle');
        setCompressionProgress(0);
      }
    } else {
      setVideoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setVideoPreview(previewUrl);
    }
  };

  const handleRemoveVideo = () => {
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);
    setOriginalSize(0);
    if (videoInputRef.current) {
      videoInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error("You must be logged in to post videos");
      return;
    }

    if (!videoFile) {
      toast.error("Please select a video file");
      return;
    }

    setStage('uploading');
    setUploadProgress(0);
    uploadStartTime.current = Date.now();
    lastBytesTransferred.current = 0;

    try {
      // Upload video to Firebase Storage with progress tracking
      const { videoUrl } = await uploadVideo(videoFile, user.uid, {
        onProgress: (p, bytesTransferred) => {
          setUploadProgress(p);
          if (bytesTransferred) {
            calculateUploadSpeed(bytesTransferred);
          }
        },
      });

      // Create video document in Firestore
      setStage('creating');
      await createVideo({
        userId: user.uid,
        title: formData.title,
        location: formData.location,
        videoUrl: videoUrl,
        description: formData.description || undefined,
        role: (role === "agent" || role === "admin" ? "agent" : "user") as "agent" | "user",
      });

      setStage('complete');
      toast.success("Video posted successfully!");
      
      // Small delay to show complete state
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setOpen(false);
      handleRemoveVideo();
      setFormData({
        title: "",
        location: "",
        description: "",
      });
      setStage('idle');
      setUploadProgress(0);
      setUploadSpeed('');
      onSuccess?.();
    } catch (error: any) {
      console.error("Error posting video:", error);
      const code = error?.code ? ` (${error.code})` : "";
      let message = error?.message || "Failed to post video";
      
      // Provide user-friendly error messages
      if (error?.code === 'storage/unauthorized') {
        message = "You don't have permission to upload videos. Please check your account.";
      } else if (error?.code === 'storage/quota-exceeded') {
        message = "Storage quota exceeded. Please contact support.";
      } else if (error?.code === 'storage/canceled') {
        message = "Upload was canceled. Please try again.";
      } else if (message.includes('network') || message.includes('Network')) {
        message = "Network error. Please check your connection and try again.";
      }
      
      toast.error(`${message}${code}`);
      setStage('idle');
      setUploadProgress(0);
      setUploadSpeed('');
      
      // Keep the file and preview for retry if upload failed
      // Don't remove video file so user can retry
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        handleRemoveVideo();
      }
    }}>
      <DialogTrigger asChild>
        <Button variant={triggerVariant} size={triggerSize} className={`gap-2 ${triggerClassName}`}>
          <Plus className="h-4 w-4" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl flex items-center gap-2">
            <Video className="h-5 w-5" />
            Post New Video
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>Title *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Beautiful property tour"
              required
              className="bg-white/5 border-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label>Location *</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Kololo, Kampala"
              required
              className="bg-white/5 border-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label>Video File *</Label>
            {stage === 'compressing' ? (
              <div className="border-2 border-dashed border-semkat-orange/50 rounded-lg p-6 sm:p-8 text-center">
                <Zap className="h-10 w-10 sm:h-12 sm:w-12 text-semkat-orange mx-auto mb-2 animate-pulse" />
                <span className="text-white/70 text-sm sm:text-base">Compressing video...</span>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Processing...</span>
                    <span>{Math.round(compressionProgress)}%</span>
                  </div>
                  <Progress value={compressionProgress} className="h-2 bg-white/10" />
                </div>
              </div>
            ) : !videoFile ? (
              <div className="border-2 border-dashed border-white/20 rounded-lg p-6 sm:p-8 text-center hover:border-semkat-orange/50 transition-colors">
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="video-upload"
                />
                <label
                  htmlFor="video-upload"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-white/50" />
                  <span className="text-white/70 text-sm sm:text-base">Click to upload video</span>
                  <span className="text-[10px] sm:text-xs text-white/50">MP4, MOV, AVI (Max 200MB) - Auto-compressed</span>
                </label>
              </div>
            ) : (
              <div className="relative">
                <video
                  src={videoPreview || undefined}
                  controls
                  className="w-full max-h-48 sm:max-h-64 rounded-lg bg-black/20"
                />
                
                {/* Upload Progress Overlay */}
                {(stage === 'uploading' || stage === 'creating' || stage === 'complete') && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center rounded-lg">
                    {stage === 'complete' ? (
                      <>
                        <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
                        <span className="text-green-400 font-semibold">Video Posted!</span>
                      </>
                    ) : stage === 'creating' ? (
                      <>
                        <div className="w-10 h-10 border-4 border-semkat-orange border-t-transparent rounded-full animate-spin mb-2" />
                        <span className="text-white/80 text-sm">Saving video...</span>
                      </>
                    ) : (
                      <>
                        <div className="w-full max-w-[200px] space-y-2">
                          <div className="flex items-center justify-between text-xs text-white/80">
                            <span>Uploading...</span>
                            <span>{Math.round(uploadProgress)}%</span>
                          </div>
                          <Progress value={uploadProgress} className="h-3 bg-white/20" />
                          {uploadSpeed && (
                            <p className="text-center text-xs text-white/60">{uploadSpeed}</p>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )}
                
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-8 w-8"
                  onClick={handleRemoveVideo}
                  disabled={stage !== 'idle'}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="text-[10px] sm:text-xs text-white/50 mt-2 flex flex-wrap items-center gap-2">
                  <span>{videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)</span>
                  {originalSize > videoFile.size && (
                    <span className="text-green-400 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Saved {((originalSize - videoFile.size) / 1024 / 1024).toFixed(1)} MB
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe your video..."
              rows={3}
              className="bg-white/5 border-white/20 text-sm"
            />
          </div>

          <Button 
            type="submit" 
            variant="hero" 
            className="w-full" 
            disabled={stage !== 'idle' || !videoFile}
          >
            {stage === 'uploading' ? `Uploading ${Math.round(uploadProgress)}%...` : 
             stage === 'creating' ? 'Saving...' :
             stage === 'complete' ? 'Done!' : 
             'Post Video'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPostForm;
