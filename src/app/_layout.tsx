import { ThemeProvider } from "@/context/ThemeContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, View } from "react-native";

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);
  const [authSyncing, setAuthSyncing] = useState(true);
  const [checkedPathname, setCheckedPathname] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const queryClient = useMemo(() => new QueryClient(), []);

  useEffect(() => {
    let isMounted = true;

    const syncAuthState = async () => {
      const currentPathname = pathname;
      setAuthSyncing(true);
      const token = await SecureStore.getItemAsync("access_token");

      if (!isMounted) return;

      setIsAuthenticated(Boolean(token));
      setCheckedPathname(currentPathname);
      setAuthChecked(true);
      setAuthSyncing(false);
    };

    void syncAuthState();

    return () => {
      isMounted = false;
    };
  }, [pathname]);

  useEffect(() => {
    if (!authChecked || authSyncing) return;
    if (checkedPathname !== pathname) return;

    const inAuthFlow = pathname === "/login" || pathname === "/signin";
    const atRoot = pathname === "/";

    if (!isAuthenticated && !inAuthFlow) {
      router.replace("/login");
      return;
    }

    if (isAuthenticated && (inAuthFlow || atRoot)) {
      router.replace("/gymProgression");
    }
  }, [
    authChecked,
    authSyncing,
    checkedPathname,
    isAuthenticated,
    pathname,
    router,
  ]);
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        {authChecked ? (
          <Stack
            screenOptions={{
              headerShown: false,
            }}
          />
        ) : (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              backgroundColor: "#FFFFFF",
            }}
          >
            <ActivityIndicator size="large" color="#4CAF50" />
          </View>
        )}
      </QueryClientProvider>
    </ThemeProvider>
  );
}
