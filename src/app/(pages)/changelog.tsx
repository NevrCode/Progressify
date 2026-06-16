import { gymStyles } from "@/assets/styles/gym.style";
import { useTheme } from "@/context/ThemeContext";
import { CHANGELOG, changeTypeMeta, PatchNote } from "@/data/changeLog";
import { usePatchNotes } from "@/hooks/usePatchNote";
import { MaterialIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function VersionCard({
  patch,
  isLatest,
  defaultExpanded,
}: {
  patch: PatchNote;
  isLatest: boolean;
  defaultExpanded: boolean;
}) {
  const { theme } = useTheme();
  const style = gymStyles(theme);
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <View
      style={[
        style.exerciseCard,
        isLatest && { borderColor: theme.primary, borderWidth: 1.5 },
      ]}
    >
      {/* Version header */}
      <TouchableOpacity
        style={style.exerciseHeader}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.8}
      >
        <View style={{ flex: 1 }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: 2,
            }}
          >
            <Text style={style.exerciseName}>v{patch.version}</Text>
            {isLatest && (
              <View
                style={{
                  backgroundColor: theme.primary,
                  borderRadius: 4,
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                }}
              >
                <Text
                  style={{
                    color: theme.white ?? "#fff",
                    fontSize: 10,
                    fontWeight: "700",
                  }}
                >
                  LATEST
                </Text>
              </View>
            )}
          </View>
          <Text style={style.exerciseMeta}>{patch.title}</Text>
          <Text style={style.exerciseSubMeta}>
            {patch.date} · {patch.changes.length} changes
          </Text>
        </View>
        <MaterialIcons
          name={expanded ? "expand-less" : "expand-more"}
          size={22}
          color={theme.textLight}
        />
      </TouchableOpacity>

      {expanded && (
        <View style={{ marginTop: 12, gap: 8 }}>
          {patch.changes.map((change, i) => {
            const meta = changeTypeMeta[change.type];
            return (
              <View
                key={i}
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: 10,
                  borderRadius: 8,
                  backgroundColor: meta.color + "15",
                }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      style.listMeta,
                      {
                        color: meta.color,
                        fontWeight: "700",
                        fontSize: 11,
                        marginBottom: 2,
                      },
                    ]}
                  >
                    {meta.label.toUpperCase()}
                  </Text>
                  <Text style={style.listTitle}>{change.text}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function ChangelogScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const style = gymStyles(theme);
  const { markAsSeen, hasUnread } = usePatchNotes();

  return (
    <SafeAreaView style={style.safeArea}>
      <ScrollView contentContainerStyle={style.container}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              backgroundColor: theme.card,
              borderWidth: 1,
              borderColor: theme.border,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            <MaterialIcons
              name="arrow-back"
              size={20}
              color={theme.textBlack}
            />
          </TouchableOpacity>
          <Text
            style={{
              color: theme.textBlack,
              fontSize: 18,
              fontWeight: "900",
              marginLeft: 12,
            }}
          >
            Change Logs
          </Text>
        </View>

        {/* Unread banner */}
        {hasUnread && (
          <TouchableOpacity
            style={[
              style.exerciseCard,
              {
                backgroundColor: theme.primary + "20",
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              },
            ]}
            onPress={markAsSeen}
          >
            <MaterialIcons
              name="new-releases"
              size={20}
              color={theme.primary}
            />
            <View style={{ flex: 1 }}>
              <Text style={[style.listTitle, { color: theme.primary }]}>
                New update available!
              </Text>
              <Text style={style.listMeta}>Tap to mark as read</Text>
            </View>
            <MaterialIcons name="check" size={18} color={theme.primary} />
          </TouchableOpacity>
        )}

        {/* Version cards — latest auto-expanded, rest collapsed */}
        {CHANGELOG.map((patch, i) => (
          <VersionCard
            key={patch.version}
            patch={patch}
            isLatest={i === 0}
            defaultExpanded={i === 0}
          />
        ))}

        <View style={{ alignItems: "center", paddingVertical: 16 }}>
          <Text style={[style.listMeta, { fontSize: 11 }]}>
            Progressify — built with ❤️ by nvercode
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
