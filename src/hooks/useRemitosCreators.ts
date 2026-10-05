import { useEffect, useState } from "react";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";

/**
 * Returns a map of user_id -> nombre_completo for all distinct created_by ids in remitos.
 * Only fetches when `enabled` is true (typically admin/capataz).
 * RLS on profiles allows admin to view all; otherwise returns empty map silently.
 */
export function useRemitosCreators(userIds: string[], enabled: boolean) {
  const [map, setMap] = useState<Record<string, string>>({});

  const key = userIds.slice().sort().join(",");

  useEffect(() => {
    if (!enabled || userIds.length === 0) {
      setMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      if (cancelled) return;
      if (error || !data) {
        setMap({});
        return;
      }
      const m: Record<string, string> = {};
      data.forEach((p: any) => {
        if (p.user_id) m[p.user_id] = p.display_name || "";
      });
      setMap(m);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return map;
}
