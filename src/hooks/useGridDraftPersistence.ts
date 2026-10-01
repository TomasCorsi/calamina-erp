import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";

interface UseGridDraftPersistenceOptions<T> {
  storageKey: string;
  data: T[];
  setData: (data: T[]) => void;
  hasChanges: boolean;
  isNewRow: (row: T) => boolean;
  isModifiedRow: (row: T) => boolean;
}

export function useGridDraftPersistence<T>({
  storageKey,
  data,
  setData,
  hasChanges,
  isNewRow,
  isModifiedRow,
}: UseGridDraftPersistenceOptions<T>) {
  const [showRestorePrompt, setShowRestorePrompt] = useState(false);
  const [draftTimestamp, setDraftTimestamp] = useState<string | null>(null);
  const isInitialized = useRef(false);

  // Check for existing draft on mount
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    try {
      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.data && parsed.timestamp) {
          const changedRows = parsed.data.filter(
            (row: T) => isNewRow(row) || isModifiedRow(row)
          );
          if (changedRows.length > 0) {
            setDraftTimestamp(parsed.timestamp);
            setShowRestorePrompt(true);
          } else {
            // No actual changes in the draft, clean it up
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (error) {
      console.error("Error reading draft from localStorage:", error);
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, isNewRow, isModifiedRow]);

  // Save draft to localStorage on every change
  useEffect(() => {
    if (!isInitialized.current) return;
    if (showRestorePrompt) return; // Don't overwrite while restore prompt is shown

    if (hasChanges) {
      try {
        const draft = {
          data,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(storageKey, JSON.stringify(draft));
      } catch (error) {
        console.error("Error saving draft to localStorage:", error);
      }
    } else {
      // Clear draft when no changes (after save or reset)
      localStorage.removeItem(storageKey);
    }
  }, [data, hasChanges, storageKey, showRestorePrompt]);

  const restoreDraft = useCallback(() => {
    try {
      const savedDraft = localStorage.getItem(storageKey);
      if (savedDraft) {
        const parsed = JSON.parse(savedDraft);
        if (parsed.data) {
          setData(parsed.data);
          toast.success("Borrador restaurado correctamente");
        }
      }
    } catch (error) {
      console.error("Error restoring draft:", error);
      toast.error("Error al restaurar el borrador");
    } finally {
      setShowRestorePrompt(false);
    }
  }, [storageKey, setData]);

  const discardDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    setShowRestorePrompt(false);
    toast.info("Borrador descartado");
  }, [storageKey]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return {
    showRestorePrompt,
    draftTimestamp: draftTimestamp ? formatTimestamp(draftTimestamp) : null,
    restoreDraft,
    discardDraft,
    clearDraft,
  };
}
