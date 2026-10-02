import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabaseV2 as supabase } from "@/integrations/supabase/client";

export type AppRole = string;

type Membership = {
  id: string;
  company_id: string;
  user_id: string;
  personal_id: string | null;
  status: "active" | "suspended";
};

type Profile = {
  id: string;
  user_id: string;
  display_name: string;
  nombre_completo: string;
  telefono: null;
  avatar_url: null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  membership: Membership | null;
  role: AppRole | null;
  roles: AppRole[];
  permissions: Set<string>;
  hasAccess: boolean;
  loading: boolean;
  signUp: (email: string, password: string, nombreCompleto: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (requiredRole: AppRole | AppRole[]) => boolean;
  hasPermission: (requiredPermission: string | string[]) => boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const clearAccess = useCallback(() => {
    setProfile(null);
    setMembership(null);
    setRoles([]);
    setPermissions(new Set());
  }, []);

  const loadAccess = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession?.user) {
      clearAccess();
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: membershipData, error: membershipError } = await supabase
      .from("company_memberships")
      .select("id, company_id, user_id, personal_id, status")
      .eq("user_id", nextSession.user.id)
      .maybeSingle();

    if (membershipError || membershipData?.status !== "active") {
      clearAccess();
      setLoading(false);
      return;
    }

    const activeMembership = membershipData as Membership;
    setMembership(activeMembership);
    const [profileResult, permissionResult, roleResult] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name").eq("user_id", nextSession.user.id).maybeSingle(),
      supabase.schema("api").rpc("current_user_permissions"),
      supabase.schema("api").rpc("current_user_roles"),
    ]);

    if (profileResult.data) {
      const displayName = String(profileResult.data.display_name ?? "Usuario");
      setProfile({ id: nextSession.user.id, user_id: nextSession.user.id, display_name: displayName, nombre_completo: displayName, telefono: null, avatar_url: null });
    } else {
      setProfile(null);
    }
    setPermissions(new Set(permissionResult.error || !Array.isArray(permissionResult.data) ? [] : permissionResult.data.map((row: { permission_key: string }) => row.permission_key)));
    setRoles(roleResult.error || !Array.isArray(roleResult.data) ? [] : roleResult.data.map((row: { role_key: string }) => row.role_key));
    setLoading(false);
  }, [clearAccess]);

  const refresh = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    await loadAccess(data.session);
  }, [loadAccess]);

  useEffect(() => {
    let active = true;
    void supabase.auth.getSession().then(({ data }) => { if (active) void loadAccess(data.session); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) window.setTimeout(() => void loadAccess(nextSession), 0);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [loadAccess]);

  const role = roles.includes("admin") ? "admin" : roles[0] ?? null;
  const hasRole = useCallback((requiredRole: AppRole | AppRole[]) => {
    if (roles.includes("admin")) return true;
    const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return required.some((candidate) => roles.includes(candidate));
  }, [roles]);
  const hasPermission = useCallback((requiredPermission: string | string[]) => {
    if (roles.includes("admin")) return true;
    const required = Array.isArray(requiredPermission) ? requiredPermission : [requiredPermission];
    return required.some((candidate) => permissions.has(candidate));
  }, [permissions, roles]);

  const value = useMemo<AuthContextType>(() => ({
    user: session?.user ?? null,
    session,
    profile,
    membership,
    role,
    roles,
    permissions,
    hasAccess: membership?.status === "active",
    loading,
    signUp: async () => {
      const error = new Error("El alta pública está deshabilitada. Se requiere una invitación.");
      toast.error(error.message);
      throw error;
    },
    signIn: async (email, password) => {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { toast.error(error.message); throw error; }
      await loadAccess(data.session);
      toast.success("Sesión iniciada");
    },
    signOut: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) { toast.error(error.message); throw error; }
      clearAccess();
      setSession(null);
      toast.success("Sesión cerrada");
    },
    hasRole,
    hasPermission,
    refresh,
  }), [clearAccess, hasPermission, hasRole, loadAccess, loading, membership, permissions, profile, refresh, role, roles, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
