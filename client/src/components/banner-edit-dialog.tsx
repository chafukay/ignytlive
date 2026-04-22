import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Upload, Trash2, Loader2, Image as ImageIcon } from "lucide-react";

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
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);
  const [position, setPosition] = useState<number>(50);
  const [error, setError] = useState<string | null>(null);

  // Reset state every time the dialog opens.
  useEffect(() => {
    if (open) {
      setPreviewBanner(currentBanner || null);
      setPosition(typeof currentPosition === "number" ? currentPosition : 50);
      setError(null);
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
  };

  const hasImage = !!previewBanner;
  const positionChanged =
    hasImage && previewBanner === currentBanner && position !== (currentPosition ?? 50);
  const imageChanged = previewBanner !== (currentBanner || null);

  const handleSave = () => {
    if (!previewBanner) return;
    onSave(previewBanner, position);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" data-testid="dialog-banner-edit">
        <DialogHeader>
          <DialogTitle>Profile banner</DialogTitle>
          <DialogDescription>
            Upload a new banner, adjust its position, or remove it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div
            className="relative w-full h-40 rounded-lg overflow-hidden bg-muted border border-border"
            data-testid="banner-preview"
          >
            {previewBanner ? (
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage: `url(${previewBanner})`,
                  backgroundSize: "cover",
                  backgroundPosition: `center ${position}%`,
                }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="w-10 h-10 mb-2 opacity-50" />
                <span className="text-sm">No banner yet</span>
              </div>
            )}
          </div>

          {hasImage && (
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">
                Vertical position
              </label>
              <Slider
                value={[position]}
                min={0}
                max={100}
                step={1}
                onValueChange={(v) => setPosition(v[0] ?? 50)}
                data-testid="slider-banner-position"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Top</span>
                <span>{position}%</span>
                <span>Bottom</span>
              </div>
            </div>
          )}

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
                onClick={onRemove}
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
  );
}
