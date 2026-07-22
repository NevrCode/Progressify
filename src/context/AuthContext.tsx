import {
  AuthState,
  hasAuthSession,
  subscribeAuthState,
} from "@/services/authSessionService";
import { refreshAuthSession } from "@/services/tokenRefreshService";
import { useQueryClient } from "@tanstack/react-query";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

export type AppAuthState = "initializing" | AuthState;

const AuthContext = createContext<AppAuthState>("initializing");

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [state, setState] = useState<AppAuthState>("initializing");

  useEffect(() => {
    let active = true;

    const unsubscribe = subscribeAuthState((nextState) => {
      if (nextState !== "authenticated") queryClient.clear();
      if (active) setState(nextState);
    });

    const initialize = async () => {
      if (!(await hasAuthSession())) {
        if (active) setState("anonymous");
        return;
      }

      try {
        await refreshAuthSession();
        if (active) setState("authenticated");
      } catch {
        // Authentication rejection emits session-expired. A network outage keeps
        // the owner-scoped offline session available instead of forcing logout.
        if (active && (await hasAuthSession())) setState("authenticated");
      }
    };

    void initialize();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuthState = () => useContext(AuthContext);
