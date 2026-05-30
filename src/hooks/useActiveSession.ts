import {
    ActiveSessionData,
    clearActiveSession,
    loadActiveSession,
} from "@/services/sessionStorage";
import { useCallback, useEffect, useState } from "react";

export const useActiveSession = () => {
  const [storedSession, setStoredSession] = useState<ActiveSessionData | null>(
    null,
  );
  const [checking, setChecking] = useState(true);

  const refresh = useCallback(async () => {
    setChecking(true);
    const data = await loadActiveSession();
    setStoredSession(data);
    setChecking(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const discard = useCallback(async () => {
    await clearActiveSession();
    setStoredSession(null);
  }, []);

  return {
    storedSession,
    hasActiveSession: storedSession != null,
    checking,
    refresh,
    discard,
  };
};
