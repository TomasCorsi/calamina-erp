import { useState, useCallback } from "react";

/**
 * Hook to manage unsaved changes protection for dialogs.
 * Returns handlers for intercepting close attempts and managing the alert state.
 */
export function useDirtyDialog(
  onOpenChange: (open: boolean) => void,
  isDirty: boolean
) {
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

  const handleOpenChange = useCallback(
    (val: boolean) => {
      if (!val) {
        handleClose();
      } else {
        onOpenChange(true);
      }
    },
    [handleClose, onOpenChange]
  );

  const dirtyProps = isDirty
    ? {
        onInteractOutside: (e: Event) => e.preventDefault(),
        onEscapeKeyDown: (e: KeyboardEvent) => e.preventDefault(),
        onCloseClick: handleClose,
      }
    : {};

  return {
    showAlert,
    setShowAlert,
    handleClose,
    handleDiscard,
    handleOpenChange,
    dirtyProps,
  };
}
