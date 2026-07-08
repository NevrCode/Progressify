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
    let active = true;
    const init = async () => {
      const data = await loadActiveSession();
      if (active) {
        setStoredSession(data);
        setChecking(false);
      }
    };
    void init();
    return () => {
      active = false;
    };
  }, []);

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
