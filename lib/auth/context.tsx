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
  | "scan:run"
  | "catalogue:view"
  | "expiry:watch"
  | "expiry:read"
  | "planogram:view"
  | "insights:view"
  | "freshness:view"
  | "plan:view"
  | "fill:report"
  | "fill:approve";

const ALL: Role[] = ["manager", "coordinator", "staff"];
const DECIDERS: Role[] = ["manager", "coordinator"];

/**
 * Mirrored from `app/services/auth.py`. Keep the two in step.
 *
 * The split follows what each job needs. Staff are on the floor: they fill
 * shelves, check them, and read a date off a packet. Coordinators hand work out
 * and watch what is running short. Managers decide what the shop looks like.
 */
const PERMISSIONS: Record<Permission, Role[]> = {
  // Only a manager changes what a row is sold to: re-allocating it changes
  // what every future scan of that row is judged against.
  "shelf:create": ["manager"],
  "shelf:allocate": ["manager"],
  "shelf:set_buffer": ["manager"],
  "restock:assign": DECIDERS,
  "restock:complete": ALL,
  "scan:run": ALL,
  // Buying and pricing questions.
  "catalogue:view": DECIDERS,
  "expiry:watch": DECIDERS,
  "planogram:view": DECIDERS,
  "insights:view": DECIDERS,
  // Done holding the thing, so everyone gets them.
  "expiry:read": ALL,
  "freshness:view": ALL,
  "plan:view": ALL,
  // Saying "I filled this" is everyone; deciding whether it counts is not.
  "fill:report": ALL,
  "fill:approve": DECIDERS,
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
