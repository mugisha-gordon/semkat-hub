import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { createVideo } from "@/integrations/firebase/videos";
import { uploadVideo } from "@/integrations/firebase/storage";
import { Plus, Video, Upload, X, Zap } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { compressVideo, shouldCompressVideo } from "@/utils/videoCompression";

interface VideoPostFormProps {
  onSuccess?: () => void;
  triggerVariant?: "default" | "hero" | "outline" | "ghost";
  triggerSize?: "default" | "sm" | "lg" | "icon";
  triggerClassName?: string;
  triggerLabel?: string;
}

const VideoPostForm = ({
  onSuccess,
  triggerVariant = "hero",
  triggerSize = "default",
  triggerClassName = "",
  triggerLabel = "Post Video",
}: VideoPostFormProps) => {
  const { user, role } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    title: "",
    location: "",
    description: "",
  });

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error('Video file size must be less than 100MB');
      return;
    }

    setOriginalSize(file.size);

    // Check if compression is needed (files over 50MB)
    if (shouldCompressVideo(file, 50)) {
      setCompressing(true);
      setCompressionProgress(0);
      toast.loading('Compressing video for faster upload...', { id: 'compress-video' });
      
      try {
        const compressedFile = await compressVideo(file, {
          maxSizeMB: 50,
          onProgress: setCompressionProgress,
        });
        
        setVideoFile(compressedFile);
        const previewUrl = URL.createObjectURL(compressedFile);
        setVideoPreview(previewUrl);
        
        const savings = ((file.size - compressedFile.size) / file.size * 100).toFixed(1);
        toast.success(`Video compressed! Saved ${savings}%`, { id: 'compress-video' });
      } catch (error) {
        console.error('Compression failed:', error);
        // Use original file if compression fails
        setVideoFile(file);
        const previewUrl = URL.createObjectURL(file);
        setVideoPreview(previewUrl);
        toast.dismiss('compress-video');
      } finally {
        setCompressing(false);
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

    setLoading(true);
    setUploadProgress(0);

    try {
      // Upload video to Firebase Storage
      toast.loading("Uploading video...", { id: 'upload-video' });
      const { videoUrl } = await uploadVideo(videoFile, user.uid, {
        onProgress: (p) => setUploadProgress(p),
      });

      // Create video document in Firestore
      const videoId = await createVideo({
        userId: user.uid,
        title: formData.title,
        location: formData.location,
        videoUrl: videoUrl,
        description: formData.description || undefined,
        role: (role === "agent" ? "agent" : "user") as "agent" | "user",
      });

      toast.success("Video posted successfully!", { id: 'upload-video' });
      setOpen(false);
      
      // Cleanup
      handleRemoveVideo();
      setFormData({
        title: "",
        location: "",
        description: "",
      });
      
      onSuccess?.();
    } catch (error: any) {
      console.error("Error posting video:", error);
      toast.error(error.message || "Failed to post video", { id: 'upload-video' });
    } finally {
      setLoading(false);
      setUploadProgress(0);
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
            {compressing ? (
              <div className="border-2 border-dashed border-semkat-orange/50 rounded-lg p-8 text-center">
                <Zap className="h-12 w-12 text-semkat-orange mx-auto mb-2 animate-pulse" />
                <span className="text-white/70">Compressing video...</span>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>Processing...</span>
                    <span>{Math.round(compressionProgress)}%</span>
                  </div>
                  <Progress value={compressionProgress} className="h-2 bg-white/10" />
                </div>
              </div>
            ) : !videoFile ? (
              <div className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center hover:border-semkat-orange/50 transition-colors">
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
                  <Upload className="h-12 w-12 text-white/50" />
                  <span className="text-white/70">Click to upload video</span>
                  <span className="text-xs text-white/50">MP4, MOV, AVI (Max 100MB) - Large files auto-compressed</span>
                </label>
              </div>
            ) : (
              <div className="relative">
                <video
                  src={videoPreview || undefined}
                  controls
                  className="w-full max-h-64 rounded-lg bg-black/20"
                />
                {loading && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-xs text-white/60">
                      <span>Uploading...</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <Progress value={uploadProgress} className="h-2 bg-white/10" />
                  </div>
                )}
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2"
                  onClick={handleRemoveVideo}
                  disabled={loading}
                >
                  <X className="h-4 w-4" />
                </Button>
                <div className="text-xs text-white/50 mt-2 flex items-center gap-2">
                  <span>File: {videoFile.name} ({(videoFile.size / 1024 / 1024).toFixed(2)} MB)</span>
                  {originalSize > videoFile.size && (
                    <span className="text-green-400 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      Compressed from {(originalSize / 1024 / 1024).toFixed(2)} MB
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
              className="bg-white/5 border-white/20"
            />
          </div>

          <Button type="submit" variant="hero" className="w-full" disabled={loading || !videoFile}>
            {loading ? "Uploading..." : "Post Video"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default VideoPostForm;
