import { useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";

const DRAFT_KEY_PREFIX = "parte_diario_draft_";

interface UseFormDraftPersistenceOptions<T> {
  empleadoId: string;
  formData: T;
  setFormData: React.Dispatch<React.SetStateAction<T>>;
  /** Default form data to compare against (skip saving if equal) */
  defaultData: T;
  /** Whether the form was pre-populated from an existing parte */
  isEditing: boolean;
}

export function useFormDraftPersistence<T extends Record<string, unknown>>({
  empleadoId,
  formData,
  setFormData,
  defaultData,
  isEditing,
}: UseFormDraftPersistenceOptions<T>) {
  const storageKey = `${DRAFT_KEY_PREFIX}${empleadoId}`;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restoredRef = useRef(false);
  const initializedRef = useRef(false);

  // Restore draft on mount (only for new partes, not editing existing ones)
  useEffect(() => {
    if (initializedRef.current || isEditing) {
      initializedRef.current = true;
      return;
    }
    initializedRef.current = true;

    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.data) {
          // Check if draft has meaningful data (not just defaults)
          const hasContent = Object.keys(parsed.data).some((key) => {
            const val = parsed.data[key];
            const def = (defaultData as Record<string, unknown>)[key];
            if (Array.isArray(val)) return val.length > 0 && JSON.stringify(val) !== JSON.stringify(def);
            if (typeof val === "boolean") return val !== def;
            return val !== "" && val !== def && val !== undefined;
          });

          if (hasContent) {
            setFormData(parsed.data as T);
            restoredRef.current = true;
            toast.info("Se recuperaron datos del formulario anterior", {
              duration: 4000,
            });
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (error) {
      console.error("Error restoring form draft:", error);
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, isEditing, setFormData, defaultData]);

  // Auto-save with debounce
  useEffect(() => {
    if (!initializedRef.current) return;
    // Don't auto-save if editing an existing parte (that's handled by the DB draft)
    if (isEditing) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      try {
        // Check if there's meaningful data to save
        const hasContent = Object.keys(formData).some((key) => {
          const val = formData[key];
          const def = (defaultData as Record<string, unknown>)[key];
          if (Array.isArray(val)) return val.length > 0 && JSON.stringify(val) !== JSON.stringify(def);
          if (typeof val === "boolean") return val !== def;
          return val !== "" && val !== def && val !== undefined;
        });

        if (hasContent) {
          localStorage.setItem(
            storageKey,
            JSON.stringify({ data: formData, timestamp: new Date().toISOString() })
          );
        } else {
          localStorage.removeItem(storageKey);
        }
      } catch (error) {
        console.error("Error saving form draft:", error);
      }
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [formData, storageKey, isEditing, defaultData]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(storageKey);
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, [storageKey]);

  /** Check if there's an active draft in localStorage */
  const hasDraft = useCallback((): boolean => {
    try {
      return !!localStorage.getItem(storageKey);
    } catch {
      return false;
    }
  }, [storageKey]);

  return { clearDraft, hasDraft };
}

/**
 * Utility to check if ANY parte diario draft exists in localStorage.
 * Used by UpdatePrompt to defer PWA updates.
 */
export function hasAnyParteDiarioDraft(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(DRAFT_KEY_PREFIX)) {
        return true;
      }
    }
  } catch {
    // ignore
  }
  return false;
}
