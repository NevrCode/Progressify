import {
  AuthState,
  hasAuthSession,
  subscribeAuthState,
} from "@/services/authSessionService";
import { refreshAuthSession } from "@/services/tokenRefreshService";
import {
  persistHomeQueryCache,
  restoreHomeQueryCache,
} from "@/services/home-query-cache";
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

      await restoreHomeQueryCache(queryClient);
      if (active) setState("authenticated");

      // Do not block startup on the network. A rejected refresh still emits
      // session-expired; an outage keeps the owner-scoped cached session usable.
      void refreshAuthSession().catch(() => undefined);
    };

    void initialize();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [queryClient]);

  useEffect(() => {
    if (state !== "authenticated") return;

    let persistTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = queryClient.getQueryCache().subscribe(() => {
      if (persistTimer) clearTimeout(persistTimer);
      persistTimer = setTimeout(() => {
        void persistHomeQueryCache(queryClient);
      }, 250);
    });

    return () => {
      unsubscribe();
      if (persistTimer) clearTimeout(persistTimer);
    };
  }, [queryClient, state]);

  return <AuthContext.Provider value={state}>{children}</AuthContext.Provider>;
}

export const useAuthState = () => useContext(AuthContext);
