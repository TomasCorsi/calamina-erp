import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

type AppRole = 'admin' | 'capataz' | 'maquinista' | 'ayudante' | 'remitero' | 'contador';

const ROLE_PRIORITY: AppRole[] = ['admin', 'capataz', 'maquinista', 'ayudante', 'remitero', 'contador'];
const pickPrimaryRole = (roles: AppRole[]): AppRole | null => {
  for (const r of ROLE_PRIORITY) if (roles.includes(r)) return r;
  return roles[0] ?? null;
};

interface Profile {
  id: string;
  user_id: string;
  nombre_completo: string;
  telefono: string | null;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  roles: AppRole[];
  loading: boolean;
  signUp: (email: string, password: string, nombreCompleto: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  hasRole: (requiredRole: AppRole | AppRole[]) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(false);
  const role = pickPrimaryRole(roles);

  // Helper: race a promise against a timeout (resolves with null on timeout)
  const raceWithTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T | null> =>
    Promise.race([
      promise,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
    ]);

  const hydrateRolesFromCache = (userId: string) => {
    try {
      const cachedList = localStorage.getItem(`offline_cache_roles_${userId}`);
      if (cachedList) {
        const parsed = JSON.parse(cachedList);
        if (Array.isArray(parsed)) {
          setRoles(parsed as AppRole[]);
          return;
        }
      }
      // Legacy single-role cache
      const cachedRole = localStorage.getItem(`offline_cache_role_${userId}`);
      if (cachedRole) setRoles([cachedRole as AppRole]);
    } catch {}
  };

  const fetchUserData = async (userId: string) => {
    setRoleLoading(true);
    try {
      const [profileResult, rolesResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId),
      ]);

      if (profileResult.error) throw profileResult.error;
      setProfile(profileResult.data);
      if (profileResult.data) {
        try { localStorage.setItem(`offline_cache_profile_${userId}`, JSON.stringify(profileResult.data)); } catch {}
      }

      if (rolesResult.error) throw rolesResult.error;
      const fetchedRoles = (rolesResult.data ?? [])
        .map((r: { role: string }) => r.role as AppRole)
        .filter(Boolean);
      setRoles(fetchedRoles);
      try {
        localStorage.setItem(`offline_cache_roles_${userId}`, JSON.stringify(fetchedRoles));
        const primary = pickPrimaryRole(fetchedRoles);
        if (primary) localStorage.setItem(`offline_cache_role_${userId}`, primary);
      } catch {}
    } catch (error) {
      console.error('Error fetching user data:', error);
      try {
        const cachedProfile = localStorage.getItem(`offline_cache_profile_${userId}`);
        if (cachedProfile) setProfile(JSON.parse(cachedProfile));
        hydrateRolesFromCache(userId);
      } catch {}
    } finally {
      setRoleLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    
    const initializeAuth = async () => {
      try {
        const cachedUserId = (() => {
          try {
            const raw = localStorage.getItem(`sb-euytcvwhrhvtwvppvawd-auth-token`);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed?.user?.id ?? null;
          } catch { return null; }
        })();

        if (cachedUserId && isMounted) {
          try {
            const cp = localStorage.getItem(`offline_cache_profile_${cachedUserId}`);
            if (cp) setProfile(JSON.parse(cp));
            hydrateRolesFromCache(cachedUserId);
          } catch {}
        }

        const sessionResult = await raceWithTimeout(
          supabase.auth.getSession(),
          3000
        );
        
        if (!isMounted) return;
        
        const resolvedSession = sessionResult?.data?.session ?? null;
        
        if (resolvedSession?.user) {
          setSession(resolvedSession);
          setUser(resolvedSession.user);
          await raceWithTimeout(fetchUserData(resolvedSession.user.id), 3000);
        } else if (sessionResult === null && cachedUserId) {
          try {
            const raw = localStorage.getItem(`sb-euytcvwhrhvtwvppvawd-auth-token`);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.user) {
                setUser(parsed.user);
                setSession(parsed);
              }
            }
          } catch {}
        } else {
          setSession(null);
          setUser(null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        if ((event as unknown as string) === 'TOKEN_REFRESHED') {
          setSession(session);
          return;
        }
        
        if (event === 'TOKEN_REFRESHED') {
          console.debug('[Auth] Token refreshed silently');
          setSession(session);
          return;
        }
        
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(() => {
            if (isMounted) {
              fetchUserData(session.user.id);
            }
          }, 0);
        } else {
          setProfile(null);
          setRoles([]);
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string, nombreCompleto: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: {
          nombre_completo: nombreCompleto,
        },
      },
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success('Cuenta creada exitosamente');
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
      throw error;
    }

    toast.success('Sesión iniciada');
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error(error.message);
      throw error;
    }
    setProfile(null);
    setRoles([]);
    toast.success('Sesión cerrada');
  };

  const hasRole = (requiredRole: AppRole | AppRole[]): boolean => {
    if (roles.length === 0) return false;
    if (roles.includes('admin')) return true;
    const required = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    return required.some((r) => roles.includes(r));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        roles,
        loading,
        signUp,
        signIn,
        signOut,
        hasRole,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
