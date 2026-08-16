"use client";

import { Delete, LayoutGrid, Loader2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useAuth } from "@/lib/auth/context";
import { cn } from "@/lib/utils";

const PIN_LENGTH = 4;

/**
 * Sign-in for a shop floor.
 *
 * An on-screen keypad rather than a text field: this is used standing in an
 * aisle, one-handed, often on a phone. A numeric pad with large targets is
 * faster and more reliable there than a keyboard, and it works the same whether
 * the device has one or not.
 *
 * The account is chosen from a list rather than typed. In a shop everyone knows
 * who is on shift, the roster is short, and typing a username on a phone while
 * holding stock is the slowest part of signing in. The PIN is what
 * authenticates; the username was never the secret.
 */
const ACCOUNTS = [
  { username: "manager", label: "Manager", hint: "Designs shelves" },
  { username: "coordinator", label: "Coordinator", hint: "Assigns restocking" },
  { username: "staff", label: "Staff", hint: "Refills shelves" },
] as const;

export function LoginScreen() {
  const { signIn } = useAuth();
  const [username, setUsername] = useState<string>(ACCOUNTS[0].username);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const submit = useCallback(
    async (candidate: string) => {
      setIsPending(true);
      setError(null);
      try {
        await signIn(username, candidate);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "That did not work.");
        setPin("");
      } finally {
        setIsPending(false);
      }
    },
    [signIn, username],
  );

  // Submit as soon as the PIN is complete: an extra "confirm" tap buys nothing
  // when the length is fixed and known.
  useEffect(() => {
    if (pin.length === PIN_LENGTH && !isPending) void submit(pin);
  }, [pin, isPending, submit]);

  const press = (digit: string) => {
    if (isPending) return;
    setError(null);
    setPin((current) => (current.length >= PIN_LENGTH ? current : current + digit));
  };

  // A physical keyboard should still work — many shops have one at the counter.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (/^[0-9]$/.test(event.key)) press(event.key);
      if (event.key === "Backspace") setPin((c) => c.slice(0, -1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <LayoutGrid className="h-5 w-5" aria-hidden />
          </span>
          <div>
            <h1 className="text-lg font-extrabold leading-tight">ShelfSight AI</h1>
            <p className="text-xs text-muted-foreground">Sign in to continue</p>
          </div>
        </div>

        <div className="rounded-2xl bg-card p-5">
          <p className="text-label mb-2 text-muted-foreground">Who are you?</p>
          <div className="mb-5 grid gap-2">
            {ACCOUNTS.map((account) => (
              <button
                key={account.username}
                type="button"
                onClick={() => {
                  setUsername(account.username);
                  setPin("");
                  setError(null);
                }}
                className={cn(
                  "flex items-center justify-between rounded-xl px-4 py-3 text-left transition-colors",
                  username === account.username
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary hover:bg-accent",
                )}
                aria-pressed={username === account.username}
              >
                <span className="text-sm font-semibold">{account.label}</span>
                <span
                  className={cn(
                    "text-xs",
                    username === account.username
                      ? "opacity-70"
                      : "text-muted-foreground",
                  )}
                >
                  {account.hint}
                </span>
              </button>
            ))}
          </div>

          <p className="text-label mb-2 text-muted-foreground">Enter your PIN</p>
          <div className="mb-4 flex justify-center gap-3" aria-hidden>
            {Array.from({ length: PIN_LENGTH }).map((_, index) => (
              <span
                key={index}
                className={cn(
                  "h-3.5 w-3.5 rounded-full transition-colors",
                  index < pin.length ? "bg-primary" : "bg-secondary",
                )}
              />
            ))}
          </div>
          <label className="sr-only" htmlFor="pin-status">
            PIN
          </label>
          <output id="pin-status" className="sr-only" aria-live="polite">
            {pin.length} of {PIN_LENGTH} digits entered
          </output>

          {error ? (
            <p
              className="mb-3 rounded-xl bg-destructive/10 px-3 py-2 text-center text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
              <KeypadButton key={digit} onClick={() => press(digit)} disabled={isPending}>
                {digit}
              </KeypadButton>
            ))}
            <span />
            <KeypadButton onClick={() => press("0")} disabled={isPending}>
              0
            </KeypadButton>
            <KeypadButton
              onClick={() => setPin((c) => c.slice(0, -1))}
              disabled={isPending || pin.length === 0}
              label="Delete last digit"
            >
              <Delete className="h-5 w-5" aria-hidden />
            </KeypadButton>
          </div>

          {isPending ? (
            <p className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Checking…
            </p>
          ) : null}
        </div>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo PINs — manager <strong>1001</strong>, coordinator <strong>2002</strong>, staff{" "}
          <strong>3003</strong>
        </p>
      </div>
    </div>
  );
}

function KeypadButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      // 60px tall: comfortably above the 44px minimum, because the person
      // pressing it may be holding a crate.
      className="flex h-[60px] items-center justify-center rounded-xl bg-secondary text-xl font-semibold transition-colors hover:bg-accent active:bg-primary active:text-primary-foreground disabled:opacity-40"
    >
      {children}
    </button>
  );
}
