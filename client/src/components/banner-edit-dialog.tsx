import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Loader2, Image as ImageIcon, Move } from "lucide-react";

interface BannerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentBanner: string | null | undefined;
  currentPosition: number | null | undefined;
  isSaving: boolean;
  isRemoving: boolean;
  onSave: (banner: string | null, position: number) => void;
  onRemove: () => void;
}

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

export function BannerEditDialog({
  open,
  onOpenChange,
  currentBanner,
  currentPosition,
  isSaving,
  isRemoving,
  onSave,
  onRemove,
}: BannerEditDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);
  const [position, setPosition] = useState<number>(50);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [confirmRemoveOpen, setConfirmRemoveOpen] = useState(false);

  const dragStateRef = useRef<{ startY: number; startPos: number; pointerId: number } | null>(null);

  useEffect(() => {
    if (open) {
      setPreviewBanner(currentBanner || null);
      setPosition(typeof currentPosition === "number" ? currentPosition : 50);
      setError(null);
      setIsDragging(false);
      dragStateRef.current = null;
    }
  }, [open, currentBanner, currentPosition]);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be under 2MB");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewBanner(reader.result as string);
      setPosition(50);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const hasImage = !!previewBanner;
  const positionChanged =
    hasImage && previewBanner === currentBanner && position !== (currentPosition ?? 50);
  const imageChanged = previewBanner !== (currentBanner || null);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!hasImage || !previewRef.current) return;
    e.preventDefault();
    previewRef.current.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      startY: e.clientY,
      startPos: position,
      pointerId: e.pointerId,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId || !previewRef.current) return;
    const height = previewRef.current.clientHeight || 1;
    const dy = e.clientY - drag.startY;
    // Drag down -> reveal more of the top of the image -> position decreases.
    const delta = -(dy / height) * 100;
    setPosition(clamp(drag.startPos + delta));
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    try {
      previewRef.current?.releasePointerCapture(e.pointerId);
    } catch {}
    dragStateRef.current = null;
    setIsDragging(false);
  };

  const handleSave = () => {
    if (!previewBanner) return;
    onSave(previewBanner, Math.round(position));
  };

  const handleRemoveConfirmed = () => {
    setConfirmRemoveOpen(false);
    onRemove();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md" data-testid="dialog-banner-edit">
          <DialogHeader>
            <DialogTitle>Profile banner</DialogTitle>
            <DialogDescription>
              Upload a new banner, drag to reposition, or remove it.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div
              ref={previewRef}
              className={`relative w-full h-40 rounded-lg overflow-hidden bg-muted border border-border select-none touch-none ${
                hasImage ? (isDragging ? "cursor-grabbing" : "cursor-grab") : ""
              }`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={endDrag}
              onPointerCancel={endDrag}
              data-testid="banner-preview"
            >
              {previewBanner ? (
                <>
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backgroundImage: `url(${previewBanner})`,
                      backgroundSize: "cover",
                      backgroundPosition: `center ${position}%`,
                    }}
                  />
                  <div
                    className={`absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/60 text-white text-xs backdrop-blur-sm pointer-events-none transition-opacity ${
                      isDragging ? "opacity-0" : "opacity-90"
                    }`}
                    data-testid="hint-banner-drag"
                  >
                    <Move className="w-3 h-3" />
                    <span>Drag to reposition</span>
                  </div>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground pointer-events-none">
                  <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                  <span className="text-sm">No banner yet</span>
                </div>
              )}
            </div>

            {error && (
              <p className="text-sm text-destructive" data-testid="text-banner-error">
                {error}
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
              data-testid="input-banner-file"
            />
          </div>

          <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                data-testid="button-banner-upload"
              >
                <Upload className="w-4 h-4 mr-2" />
                {hasImage ? "Replace" : "Upload"}
              </Button>
              {currentBanner && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmRemoveOpen(true)}
                  disabled={isRemoving}
                  className="text-destructive hover:text-destructive"
                  data-testid="button-banner-remove"
                >
                  {isRemoving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Remove
                </Button>
              )}
            </div>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !hasImage || (!imageChanged && !positionChanged)}
              data-testid="button-banner-save"
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmRemoveOpen} onOpenChange={setConfirmRemoveOpen}>
        <AlertDialogContent data-testid="dialog-confirm-remove-banner">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove profile banner?</AlertDialogTitle>
            <AlertDialogDescription>
              Your profile banner will be cleared. You can upload a new one anytime.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-remove-banner">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirmed}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-remove-banner"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
