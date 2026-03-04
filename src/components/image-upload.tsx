"use client";

import { useState, useRef, useCallback } from "react";
import { ImagePlus, X, Loader2, GripVertical } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

export interface UploadedImage {
  url: string;
  fileId: string;
}

interface ImageUploadProps {
  images: UploadedImage[];
  onChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  folder?: string;
}

export function ImageUpload({
  images,
  onChange,
  maxImages = 5,
  folder = "/godown/products",
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const toBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const fileArr = Array.from(files);
      const remaining = maxImages - images.length;
      if (remaining <= 0) {
        toast.warning(`Maximum ${maxImages} images allowed`);
        return;
      }
      const toUpload = fileArr.slice(0, remaining);

      // Validate
      for (const f of toUpload) {
        if (!f.type.startsWith("image/")) {
          toast.error(`${f.name} is not an image`);
          return;
        }
        if (f.size > 5 * 1024 * 1024) {
          toast.error(`${f.name} exceeds 5MB limit`);
          return;
        }
      }

      setUploading(true);
      try {
        const results: UploadedImage[] = [];
        for (const file of toUpload) {
          const base64 = await toBase64(file);
          const res = await axios.post("/api/upload", {
            fileBase64: base64,
            fileName: file.name,
            folder,
          });
          results.push({ url: res.data.url, fileId: res.data.fileId });
        }
        onChange([...images, ...results]);
        toast.success(
          `${results.length} image${results.length > 1 ? "s" : ""} uploaded`
        );
      } catch {
        toast.error("Image upload failed");
      } finally {
        setUploading(false);
        if (inputRef.current) inputRef.current.value = "";
      }
    },
    [images, onChange, maxImages, folder]
  );

  const removeImage = (idx: number) => {
    onChange(images.filter((_, i) => i !== idx));
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  return (
    <div className="space-y-3">
      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div
              key={img.fileId}
              className="relative group aspect-square border border-border overflow-hidden bg-secondary/30"
            >
              <img
                src={img.url}
                alt={`Product image ${idx + 1}`}
                className="w-full h-full object-cover"
              />
              {idx === 0 && (
                <span className="absolute top-1.5 left-1.5 text-[9px] font-semibold uppercase tracking-wider bg-foreground text-background px-1.5 py-0.5">
                  Main
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(idx)}
                className="absolute top-1.5 right-1.5 h-6 w-6 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone / upload button */}
      {images.length < maxImages && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 py-8 border-2 border-dashed border-border hover:border-foreground/20 cursor-pointer transition-colors bg-secondary/20"
        >
          {uploading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <ImagePlus className="h-6 w-6 text-muted-foreground/60" strokeWidth={1.5} />
          )}
          <p className="text-[12px] text-muted-foreground">
            {uploading
              ? "Uploading…"
              : `Drop images here or click to browse (max ${maxImages})`}
          </p>
          <p className="text-[10px] text-muted-foreground/60">
            JPG, PNG, WebP — up to 5MB each
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => e.target.files && handleFiles(e.target.files)}
          />
        </div>
      )}
    </div>
  );
}
