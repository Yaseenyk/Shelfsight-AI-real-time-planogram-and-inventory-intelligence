"use client";

import { Loader2 } from "lucide-react";

import { LoginScreen } from "@/components/auth/login-screen";
import { useAuth } from "@/lib/auth/context";

/**
 * Shows the application only to someone signed in.
 *
 * A client-side gate, and honest about what that is: it decides what to
 * *render*, not what the API will *answer*. Every protected route re-checks the
 * session server-side, so bypassing this in a browser console reveals an empty
 * shell rather than any data.
 *
 * The loading state matters. Verifying a stored token is a round trip, and
 * rendering the login screen during it would flash sign-in at someone who is
 * already signed in on every refresh.
 */
export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading" />
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <>{children}</>;
}
