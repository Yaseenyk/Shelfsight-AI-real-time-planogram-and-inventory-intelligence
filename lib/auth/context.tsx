"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { API_V1, AUTH_EXPIRED_EVENT, getAuthToken, request, setAuthToken } from "@/lib/api/client";

export type Role = "manager" | "coordinator" | "staff";

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: Role;
}

interface LoginResponse {
  token: string;
  expires_at: string;
  user: AuthUser;
}

interface AuthState {
  user: AuthUser | null;
  /** True until the stored token has been checked against the server. */
  isLoading: boolean;
  signIn: (username: string, pin: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Whether the signed-in role may perform a named action. */
  can: (action: Permission) => boolean;
}

/**
 * Permissions, mirrored from the server.
 *
 * The server is the authority -- every guarded route checks again, and this
 * copy cannot grant anything. It exists only so the interface can hide a
 * control the user would be refused anyway: offering a button that always
 * fails is worse than not offering it.
 */
export type Permission =
  | "shelf:create"
  | "shelf:allocate"
  | "shelf:set_buffer"
  | "restock:assign"
  | "restock:complete"
  | "batch:receive"
  | "sale:scan";

const PERMISSIONS: Record<Permission, Role[]> = {
  "shelf:create": ["manager"],
  "shelf:allocate": ["manager"],
  "shelf:set_buffer": ["manager"],
  "restock:assign": ["manager", "coordinator"],
  "batch:receive": ["manager", "coordinator"],
  "restock:complete": ["manager", "coordinator", "staff"],
  "sale:scan": ["manager", "coordinator", "staff"],
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // A stored token may have expired or been revoked while the tab was closed,
  // so it is verified against the server rather than trusted.
  useEffect(() => {
    let cancelled = false;
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    request<AuthUser>(`${API_V1}/auth/me`)
      .then((me) => {
        if (!cancelled) setUser(me);
      })
      .catch(() => {
        if (!cancelled) setAuthToken(null);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // The client clears the token and announces a 401; this drops the user so the
  // guard shows the login screen without every page handling it.
  useEffect(() => {
    const onExpired = () => setUser(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const signIn = useCallback(async (username: string, pin: string) => {
    const result = await request<LoginResponse>(`${API_V1}/auth/login`, {
      method: "POST",
      body: { username, pin },
    });
    setAuthToken(result.token);
    setUser(result.user);
  }, []);

  const signOut = useCallback(async () => {
    try {
      await request(`${API_V1}/auth/logout`, { method: "POST" });
    } catch {
      // Ending the local session matters more than the server acknowledging it.
    }
    setAuthToken(null);
    setUser(null);
  }, []);

  const can = useCallback(
    (action: Permission) => (user ? PERMISSIONS[action].includes(user.role) : false),
    [user],
  );

  const value = useMemo(
    () => ({ user, isLoading, signIn, signOut, can }),
    [user, isLoading, signIn, signOut, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
