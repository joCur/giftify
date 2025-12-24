"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/user-avatar";
import { uploadAvatar, removeAvatar } from "@/lib/actions/avatar";
import { toast } from "sonner";
import { Camera, Upload, Trash2, Loader2, ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface AvatarUploadDialogProps {
  avatarUrl?: string | null;
  email?: string | null;
  displayName?: string | null;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export function AvatarUploadDialog({
  avatarUrl,
  email,
  displayName,
}: AvatarUploadDialogProps) {
  const [open, setOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = useCallback(() => {
    // Revoke object URL to prevent memory leaks
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setPreview(null);
    setSelectedFile(null);
    setIsDragging(false);
  }, [preview]);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetState();
    }
  };

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return "Please select a JPG, PNG, or WebP image";
    }
    if (file.size > MAX_FILE_SIZE) {
      return "Image must be less than 5MB";
    }
    return null;
  };

  const handleFileSelect = (file: File) => {
    const error = validateFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    // Revoke previous preview URL if exists
    if (preview) {
      URL.revokeObjectURL(preview);
    }

    setSelectedFile(file);

    // Create preview URL using createObjectURL (more memory efficient than FileReader)
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    const result = await uploadAvatar(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile picture updated");
      setOpen(false);
      resetState();
    }

    setIsUploading(false);
  };

  const handleRemove = async () => {
    setIsRemoving(true);

    const result = await removeAvatar();

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profile picture removed");
      setOpen(false);
      resetState();
    }

    setIsRemoving(false);
  };

  const isLoading = isUploading || isRemoving;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <button
          className="group relative"
          aria-label="Change profile picture"
        >
          {/* Avatar container with gradient background */}
          <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center p-1">
            <UserAvatar
              avatarUrl={avatarUrl}
              email={email}
              displayName={displayName}
              size="xl"
              className="rounded-xl"
              fallbackClassName="rounded-xl bg-gradient-to-br from-primary/30 to-primary/10"
            />
          </div>
          {/* Edit overlay */}
          <div className="absolute inset-0 rounded-2xl bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="flex flex-col items-center gap-1 text-white">
              <Camera className="w-6 h-6" />
              <span className="text-xs font-medium">Change</span>
            </div>
          </div>
        </button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader className="px-6 pt-2 sm:pt-0">
          <DialogTitle className="font-[family-name:var(--font-outfit)]">
            Profile Picture
          </DialogTitle>
          <DialogDescription>
            Upload a custom photo or use your Gravatar
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6">
          {/* Preview / Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
              "relative flex flex-col items-center justify-center gap-4 p-8 border-2 border-dashed rounded-2xl cursor-pointer transition-colors",
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            {preview ? (
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full h-full object-cover"
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetState();
                    if (fileInputRef.current) {
                      fileInputRef.current.value = "";
                    }
                  }}
                  className="absolute -top-2 -right-2 h-8 w-8 rounded-full p-0"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center">
                  <ImageIcon className="w-8 h-8 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Drop an image here, or click to select
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG, or WebP. Max 5MB.
                  </p>
                </div>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleInputChange}
            className="hidden"
            disabled={isLoading}
          />

          {/* Actions */}
          <div className="flex flex-col gap-3">
            {preview ? (
              <Button
                onClick={handleUpload}
                disabled={isLoading}
                className="w-full rounded-xl"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Save Photo
                  </>
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="w-full rounded-xl"
              >
                <Upload className="mr-2 h-4 w-4" />
                Choose Photo
              </Button>
            )}

            {avatarUrl && (
              <Button
                variant="ghost"
                onClick={handleRemove}
                disabled={isLoading}
                className="w-full rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {isRemoving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Removing...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove Current Photo
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Info text */}
          <p className="text-xs text-muted-foreground text-center">
            If you remove your photo, we&apos;ll show your Gravatar or initials instead
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
