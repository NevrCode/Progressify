import { useTheme } from "@/context/ThemeContext";
import { useRouter } from "expo-router";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export type LegalSection = { heading: string; body: string };

export function LegalDocument({ title, effectiveDate, sections }: { title: string; effectiveDate: string; sections: LegalSection[] }) {
  const { theme } = useTheme();
  const router = useRouter();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }}>
        <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace("/login")}>
          <Text style={{ color: theme.primary, fontWeight: "700" }}>Back</Text>
        </TouchableOpacity>
        <View style={{ gap: 6 }}>
          <Text style={{ color: theme.textBlack, fontSize: 30, fontWeight: "800" }}>{title}</Text>
          <Text style={{ color: theme.textLight }}>Effective {effectiveDate}</Text>
        </View>
        {sections.map((section) => (
          <View key={section.heading} style={{ gap: 6 }}>
            <Text style={{ color: theme.text, fontSize: 18, fontWeight: "800" }}>{section.heading}</Text>
            <Text style={{ color: theme.textLight, fontSize: 15, lineHeight: 23 }}>{section.body}</Text>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
