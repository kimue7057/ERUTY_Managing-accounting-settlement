"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { PropsWithChildren } from "react";
import type { Session, User } from "@supabase/supabase-js";

import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";
import type { AuthProfile, AuthRole } from "@/types";
import { getProfileStatus, isManagerOrAdmin } from "@/utils/auth";
import { getUserFacingSupabaseMessage } from "@/utils/userFacingError";

type ProfileRow = {
  id: string;
  email: string | null;
  name: string | null;
  department: string | null;
  position: string | null;
  role: AuthRole | null;
  status: string | null;
  is_active: boolean | null;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: AuthProfile | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  isManager: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<string | null>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const supabaseEnvMissingMessage =
  "Supabase 환경변수가 설정되지 않았습니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY를 확인해주세요.";

function mapProfileRow(row: ProfileRow): AuthProfile {
  const status = getProfileStatus({
    status: row.status,
    is_active: row.is_active,
  });

  return {
    id: row.id,
    email: row.email?.trim() ?? "",
    name: row.name?.trim() ?? "이름 미지정",
    department: row.department?.trim() ?? "",
    position: row.position?.trim() ?? "",
    role: row.role ?? "employee",
    status,
    isActive: status === "active",
  };
}

function isProfileColumnMissingError(error: unknown) {
  if (!error || typeof error !== "object" || !("message" in error)) {
    return false;
  }

  const message = typeof error.message === "string" ? error.message : "";
  return /column .*position|column .*status/i.test(message);
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [isLoading, setIsLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(
    isSupabaseConfigured ? null : supabaseEnvMissingMessage,
  );

  const loadProfile = useCallback(async (targetUserId: string) => {
    const supabase = getSupabaseBrowserClient();
    const { data, error: profileError } = await supabase
      .from("profiles")
      .select("id, email, name, department, position, role, status, is_active")
      .eq("id", targetUserId)
      .maybeSingle();

    if (profileError && !isProfileColumnMissingError(profileError)) {
      throw profileError;
    }

    if (profileError && isProfileColumnMissingError(profileError)) {
      const { data: fallbackData, error: fallbackError } = await supabase
        .from("profiles")
        .select("id, email, name, department, role, is_active")
        .eq("id", targetUserId)
        .maybeSingle();

      if (fallbackError) {
        throw fallbackError;
      }

      if (!fallbackData) {
        throw new Error(
          "로그인한 계정과 연결된 profiles 정보가 없습니다. profiles.id가 auth.users.id와 같은지 확인해주세요.",
        );
      }

      return mapProfileRow({
        ...(fallbackData as Omit<ProfileRow, "position" | "status">),
        position: "",
        status: (fallbackData.is_active ?? true) ? "active" : "inactive",
      });
    }

    if (!data) {
      throw new Error(
        "로그인한 계정과 연결된 profiles 정보가 없습니다. profiles.id가 auth.users.id와 같은지 확인해주세요.",
      );
    }

    return mapProfileRow(data as ProfileRow);
  }, []);

  const applySession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (!nextSession?.user) {
        setProfile(null);
        setError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const nextProfile = await loadProfile(nextSession.user.id);
        setProfile(nextProfile);
      } catch (authError) {
        setProfile(null);
        setError(
          getUserFacingSupabaseMessage(
            authError,
            "로그인 사용자 프로필을 불러오지 못했습니다.",
          ),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [loadProfile],
  );

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      return;
    }

    const supabase = getSupabaseBrowserClient();

    async function initializeAuth() {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (!isMounted) {
          return;
        }

        await applySession(data.session);
      } catch (authError) {
        if (!isMounted) {
          return;
        }

        setSession(null);
        setUser(null);
        setProfile(null);
        setError(
          getUserFacingSupabaseMessage(
            authError,
            "로그인 상태를 확인하지 못했습니다.",
          ),
        );
        setIsLoading(false);
      }
    }

    void initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) {
        return;
      }

      void applySession(nextSession);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [applySession]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!isSupabaseConfigured) {
      return "Supabase 환경변수가 설정되지 않았습니다.";
    }

    setIsLoading(true);
    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      return null;
    } catch (authError) {
      const message = getUserFacingSupabaseMessage(
        authError,
        "로그인에 실패했습니다. 이메일과 비밀번호를 확인해주세요.",
      );
      setError(message);
      setIsLoading(false);
      return message;
    }
  }, []);

  const signOut = useCallback(async () => {
    if (!isSupabaseConfigured) {
      return "Supabase 환경변수가 설정되지 않았습니다.";
    }

    setError(null);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        throw signOutError;
      }

      setSession(null);
      setUser(null);
      setProfile(null);
      return null;
    } catch (authError) {
      const message = getUserFacingSupabaseMessage(
        authError,
        "로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요.",
      );
      setError(message);
      return message;
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const userId = user?.id;

    if (!userId) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextProfile = await loadProfile(userId);
      setProfile(nextProfile);
    } catch (authError) {
      setError(
        getUserFacingSupabaseMessage(
          authError,
          "사용자 정보를 새로고침하지 못했습니다.",
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }, [loadProfile, user]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      session,
      user,
      profile,
      isLoading,
      error,
      isAuthenticated: Boolean(session?.user),
      isManager: isManagerOrAdmin(profile?.role),
      signIn,
      signOut,
      refreshProfile,
    }),
    [error, isLoading, profile, refreshProfile, session, signIn, signOut, user],
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth는 AuthProvider 내부에서만 사용할 수 있습니다.");
  }

  return context;
}
