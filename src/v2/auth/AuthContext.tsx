import type { Session, User } from "@supabase/supabase-js";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { v2Supabase } from "../supabase";

type Profile = { user_id: string; display_name: string };
type Membership = {
  id: string;
  company_id: string;
  user_id: string;
  personal_id: string | null;
  status: "active" | "suspended";
};

type AuthContextValue = {
  loading: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  membership: Membership | null;
  permissions: Set<string>;
  hasAccess: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [permissions, setPermissions] = useState<Set<string>>(new Set());

  const loadAccess = useCallback(async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession?.user) {
      setProfile(null);
      setMembership(null);
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data: membershipData, error: membershipError } = await v2Supabase
      .from("company_memberships")
      .select("id, company_id, user_id, personal_id, status")
      .eq("user_id", nextSession.user.id)
      .maybeSingle();

    if (membershipError) {
      setMembership(null);
      setProfile(null);
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    const activeMembership = membershipData?.status === "active" ? membershipData as Membership : null;
    setMembership(activeMembership);
    if (!activeMembership) {
      setProfile(null);
      setPermissions(new Set());
      setLoading(false);
      return;
    }

    const [profileResult, permissionResult] = await Promise.all([
      v2Supabase.from("profiles").select("user_id, display_name").eq("user_id", nextSession.user.id).maybeSingle(),
      v2Supabase.schema("api").rpc("current_user_permissions"),
    ]);

    setProfile(profileResult.error ? null : profileResult.data as Profile | null);
    setPermissions(new Set(
      permissionResult.error || !Array.isArray(permissionResult.data)
        ? []
        : permissionResult.data.map((row: { permission_key: string }) => row.permission_key),
    ));
    setLoading(false);
  }, []);

  const refresh = useCallback(async () => {
    const { data } = await v2Supabase.auth.getSession();
    await loadAccess(data.session);
  }, [loadAccess]);

  useEffect(() => {
    let active = true;
    void v2Supabase.auth.getSession().then(({ data }) => {
      if (active) void loadAccess(data.session);
    });
    const { data: listener } = v2Supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) window.setTimeout(() => void loadAccess(nextSession), 0);
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [loadAccess]);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    session,
    user: session?.user ?? null,
    profile,
    membership,
    permissions,
    hasAccess: membership?.status === "active",
    signIn: async (email, password) => {
      const { error } = await v2Supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    signOut: async () => {
      const { error } = await v2Supabase.auth.signOut();
      if (error) throw error;
    },
    refresh,
  }), [loading, membership, permissions, profile, refresh, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
