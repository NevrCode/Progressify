import { AppButton } from "@/components/base/app-button";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import { syncStatusPanelStyles as styles } from "@/assets/styles/sync-status-panel.style";
import { getThemeSemantics } from "@/constants/semantic-colors";
import { useAlert } from "@/context/AlertContext";
import { useTheme } from "@/context/ThemeContext";
import { useSyncStatus } from "@/hooks/useSyncStatus";
import {
  discardFailedMutation,
  discardFailedMutations,
  processSyncQueue,
  retryFailedMutation,
  retryFailedMutations,
  type FailedSyncItem,
} from "@/services/syncQueueService";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, View } from "react-native";
import { type Href, useRouter } from "expo-router";

type SyncAction = string | null;

const formatSyncTime = (value: number | null) => {
  if (!value) return "No queued change has synchronized on this device yet.";
  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
};

export function SyncStatusPanel() {
  const router = useRouter();
  const { theme } = useTheme();
  const semantics = getThemeSemantics(theme);
  const { alert } = useAlert();
  const status = useSyncStatus();
  const [action, setAction] = useState<SyncAction>(null);

  const hasFailed = status.failed > 0;
  const hasPending = status.pending > 0;
  const onlyVisibleConflicts =
    status.failedItems.length > 0 &&
    status.failedItems.every(
      (item) => item.errorCategory === "Conflicting server change",
    );
  const color = !status.isOnline
    ? semantics.warning
    : hasFailed
      ? semantics.danger
      : status.isSyncing || hasPending
        ? semantics.info
        : semantics.success;
  const title = !status.isOnline
    ? "Offline"
    : hasFailed
      ? "Action required"
      : status.isSyncing
        ? "Synchronizing"
        : hasPending
          ? "Waiting to synchronize"
          : "Synchronized";
  const message = !status.isOnline
    ? "New supported changes stay in the encrypted device queue until a connection returns."
    : hasFailed
      ? "Some queued changes were not accepted. Retry them or explicitly discard the failed copies."
      : status.isSyncing
        ? "Queued changes are being sent in their original creation order."
        : hasPending
          ? "Changes are saved locally and waiting for the next queue attempt."
          : "There are no pending or failed offline changes on this device.";

  const runAction = async (
    nextAction: Exclude<SyncAction, null>,
    operation: () => Promise<void>,
  ) => {
    setAction(nextAction);
    try {
      await operation();
    } catch {
      alert(
        "Synchronization unavailable",
        "The queue could not be processed right now. Your local changes remain stored.",
      );
    } finally {
      setAction(null);
    }
  };

  const confirmDiscard = () => {
    alert(
      "Discard failed changes?",
      `This removes ${status.failed} failed local ${
        status.failed === 1 ? "change" : "changes"
      } from this device. It cannot be recovered from the synchronization queue.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => void discardFailedMutations(),
        },
      ],
    );
  };

  const confirmDiscardItem = (item: FailedSyncItem) => {
    alert(
      `Discard failed ${item.resource.toLowerCase()} change?`,
      "This removes only this failed local change. It cannot be recovered from the synchronization queue.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => void discardFailedMutation(item.id),
        },
      ],
    );
  };

  return (
    <ShadowGlowCard
      accessibilityLabel={`Data synchronization: ${title}. ${status.pending} pending, ${status.failed} failed.`}
      style={styles.card}
    >
      <View style={styles.heading}>
        <View
          style={[
            styles.icon,
            {
              backgroundColor: color + "14",
              borderColor: color + "30",
            },
          ]}
        >
          <MaterialCommunityIcons
            name={
              !status.isOnline
                ? "cloud-off-outline"
                : hasFailed
                  ? "cloud-alert-outline"
                  : status.isSyncing || hasPending
                    ? "cloud-sync-outline"
                    : "cloud-check-outline"
            }
            size={22}
            color={color}
          />
        </View>
        <View style={styles.headingText}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.textBlack }]}
          >
            Data synchronization
          </Text>
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.status, { color }]}
          >
            {title}
          </Text>
        </View>
      </View>

      <Text selectable style={[styles.message, { color: theme.text }]}>
        {message}
      </Text>

      <View style={styles.metrics}>
        <View
          accessibilityLabel={`${status.pending} pending changes`}
          style={[
            styles.metric,
            {
              backgroundColor: semantics.info + "0D",
              borderColor: semantics.info + "24",
            },
          ]}
        >
          <Text style={[styles.metricLabel, { color: semantics.info }]}>
            Pending
          </Text>
          <Text selectable style={[styles.metricValue, { color: theme.text }]}>
            {status.pending}
          </Text>
        </View>
        <View
          accessibilityLabel={`${status.failed} failed changes`}
          style={[
            styles.metric,
            {
              backgroundColor: semantics.danger + "0D",
              borderColor: semantics.danger + "24",
            },
          ]}
        >
          <Text style={[styles.metricLabel, { color: semantics.danger }]}>
            Failed
          </Text>
          <Text selectable style={[styles.metricValue, { color: theme.text }]}>
            {status.failed}
          </Text>
        </View>
      </View>

      <View
        style={[styles.lastSync, { borderTopColor: theme.border }]}
      >
        <Text style={[styles.lastSyncLabel, { color: theme.textLight }]}>
          Last queued change synchronized
        </Text>
        <Text selectable style={[styles.lastSyncValue, { color: theme.text }]}>
          {formatSyncTime(status.lastSuccessfulSyncAt)}
        </Text>
      </View>

      {hasPending || hasFailed ? (
        <View style={styles.actions}>
          {hasFailed ? (
            onlyVisibleConflicts ? (
              <AppButton
                label="Review conflicts"
                size="compact"
                onPress={() => router.push("/syncDetails" as Href)}
                style={styles.action}
              />
            ) : (
              <AppButton
                label="Retry all"
                size="compact"
                loading={action === "retry" || status.isSyncing}
                disabled={!status.isOnline}
                onPress={() =>
                  void runAction("retry", retryFailedMutations)
                }
                style={styles.action}
              />
            )
          ) : (
            <AppButton
              label="Sync now"
              size="compact"
              loading={action === "sync" || status.isSyncing}
              disabled={!status.isOnline}
              onPress={() => void runAction("sync", processSyncQueue)}
              style={styles.action}
            />
          )}
          {hasFailed ? (
            <AppButton
              label="Discard failed"
              variant="destructive"
              size="compact"
              onPress={confirmDiscard}
              style={styles.action}
            />
          ) : null}
          <AppButton
            label="Sync details"
            variant="secondary"
            size="compact"
            onPress={() => router.push("/syncDetails" as Href)}
            style={styles.action}
          />
        </View>
      ) : null}

      {status.failedItems.length > 0 ? (
        <View
          accessibilityLabel={`${status.failedItems.length} failed synchronization changes`}
          style={[styles.failedList, { borderTopColor: theme.border }]}
        >
          <Text style={[styles.legendTitle, { color: theme.textBlack }]}>
            Failed changes
          </Text>
          {status.failedItems.map((item, index) => {
            const isNext = index === 0;
            const isConflict = item.errorCategory === "Conflicting server change";
            const itemAction = `retry-${item.id}`;
            return (
              <View
                key={item.id}
                accessibilityLabel={`${item.method} ${item.resource}, ${item.errorCategory}, ${item.attemptCount} attempts`}
                style={[
                  styles.failedItem,
                  {
                    backgroundColor: semantics.danger + "08",
                    borderColor: semantics.danger + "20",
                  },
                ]}
              >
                <View style={styles.failedHeading}>
                  <View style={styles.headingText}>
                    <Text
                      style={[styles.failedTitle, { color: theme.textBlack }]}
                    >
                      {item.method} · {item.resource}
                    </Text>
                    <Text
                      selectable
                      style={[styles.failedMeta, { color: theme.textLight }]}
                    >
                      Queued {formatSyncTime(item.queuedAt)} ·{" "}
                      {item.attemptCount}{" "}
                      {item.attemptCount === 1 ? "attempt" : "attempts"}
                    </Text>
                  </View>
                  <MaterialCommunityIcons
                    name="alert-circle-outline"
                    size={18}
                    color={semantics.danger}
                  />
                </View>
                <Text
                  selectable
                  style={[styles.failedReason, { color: semantics.danger }]}
                >
                  {item.errorCategory}
                </Text>
                {isNext ? (
                  <View style={styles.itemActions}>
                    {isConflict ? (
                      <AppButton
                        label="Review conflict"
                        size="compact"
                        onPress={() => router.push("/syncDetails" as Href)}
                        style={styles.action}
                      />
                    ) : (
                      <AppButton
                        label="Retry this"
                        size="compact"
                        loading={action === itemAction}
                        disabled={!status.isOnline || status.isSyncing}
                        onPress={() =>
                          void runAction(itemAction, () =>
                            retryFailedMutation(item.id),
                          )
                        }
                        style={styles.action}
                      />
                    )}
                    <AppButton
                      label="Discard this"
                      variant="destructive"
                      size="compact"
                      onPress={() => confirmDiscardItem(item)}
                      style={styles.action}
                    />
                  </View>
                ) : (
                  <Text style={[styles.queueNote, { color: theme.textLight }]}>
                    Resolve the earlier failed change first to preserve queue
                    order.
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      ) : null}

      <View style={[styles.legend, { borderTopColor: theme.border }]}>
        <Text style={[styles.legendTitle, { color: theme.textBlack }]}>
          What the states mean
        </Text>
        {[
          [
            "Saved locally",
            "Stored in the owner-scoped device queue before upload.",
          ],
          ["Pending", "Waiting for connectivity or the next retry attempt."],
          [
            "Synchronized",
            "Accepted by the server and removed from the device queue.",
          ],
          ["Failed", "Not uploaded and requires retry or explicit discard."],
        ].map(([label, description]) => (
          <View key={label} style={styles.legendRow}>
            <Text style={[styles.legendLabel, { color: theme.text }]}>
              {label}
            </Text>
            <Text style={[styles.legendText, { color: theme.textLight }]}>
              {description}
            </Text>
          </View>
        ))}
      </View>
    </ShadowGlowCard>
  );
}
