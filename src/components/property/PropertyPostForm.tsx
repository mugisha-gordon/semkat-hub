import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { createProperty } from "@/integrations/firebase/properties";
import { uploadImage } from "@/integrations/firebase/storage";
import type { PropertyType, PropertyStatus } from "@/types/property";
import { Plus, Upload, X, Image, FileImage, Video } from "lucide-react";

interface PropertyPostFormProps {
  agentId: string;
  onSuccess?: () => void;
}

const PropertyPostForm = ({ agentId, onSuccess }: PropertyPostFormProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [illustration2DFile, setIllustration2DFile] = useState<File | null>(null);
  const [illustration2DPreview, setIllustration2DPreview] = useState<string | null>(null);
  const [uploading2D, setUploading2D] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const illustration2DInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    title: "",
    type: "residential" as PropertyType,
    status: "available" as PropertyStatus,
    price: "",
    currency: "UGX",
    region: "",
    district: "",
    address: "",
    sizeValue: "",
    sizeUnit: "acres" as "acres" | "sqft" | "sqm" | "hectares",
    description: "",
    images: "" as string, // Deprecated (device uploads only)
    illustration2D: "", // URL for 2D floor plan
    illustration3D: "", // URL for 3D virtual tour/panorama
    features: "" as string, // Comma-separated
    hasTitle: true,
    bedrooms: "",
    bathrooms: "",
    isFeatured: false,
    installmentEnabled: false,
    depositPercentage: "",
    numberOfInstallments: "",
    installmentTerms: "",
  });

  const handleImageUpload = async (files: FileList) => {
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) {
      toast.error("Please select image files");
      return;
    }

    // Validate file sizes (max 50MB)
    const maxSize = 50 * 1024 * 1024; // 50MB
    const oversizedFiles = imageFiles.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
      toast.error(`Some images exceed 50MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
      return;
    }

    setUploadingImages(true);
    setUploadProgress(0);

    try {
      let uploadedCount = 0;
      const urls: string[] = [];
      
      // Upload images one by one with progress tracking
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        try {
          const path = `properties/${agentId}/${Date.now()}_${i}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
          const url = await uploadImage(file, path);
          urls.push(url);
          uploadedCount++;
          
          // Update progress
          const progress = ((i + 1) / imageFiles.length) * 100;
          setUploadProgress(progress);
        } catch (error: any) {
          console.error(`Error uploading image ${file.name}:`, error);
          toast.error(`Failed to upload ${file.name}: ${error.message || 'Unknown error'}`);
        }
      }

      if (urls.length > 0) {
        setUploadedImages(prev => [...prev, ...urls]);

        toast.success(`${urls.length} image(s) uploaded successfully`);
      } else {
        toast.error("No images were uploaded. Please try again.");
      }
    } catch (error: any) {
      console.error("Error uploading images:", error);
      let message = error.message || "Failed to upload images";
      if (error?.code === 'storage/unauthorized') {
        message = "You don't have permission to upload images. Please check your account.";
      } else if (error?.code === 'storage/quota-exceeded') {
        message = "Storage quota exceeded. Please contact support.";
      }
      toast.error(message);
    } finally {
      setUploadingImages(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handle2DIllustrationUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file for 2D illustration");
      return;
    }

    setUploading2D(true);
    try {
      const path = `properties/${agentId}/2d_${Date.now()}_${file.name}`;
      const url = await uploadImage(file, path);
      setFormData(prev => ({ ...prev, illustration2D: url }));
      toast.success("2D illustration uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading 2D illustration:", error);
      toast.error(error.message || "Failed to upload 2D illustration");
    } finally {
      setUploading2D(false);
      setIllustration2DFile(null);
      if (illustration2DPreview) {
        URL.revokeObjectURL(illustration2DPreview);
        setIllustration2DPreview(null);
      }
    }
  };

  const handle2DFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIllustration2DFile(file);
    const preview = URL.createObjectURL(file);
    setIllustration2DPreview(preview);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload 2D illustration if file selected
      if (illustration2DFile && !formData.illustration2D) {
        await handle2DIllustrationUpload(illustration2DFile);
      }

      // Combine uploaded images with manually entered URLs
      const allImages = uploadedImages;

      if (allImages.length === 0) {
        toast.error("Please upload at least one image");
        setLoading(false);
        return;
      }

      // Parse features
      const features = formData.features
        .split(",")
        .map((f) => f.trim())
        .filter((f) => f.length > 0);

      // Calculate installment payment if enabled
      let installmentPayment = undefined;
      if (formData.installmentEnabled && (formData.type === 'agricultural' || formData.type === 'land')) {
        const price = parseFloat(formData.price);
        const depositPercent = formData.depositPercentage ? parseFloat(formData.depositPercentage) : 30;
        const numInstallments = formData.numberOfInstallments ? parseInt(formData.numberOfInstallments) : 12;
        const depositAmount = (price * depositPercent) / 100;
        const remainingAmount = price - depositAmount;
        const installmentAmount = remainingAmount / numInstallments;

        installmentPayment = {
          enabled: true,
          depositPercentage: depositPercent,
          numberOfInstallments: numInstallments,
          installmentAmount: Math.round(installmentAmount),
          terms: formData.installmentTerms || undefined,
        };
      }

      const property = await createProperty({
        agentId,
        title: formData.title,
        type: formData.type,
        status: formData.status,
        price: parseFloat(formData.price),
        currency: formData.currency,
        location: {
          region: formData.region,
          district: formData.district,
          address: formData.address,
        },
        size: {
          value: parseFloat(formData.sizeValue),
          unit: formData.sizeUnit,
        },
        images: allImages,
        illustration2D: formData.illustration2D || undefined,
        illustration3D: formData.illustration3D || undefined,
        description: formData.description,
        features,
        hasTitle: formData.hasTitle,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
        bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : undefined,
        isFeatured: formData.isFeatured,
        installmentPayment,
      });

      toast.success("Property posted successfully!");
      setOpen(false);
      // Reset form
      setFormData({
        title: "",
        type: "residential",
        status: "available",
        price: "",
        currency: "UGX",
        region: "",
        district: "",
        address: "",
        sizeValue: "",
        sizeUnit: "acres",
        description: "",
        images: "",
        illustration2D: "",
        illustration3D: "",
        features: "",
        hasTitle: true,
        bedrooms: "",
        bathrooms: "",
        isFeatured: false,
        installmentEnabled: false,
        depositPercentage: "",
        numberOfInstallments: "",
        installmentTerms: "",
      });
      setUploadedImages([]);
      setIllustration2DFile(null);
      if (illustration2DPreview) {
        URL.revokeObjectURL(illustration2DPreview);
        setIllustration2DPreview(null);
      }
      if (imageInputRef.current) imageInputRef.current.value = '';
      if (illustration2DInputRef.current) illustration2DInputRef.current.value = '';
      onSuccess?.();
    } catch (error: any) {
      console.error("Error posting property:", error);
      toast.error(error.message || "Failed to post property");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="hero" className="gap-2">
          <Plus className="h-4 w-4" />
          Post Property
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">Post New Property</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="3 Bedroom Villa in Kololo"
                required
                className="bg-white/5 border-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Type *</Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value as PropertyType })}>
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="residential">Residential</SelectItem>
                  <SelectItem value="land">Land</SelectItem>
                  <SelectItem value="rental">Rental</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="agricultural">Agricultural</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Installment Payment Option (for agricultural/land only) */}
          {(formData.type === 'agricultural' || formData.type === 'land') && (
            <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="installment" className="font-semibold text-semkat-orange cursor-pointer">
                  Enable Installment Payment Plan
                </Label>
                <Switch
                  id="installment"
                  checked={formData.installmentEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, installmentEnabled: checked })}
                />
              </div>
              {formData.installmentEnabled && (
                <div className="grid grid-cols-3 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label>Deposit %</Label>
                    <Input
                      type="number"
                      value={formData.depositPercentage}
                      onChange={(e) => setFormData({ ...formData, depositPercentage: e.target.value })}
                      placeholder="30"
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Installments</Label>
                    <Input
                      type="number"
                      value={formData.numberOfInstallments}
                      onChange={(e) => setFormData({ ...formData, numberOfInstallments: e.target.value })}
                      placeholder="12"
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Terms (optional)</Label>
                    <Input
                      value={formData.installmentTerms}
                      onChange={(e) => setFormData({ ...formData, installmentTerms: e.target.value })}
                      placeholder="Monthly"
                      className="bg-white/5 border-white/20"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value as PropertyStatus })}>
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="available">Available</SelectItem>
                  <SelectItem value="sold">Sold</SelectItem>
                  <SelectItem value="under-offer">Under Offer</SelectItem>
                  <SelectItem value="rented">Rented</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Price *</Label>
              <Input
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="850000000"
                required
                className="bg-white/5 border-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Region *</Label>
              <Input
                value={formData.region}
                onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                placeholder="Central Region"
                required
                className="bg-white/5 border-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label>District *</Label>
              <Input
                value={formData.district}
                onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                placeholder="Kampala"
                required
                className="bg-white/5 border-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Address *</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Kololo Hill Road"
                required
                className="bg-white/5 border-white/20"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Size Value *</Label>
              <Input
                type="number"
                value={formData.sizeValue}
                onChange={(e) => setFormData({ ...formData, sizeValue: e.target.value })}
                placeholder="5"
                required
                className="bg-white/5 border-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Size Unit *</Label>
              <Select value={formData.sizeUnit} onValueChange={(value) => setFormData({ ...formData, sizeUnit: value as any })}>
                <SelectTrigger className="bg-white/5 border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acres">Acres</SelectItem>
                  <SelectItem value="sqft">Square Feet</SelectItem>
                  <SelectItem value="sqm">Square Meters</SelectItem>
                  <SelectItem value="hectares">Hectares</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Bedrooms</Label>
              <Input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                placeholder="3"
                className="bg-white/5 border-white/20"
              />
            </div>
            <div className="space-y-2">
              <Label>Bathrooms</Label>
              <Input
                type="number"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                placeholder="2.5"
                className="bg-white/5 border-white/20"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Description *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Beautiful property description..."
              required
              rows={4}
              className="bg-white/5 border-white/20"
            />
          </div>

          {/* Image Upload Section */}
          <div className="space-y-4">
            <Label>Property Images *</Label>
            
            {/* Upload Images */}
            <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center hover:border-semkat-orange/50 transition-colors">
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                className="hidden"
                id="property-images"
                disabled={uploadingImages}
              />
              <label
                htmlFor="property-images"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                <Upload className="h-8 w-8 text-white/50" />
                <span className="text-white/70 text-sm">
                  {uploadingImages ? "Uploading..." : "Click to upload images"}
                </span>
                <span className="text-xs text-white/50">JPG, PNG, WebP (Max 50MB each)</span>
              </label>
              {uploadingImages && (
                <div className="mt-4 space-y-2">
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>

            {/* Uploaded Images Preview */}
            {uploadedImages.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {uploadedImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img src={url} alt={`Uploaded ${index + 1}`} className="w-full h-24 object-cover rounded-lg" />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleRemoveImage(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 2D Illustration (Floor Plan) */}
          <div className="space-y-2">
            <Label>2D Illustration (Floor Plan/Diagram)</Label>
            <div className="flex gap-2">
              <div className="flex-1 border-2 border-dashed border-white/20 rounded-lg p-4 text-center hover:border-semkat-orange/50 transition-colors">
                <input
                  ref={illustration2DInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handle2DFileSelect}
                  className="hidden"
                  id="illustration-2d"
                  disabled={uploading2D}
                />
                <label
                  htmlFor="illustration-2d"
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <FileImage className="h-6 w-6 text-white/50" />
                  <span className="text-white/70 text-xs">
                    {uploading2D ? "Uploading..." : illustration2DPreview ? "Change 2D illustration" : "Upload floor plan"}
                  </span>
                </label>
              </div>
              {illustration2DPreview && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/20">
                  <img src={illustration2DPreview} alt="2D preview" className="w-full h-full object-cover" />
                </div>
              )}
              {formData.illustration2D && !illustration2DPreview && (
                <div className="relative w-24 h-24 rounded-lg overflow-hidden border border-white/20">
                  <img src={formData.illustration2D} alt="2D illustration" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
            <p className="text-xs text-white/50">Upload a floor plan, diagram, or 2D layout (JPG, PNG, WebP)</p>
          </div>

          {/* 3D Illustration (Virtual Tour URL) */}
          <div className="space-y-2">
            <Label>3D Illustration (Virtual Tour/Panorama URL)</Label>
            <Input
              value={formData.illustration3D}
              onChange={(e) => setFormData({ ...formData, illustration3D: e.target.value })}
              placeholder="https://example.com/3d-tour or https://example.com/panorama.jpg"
              className="bg-white/5 border-white/20"
            />
            <p className="text-xs text-white/50">Enter URL for 3D virtual tour or 360° panorama image</p>
          </div>

          <div className="space-y-2">
            <Label>Features (comma-separated)</Label>
            <Input
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              placeholder="Swimming Pool, Garage, Garden, Security"
              className="bg-white/5 border-white/20"
            />
          </div>

          <Button type="submit" variant="hero" className="w-full" disabled={loading}>
            {loading ? "Posting..." : "Post Property"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyPostForm;
