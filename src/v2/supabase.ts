// Transitional alias. Keeping one client avoids competing Auth listeners and
// separate browser sessions while v2 data logic is moved into the legacy UI.
export { supabaseV2 as v2Supabase } from "@/integrations/supabase/client";
