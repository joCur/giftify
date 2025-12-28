"use client";

import { useRef, useCallback } from "react";
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
import { useDialogForm } from "@/lib/hooks/use-dialog-form";

interface AvatarUploadDialogProps {
  avatarUrl?: string | null;
  email?: string | null;
  displayName?: string | null;
}

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

interface AvatarUploadState {
  isUploading: boolean;
  isRemoving: boolean;
  preview: string | null;
  selectedFile: File | null;
  isDragging: boolean;
}

const DEFAULT_STATE: AvatarUploadState = {
  isUploading: false,
  isRemoving: false,
  preview: null,
  selectedFile: null,
  isDragging: false,
};

export function AvatarUploadDialog({
  avatarUrl,
  email,
  displayName,
}: AvatarUploadDialogProps) {
  const dialog = useDialogForm<AvatarUploadState>({
    defaultState: DEFAULT_STATE,
    onReset: () => {
      // Revoke object URL to prevent memory leaks
      if (dialog.state.preview) {
        URL.revokeObjectURL(dialog.state.preview);
      }
    },
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    if (dialog.state.preview) {
      URL.revokeObjectURL(dialog.state.preview);
    }

    // Create preview URL using createObjectURL (more memory efficient than FileReader)
    const objectUrl = URL.createObjectURL(file);
    dialog.setState((prev) => ({
      ...prev,
      selectedFile: file,
      preview: objectUrl,
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    dialog.setState((prev) => ({ ...prev, isDragging: true }));
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dialog.setState((prev) => ({ ...prev, isDragging: false }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dialog.setState((prev) => ({ ...prev, isDragging: false }));

    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleUpload = async () => {
    if (!dialog.state.selectedFile) return;

    dialog.setState((prev) => ({ ...prev, isUploading: true }));
    const formData = new FormData();
    formData.append("file", dialog.state.selectedFile);

    const result = await uploadAvatar(formData);

    if (result.error) {
      toast.error(result.error);
      dialog.setState((prev) => ({ ...prev, isUploading: false }));
    } else {
      toast.success("Profile picture updated");
      dialog.closeDialog();
    }
  };

  const handleRemove = async () => {
    dialog.setState((prev) => ({ ...prev, isRemoving: true }));

    const result = await removeAvatar();

    if (result.error) {
      toast.error(result.error);
      dialog.setState((prev) => ({ ...prev, isRemoving: false }));
    } else {
      toast.success("Profile picture removed");
      dialog.closeDialog();
    }
  };

  const isLoading = dialog.state.isUploading || dialog.state.isRemoving;

  return (
    <Dialog open={dialog.open} onOpenChange={dialog.setOpen}>
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
              dialog.state.isDragging
                ? "border-primary bg-primary/5"
                : "border-border/50 hover:border-primary/50 hover:bg-muted/30"
            )}
          >
            {dialog.state.preview ? (
              <div className="relative">
                <div className="w-32 h-32 rounded-2xl overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={dialog.state.preview}
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
                    dialog.resetState();
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
            {dialog.state.preview ? (
              <Button
                onClick={handleUpload}
                disabled={isLoading}
                className="w-full rounded-xl"
              >
                {dialog.state.isUploading ? (
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
                {dialog.state.isRemoving ? (
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
