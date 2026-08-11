import { PatchNotesPopup } from "@/components/patchNotesPopUp";
import { ShimmerSkeleton } from "@/components/base/shimmer-skeleton";
import { AlertProvider, useAlert } from "@/context/AlertContext";
import { AuthProvider, useAuthState } from "@/context/AuthContext";
import { DiaryProvider } from "@/context/DairyContext";
import { ThemeProvider, useTheme } from "@/context/ThemeContext";
import { UnitPreferenceProvider } from "@/context/UnitPreferenceContext";
import { usePatchNotes } from "@/hooks/usePatchNote";
import {
  bindSyncQueueQueryClient,
  startOfflineSyncLifecycle,
} from "@/services/syncQueueService";
import { shouldRetryApiError } from "@/utils/apiError";
import { relativeLuminance } from "@/utils/color-contrast";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, usePathname, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from "@expo-google-fonts/plus-jakarta-sans";
import { useEffect, useMemo, useRef } from "react";
import { View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });
  const queryClient = useMemo(
    () => new QueryClient({
      defaultOptions: {
        queries: {
          retry: shouldRetryApiError,
          staleTime: 5 * 60 * 1000,
          gcTime: 24 * 60 * 60 * 1000,
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: false,
        },
      },
    }),
    [],
  );
  useEffect(() => startOfflineSyncLifecycle(), []);
  useEffect(() => bindSyncQueueQueryClient(queryClient), [queryClient]);
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AlertProvider>
            <DiaryProvider>
              <QueryClientProvider client={queryClient}>
                <AuthProvider>
                  <AppNavigator fontsLoaded={fontsLoaded} />
                </AuthProvider>
              </QueryClientProvider>
            </DiaryProvider>
          </AlertProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function AppNavigator({ fontsLoaded }: { fontsLoaded: boolean }) {
  const { theme } = useTheme();
  const statusBarStyle =
    relativeLuminance(theme.background) < 0.35 ? "light" : "dark";
  const authState = useAuthState();
  const pathname = usePathname();
  const router = useRouter();
  const { alert } = useAlert();
  const sessionExpiredShown = useRef(false);
  const { showPopup, latestPatch, markAsSeen } = usePatchNotes();

  useEffect(() => {
    if (authState === "initializing") return;

    const credentialRoutes = ["/login", "/signin", "/forgot-password"];
    const publicRoutes = ["/privacy", "/terms", "/delete-account-info"];
    const recoveryRoute = pathname === "/reset-password";
    const authRoutes = [...credentialRoutes, "/reset-password"];
    const inAuthFlow = authRoutes.includes(pathname);
    const isPublicRoute = publicRoutes.includes(pathname);
    const atRoot = pathname === "/";

    if (authState === "session-expired") {
      if (!sessionExpiredShown.current) {
        sessionExpiredShown.current = true;
        alert("Session expired", "Please sign in again to continue.");
      }
      if (!inAuthFlow && !isPublicRoute) router.replace("/login");
      return;
    }

    sessionExpiredShown.current = false;
    if (authState === "anonymous" && !inAuthFlow && !isPublicRoute) {
      router.replace("/login");
    } else if (
      authState === "authenticated" &&
      (credentialRoutes.includes(pathname) || atRoot) &&
      !recoveryRoute
    ) {
      router.replace("/home");
    }
  }, [alert, authState, pathname, router]);

  if (authState === "initializing" || !fontsLoaded) {
    return (
      <>
        <StatusBar style={statusBarStyle} />
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: theme.background,
            gap: 12,
          }}
        >
          <ShimmerSkeleton width={52} height={52} borderRadius={16} />
          <ShimmerSkeleton width={136} height={22} borderRadius={7} />
        </View>
      </>
    );
  }

  return (
    <UnitPreferenceProvider enabled={authState === "authenticated"}>
      <StatusBar style={statusBarStyle} />
      <Stack screenOptions={{ headerShown: false }} />
      <PatchNotesPopup
        visible={showPopup}
        patch={latestPatch}
        onDismiss={markAsSeen}
      />
    </UnitPreferenceProvider>
  );
}
