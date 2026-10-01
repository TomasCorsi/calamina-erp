import { ReactNode, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { UnsavedChangesAlert } from "./UnsavedChangesAlert";

interface FormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
  onSubmit?: () => void;
  submitLabel?: string;
  isDirty?: boolean;
}

const sizeClasses = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
  "2xl": "max-w-6xl",
  full: "max-w-[95vw] w-[95vw]",
};

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = "md",
  onSubmit,
  submitLabel = "Guardar",
  isDirty = false,
}: FormDialogProps) {
  const [showAlert, setShowAlert] = useState(false);

  const handleClose = useCallback(() => {
    if (isDirty) {
      setShowAlert(true);
    } else {
      onOpenChange(false);
    }
  }, [isDirty, onOpenChange]);

  const handleDiscard = useCallback(() => {
    setShowAlert(false);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <>
      <Dialog open={open} onOpenChange={(val) => {
        if (!val) {
          handleClose();
        } else {
          onOpenChange(true);
        }
      }}>
        <DialogContent
          className={`${sizeClasses[size]} bg-card border-border`}
          onInteractOutside={isDirty ? (e) => e.preventDefault() : undefined}
          onEscapeKeyDown={isDirty ? (e) => e.preventDefault() : undefined}
          onCloseClick={isDirty ? handleClose : undefined}
        >
          <DialogHeader>
            <DialogTitle className="text-foreground">{title}</DialogTitle>
            {description && (
              <DialogDescription className="text-muted-foreground">
                {description}
              </DialogDescription>
            )}
          </DialogHeader>
          <ScrollArea className="max-h-[80vh]">
            <div className="pr-4">{children}</div>
          </ScrollArea>
          {onSubmit && (
            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancelar
              </Button>
              <Button onClick={onSubmit} className="bg-primary hover:bg-primary/90">
                {submitLabel}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <UnsavedChangesAlert
        open={showAlert}
        onOpenChange={setShowAlert}
        onDiscard={handleDiscard}
      />
    </>
  );
}
