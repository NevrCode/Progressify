import { AppButton } from "@/components/base/app-button";
import { PageHeader } from "@/components/base/page-header";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { TabScreenScrollView } from "@/components/base/tab-screen-scroll-view";
import { getThemeSemantics } from "@/constants/semantic-colors";
import { useTheme } from "@/context/ThemeContext";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import {
  discardFailedMutation,
  discardFailedMutations,
  reloadConflictAuthoritativeState,
  retryFailedMutation,
  retryFailedMutations,
  type SyncQueueItem,
} from "@/services/syncQueueService";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatTime = (value: number | null) => value
  ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
  : "Not attempted yet";

const statusDescription = (item: SyncQueueItem) => {
  if (item.blockedByEarlierOperation) {
    return "Blocked until the earlier failed or conflicting change is resolved.";
  }
  if (item.status === "PENDING") return "Saved locally; waiting for the next upload attempt.";
  if (item.status === "SYNCING") return "Sending this change now.";
  if (item.status === "CONFLICT") return "The server changed this resource. Progressify will not merge it automatically.";
  return "The server did not accept this change. Retry or discard it explicitly.";
};

export default function SyncDetails() {
  const router = useRouter();
  const { theme } = useTheme();
  const semantics = getThemeSemantics(theme);
  const status = useSyncStatus();
  const [actionId, setActionId] = useState<string | null>(null);

  const run = async (id: string, operation: () => Promise<void>) => {
    setActionId(id);
    try {
      await operation();
    } finally {
      setActionId(null);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <TabScreenScrollView contentContainerStyle={{ gap: 14, padding: 20 }}>
        <PageHeader eyebrow="Account" title="Sync details" showSyncStatus={false} />
        <Text style={{ color: theme.textLight, fontFamily: "PlusJakartaSans_500Medium", fontSize: 12, lineHeight: 18 }}>
          Changes are sent in order. Resolve the first failed or conflicting change before later changes can upload. Resource labels and conflict revisions are shown, never request bodies or credentials.
        </Text>

        {status.failed > 0 ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <AppButton label="Retry failed" size="compact" disabled={!status.isOnline || status.isSyncing} onPress={() => void run("retry-all", retryFailedMutations)} />
            <AppButton label="Discard blocked" variant="destructive" size="compact" disabled={status.isSyncing} onPress={() => void run("discard-all", discardFailedMutations)} />
          </View>
        ) : null}

        {(status.items ?? []).length === 0 ? (
          <ShadowGlowCard style={{ gap: 8, padding: 16 }}>
            <Text style={{ color: theme.textBlack, fontFamily: "PlusJakartaSans_800ExtraBold" }}>Nothing waiting to sync</Text>
            <Text style={{ color: theme.textLight, fontFamily: "PlusJakartaSans_500Medium", fontSize: 12 }}>Offline changes will appear here until they are accepted or explicitly resolved.</Text>
          </ShadowGlowCard>
        ) : (status.items ?? []).map((item) => {
          const isBlocked = item.blockedByEarlierOperation;
          const actionable = !isBlocked && (item.status === "FAILED" || item.status === "CONFLICT");
          const color = item.status === "CONFLICT" || item.status === "FAILED"
            ? semantics.danger
            : item.status === "SYNCING" ? semantics.info : semantics.warning;
          return (
            <ShadowGlowCard key={item.id} style={{ gap: 10, padding: 14 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={{ color: theme.textBlack, fontFamily: "PlusJakartaSans_800ExtraBold" }}>{item.action} · {item.resource}</Text>
                  <Text style={{ color, fontFamily: "PlusJakartaSans_700Bold", fontSize: 11 }}>{item.status}</Text>
                </View>
              </View>
              <Text style={{ color: theme.text, fontFamily: "PlusJakartaSans_500Medium", fontSize: 12, lineHeight: 18 }}>{statusDescription(item)}</Text>
              <Text selectable style={{ color: theme.textLight, fontFamily: "PlusJakartaSans_500Medium", fontSize: 11, lineHeight: 17 }}>
                Queued {formatTime(item.queuedAt)} · Last attempt {formatTime(item.lastAttemptAt)} · {item.attemptCount} {item.attemptCount === 1 ? "attempt" : "attempts"}
              </Text>
              {item.errorCategory ? <Text style={{ color, fontFamily: "PlusJakartaSans_700Bold", fontSize: 11 }}>{item.errorCategory}</Text> : null}
              {item.conflict ? (
                <View style={{ borderTopColor: theme.border, borderTopWidth: 1, gap: 4, paddingTop: 10 }}>
                  <Text style={{ color: theme.textBlack, fontFamily: "PlusJakartaSans_700Bold", fontSize: 11 }}>Conflict details</Text>
                  <Text style={{ color: theme.textLight, fontFamily: "PlusJakartaSans_500Medium", fontSize: 11, lineHeight: 17 }}>
                    {item.conflict.currentState}{item.conflict.expectedRevision != null ? ` · Your revision ${item.conflict.expectedRevision}` : ""}{item.conflict.currentRevision != null ? ` · Server revision ${item.conflict.currentRevision}` : ""}
                  </Text>
                </View>
              ) : null}
              {actionable ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {item.status === "CONFLICT" ? (
                    <AppButton label="Reload latest" size="compact" loading={actionId === `reload-${item.id}`} disabled={!status.isOnline} onPress={() => void run(`reload-${item.id}`, () => reloadConflictAuthoritativeState(item.id))} />
                  ) : (
                    <AppButton label="Retry" size="compact" loading={actionId === `retry-${item.id}`} disabled={!status.isOnline} onPress={() => void run(`retry-${item.id}`, () => retryFailedMutation(item.id))} />
                  )}
                  <AppButton label="Discard" variant="destructive" size="compact" loading={actionId === `discard-${item.id}`} onPress={() => void run(`discard-${item.id}`, () => discardFailedMutation(item.id))} />
                </View>
              ) : null}
              {item.status === "CONFLICT" && !isBlocked ? <Text style={{ color: theme.textLight, fontFamily: "PlusJakartaSans_500Medium", fontSize: 10, lineHeight: 15 }}>After reloading, make the change again from its original screen. That creates a new semantic mutation with a new idempotency key; this queue never edits or merges the old request.</Text> : null}
            </ShadowGlowCard>
          );
        })}
        <AppButton label="Back to profile" variant="secondary" onPress={() => router.back()} />
      </TabScreenScrollView>
    </SafeAreaView>
  );
}
