"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchSession,
  logoutRemote,
  peekSession,
  type SessionBootstrap,
} from "../lib/config-api";

export function useSession() {
  const router = useRouter();
  const [session, setSession] = useState<SessionBootstrap | null>(() =>
    peekSession(),
  );
  const [ready, setReady] = useState(() => peekSession() !== null);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const next = await fetchSession({ force: true });
      setSession(next);
      setError("");
      return next;
    } catch (caught) {
      setSession(null);
      setError(
        caught instanceof Error ? caught.message : "Sesi tidak dapat dimuat.",
      );
      router.replace("/login");
      return null;
    } finally {
      setReady(true);
    }
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    fetchSession()
      .then((next) => {
        if (cancelled) return;
        setSession(next);
        setError("");
      })
      .catch((caught) => {
        if (cancelled) return;
        setSession(null);
        setError(
          caught instanceof Error
            ? caught.message
            : "Sesi tidak dapat dimuat.",
        );
        router.replace("/login");
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  const logout = useCallback(async () => {
    try {
      await logoutRemote();
    } finally {
      // Keep the current authenticated view mounted until the router swaps it.
      // Clearing local state first would briefly render SessionGate.
      router.replace("/login?loggedOut=1");
    }
  }, [router]);

  return { session, ready, error, refresh, logout };
}
