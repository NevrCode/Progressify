import { gymStyles } from "@/assets/styles/gym.style";
import { ShadowGlowCard } from "@/components/base/ShadowGlowCard";
import {
  ActionStatus,
  type ActionFeedback,
} from "@/components/base/action-status";
import { AppButton } from "@/components/base/app-button";
import { FormField } from "@/components/base/form-field";
import { IconButton } from "@/components/base/icon-button";
import { SelectionCard } from "@/components/base/selection-card";
import { StatePanel } from "@/components/base/state-panel";
import { FoodDiaryInitialSkeleton } from "@/components/nutrition/food-diary-skeletons";
import { NutritionProfileOverview } from "@/components/nutrition/nutrition-profile-overview";
import { useTheme } from "@/context/ThemeContext";
import { useUnitPreference } from "@/context/UnitPreferenceContext";
import {
  useOverrideGoals,
  useSaveNutritionProfile,
} from "@/hooks/useNutrition";
import type {
  ActivityLevel,
  Gender,
  GoalType,
  UserGoalResponse,
  UserProfileResponse,
} from "@/services/nutritionService";
import { toApiError } from "@/utils/apiError";
import { isOfflineQueuedResponse } from "@/utils/offline-response";
import {
  centimetresToFeetAndInches,
  formatMassInput,
  massUnitLabel,
  parseHeightInput,
  parseMassInput,
} from "@/utils/measurement-units";
import { MaterialIcons } from "@expo/vector-icons";
import { useState } from "react";
import { Text, View } from "react-native";

type NutritionProfileEditorProps = {
  goals?: UserGoalResponse;
  isLoading: boolean;
  onEditingChange: (isEditing: boolean) => void;
  onPageFeedback: (feedback: ActionFeedback | null) => void;
  profile?: UserProfileResponse;
};

type ProfileFeedbackSurface = "profile" | "override";
type ProfileFeedback = ActionFeedback & { surface: ProfileFeedbackSurface };

const genderOptions: { value: Gender; label: string }[] = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
];

const activityOptions: { value: ActivityLevel; label: string; desc: string }[] = [
  { value: "SEDENTARY", label: "Sedentary", desc: "Little or no exercise" },
  { value: "LIGHTLY_ACTIVE", label: "Lightly Active", desc: "1–3 days/week" },
  { value: "MODERATELY_ACTIVE", label: "Moderately Active", desc: "3–5 days/week" },
  { value: "VERY_ACTIVE", label: "Very Active", desc: "6–7 days/week" },
  { value: "EXTRA_ACTIVE", label: "Extra Active", desc: "Athlete / physical job" },
];

const goalOptions: { value: GoalType; label: string; desc: string }[] = [
  { value: "CUT", label: "Cut", desc: "Lose fat (−500 kcal)" },
  { value: "MAINTAIN", label: "Maintain", desc: "Stay the same" },
  { value: "BULK", label: "Bulk", desc: "Build muscle (+300 kcal)" },
];

/**
 * Owns nutrition-profile editing and manual-goal override state. The caller only
 * supplies cached profile data plus two screen-level lifecycle notifications.
 */
export function NutritionProfileEditor({
  goals,
  isLoading,
  onEditingChange,
  onPageFeedback,
  profile,
}: NutritionProfileEditorProps) {
  const { theme } = useTheme();
  const { measurementSystem } = useUnitPreference();
  const styles = gymStyles(theme);
  const saveMutation = useSaveNutritionProfile();
  const overrideMutation = useOverrideGoals();
  const [formOpen, setFormOpen] = useState(false);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [feedback, setFeedback] = useState<ProfileFeedback | null>(null);
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [heightFeet, setHeightFeet] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<Gender>("MALE");
  const [activity, setActivity] = useState<ActivityLevel>("MODERATELY_ACTIVE");
  const [goal, setGoal] = useState<GoalType>("MAINTAIN");
  const [oCalories, setOCalories] = useState("");
  const [oProtein, setOProtein] = useState("");
  const [oCarbs, setOCarbs] = useState("");
  const [oFat, setOFat] = useState("");
  const [oFiber, setOFiber] = useState("");
  const [oSodium, setOSodium] = useState("");
  const [oSugar, setOSugar] = useState("");
  const [oCholesterol, setOCholesterol] = useState("");
  const [oPotassium, setOPotassium] = useState("");

  const closeEditor = () => {
    setFormOpen(false);
    setOverrideOpen(false);
    setFeedback(null);
    onEditingChange(false);
  };

  const openForm = () => {
    onPageFeedback(null);
    setFeedback(null);
    setWeight(formatMassInput(profile?.weight_kg, measurementSystem));
    if (measurementSystem === "IMPERIAL" && profile?.height_cm != null) {
      const imperialHeight = centimetresToFeetAndInches(profile.height_cm);
      setHeightFeet(String(imperialHeight.feet));
      setHeightInches(String(imperialHeight.inches));
      setHeight("");
    } else {
      setHeight(profile?.height_cm?.toString() ?? "");
      setHeightFeet("");
      setHeightInches("");
    }
    setAge(profile?.age?.toString() ?? "");
    setGender(profile?.gender ?? "MALE");
    setActivity(profile?.activity_level ?? "MODERATELY_ACTIVE");
    setGoal(profile?.goal_type ?? "MAINTAIN");
    setStep(0);
    setOverrideOpen(false);
    setFormOpen(true);
    onEditingChange(true);
  };

  const openOverride = () => {
    onPageFeedback(null);
    setFeedback(null);
    setOCalories(goals?.calories_goal?.toString() ?? "");
    setOProtein(goals?.protein_goal?.toString() ?? "");
    setOCarbs(goals?.carbs_goal?.toString() ?? "");
    setOFat(goals?.fat_goal?.toString() ?? "");
    setOFiber(goals?.fiber_goal?.toString() ?? "");
    setOSodium(goals?.sodium_goal?.toString() ?? "");
    setOSugar(goals?.sugar_goal?.toString() ?? "");
    setOCholesterol(goals?.cholesterol_goal?.toString() ?? "");
    setOPotassium(goals?.potassium_goal?.toString() ?? "");
    setFormOpen(false);
    setOverrideOpen(true);
    onEditingChange(true);
  };

  const saveProfile = () => {
    const parsedWeight = parseMassInput(weight, measurementSystem);
    const parsedHeight = parseHeightInput(height, measurementSystem, heightFeet, heightInches);
    const parsedAge = parseInt(age, 10);
    if (!parsedWeight || !parsedHeight || !parsedAge) {
      setFeedback({
        surface: "profile",
        status: "error",
        title: "Missing information",
        message: "Fill in weight, height, and age.",
      });
      return;
    }

    setFeedback(null);
    saveMutation.mutate(
      {
        weight_kg: parsedWeight,
        height_cm: parsedHeight,
        age: parsedAge,
        gender,
        activity_level: activity,
        goal_type: goal,
      },
      {
        onSuccess: (result) => {
          if (isOfflineQueuedResponse(result)) {
            setFeedback({
              surface: "profile",
              status: "info",
              title: "Profile saved locally",
              message: "Keep this form available while the profile waits to synchronize.",
            });
            return;
          }
          closeEditor();
          onPageFeedback({
            status: "success",
            title: "Nutrition profile saved",
            message: `Daily goal ${result.calculated_calories.toFixed(0)} kcal · TDEE ${result.calculated_tdee.toFixed(0)} kcal.`,
          });
        },
        onError: (error) =>
          setFeedback({
            surface: "profile",
            status: "error",
            title: "Could not save profile",
            message: toApiError(error).message,
          }),
      },
    );
  };

  const saveOverride = () => {
    const calories = parseFloat(oCalories);
    const protein = parseFloat(oProtein);
    const carbs = parseFloat(oCarbs);
    const fat = parseFloat(oFat);
    if (!calories || !protein || !carbs || !fat) {
      setFeedback({
        surface: "override",
        status: "error",
        title: "Goals required",
        message: "Calories, protein, carbs and fat are required.",
      });
      return;
    }

    setFeedback(null);
    overrideMutation.mutate(
      {
        calories_goal: calories,
        protein_goal: protein,
        carbs_goal: carbs,
        fat_goal: fat,
        fiber_goal: oFiber ? parseFloat(oFiber) : undefined,
        sodium_goal: oSodium ? parseFloat(oSodium) : undefined,
        sugar_goal: oSugar ? parseFloat(oSugar) : undefined,
        cholesterol_goal: oCholesterol ? parseFloat(oCholesterol) : undefined,
        potassium_goal: oPotassium ? parseFloat(oPotassium) : undefined,
      },
      {
        onSuccess: (result) => {
          if (isOfflineQueuedResponse(result)) {
            setFeedback({
              surface: "override",
              status: "info",
              title: "Goals saved locally",
              message: "Keep this form available while the goal changes wait to synchronize.",
            });
            return;
          }
          closeEditor();
          onPageFeedback({
            status: "success",
            title: "Nutrition goals updated",
            message: "Your daily calorie and macro targets are now active.",
          });
        },
        onError: (error) =>
          setFeedback({
            surface: "override",
            status: "error",
            title: "Could not update goals",
            message: toApiError(error).message,
          }),
      },
    );
  };

  if (isLoading) return <FoodDiaryInitialSkeleton />;

  return (
    <>
      {profile ? <NutritionProfileOverview profile={profile} theme={theme} /> : null}

      {formOpen ? (
        <ShadowGlowCard style={{ padding: 16 }}>
          <View style={[styles.sectionHeader, { marginBottom: 12 }]}>
            <Text style={styles.sectionTitle}>
              {step === 0 ? "Step 1 — Your Body" : step === 1 ? "Step 2 — Activity" : "Step 3 — Your Goal"}
            </Text>
            <IconButton
              accessibilityLabel="Close nutrition profile"
              icon={<MaterialIcons name="close" size={20} color={theme.textLight} />}
              onPress={closeEditor}
              size="compact"
              variant="ghost"
            />
          </View>
          {feedback?.surface === "profile" ? <ActionStatus {...feedback} onDismiss={() => setFeedback(null)} /> : null}

          {step === 0 ? (
            <>
              <View style={[styles.chipRow, { marginBottom: 12 }]}>
                {genderOptions.map((option) => (
                  <SelectionCard key={option.value} compact label={option.label} onPress={() => setGender(option.value)} selected={gender === option.value} style={{ flex: 1 }} />
                ))}
              </View>
              <FormField label={`Weight (${massUnitLabel(measurementSystem)})`} placeholder={`Weight (${massUnitLabel(measurementSystem)})`} placeholderTextColor={theme.textLight} keyboardType="decimal-pad" value={weight} onChangeText={setWeight} />
              {measurementSystem === "IMPERIAL" ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <FormField accessibilityLabel="Height in feet" containerStyle={{ flex: 1 }} label="Height (ft)" keyboardType="number-pad" placeholder="ft" placeholderTextColor={theme.textLight} value={heightFeet} onChangeText={setHeightFeet} />
                  <FormField accessibilityLabel="Height in inches" containerStyle={{ flex: 1 }} label="Height (in)" keyboardType="number-pad" placeholder="in" placeholderTextColor={theme.textLight} value={heightInches} onChangeText={setHeightInches} />
                </View>
              ) : (
                <FormField label="Height (cm)" placeholder="Height (cm)" placeholderTextColor={theme.textLight} keyboardType="decimal-pad" value={height} onChangeText={setHeight} />
              )}
              <FormField label="Age" placeholder="Age" placeholderTextColor={theme.textLight} keyboardType="number-pad" value={age} onChangeText={setAge} />
              <AppButton label="Next" onPress={() => setStep(1)} />
            </>
          ) : null}

          {step === 1 ? (
            <>
              {activityOptions.map((option) => <SelectionCard key={option.value} description={option.desc} label={option.label} onPress={() => setActivity(option.value)} selected={activity === option.value} style={{ marginBottom: 8 }} />)}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <AppButton label="Back" onPress={() => setStep(0)} style={{ flex: 1 }} variant="secondary" />
                <AppButton label="Next" onPress={() => setStep(2)} style={{ flex: 2 }} />
              </View>
            </>
          ) : null}

          {step === 2 ? (
            <>
              {goalOptions.map((option) => <SelectionCard key={option.value} description={option.desc} label={option.label} onPress={() => setGoal(option.value)} selected={goal === option.value} style={{ marginBottom: 8 }} />)}
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                <AppButton label="Back" onPress={() => setStep(1)} style={{ flex: 1 }} variant="secondary" />
                <AppButton label="Save Profile" loading={saveMutation.isPending} onPress={saveProfile} style={{ flex: 2 }} />
              </View>
            </>
          ) : null}
        </ShadowGlowCard>
      ) : null}

      {overrideOpen ? (
        <ShadowGlowCard style={{ padding: 16 }}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Override Goals</Text>
            <IconButton accessibilityLabel="Close goal override" icon={<MaterialIcons name="close" size={20} color={theme.textLight} />} onPress={closeEditor} size="compact" variant="ghost" />
          </View>
          {feedback?.surface === "override" ? <ActionStatus {...feedback} onDismiss={() => setFeedback(null)} /> : null}
          <View style={{ flexDirection: "column", gap: 8, marginBottom: 12, marginTop: 12 }}>
            {[
              { label: "Calories (kcal)", value: oCalories, onChangeText: setOCalories },
              { label: "Protein (g)", value: oProtein, onChangeText: setOProtein },
              { label: "Carbs (g)", value: oCarbs, onChangeText: setOCarbs },
              { label: "Fat (g)", value: oFat, onChangeText: setOFat },
            ].map((field) => <FormField key={field.label} label={field.label} placeholder={field.label} placeholderTextColor={theme.textLight} keyboardType="decimal-pad" value={field.value} onChangeText={field.onChangeText} />)}
          </View>
          <AppButton label="Save Goals" onPress={saveOverride} loading={overrideMutation.isPending} />
        </ShadowGlowCard>
      ) : null}

      {!profile && !formOpen && !isLoading ? (
        <StatePanel
          variant="empty"
          title="Set up your nutrition profile"
          message="Add your body profile to receive personalized calorie and macro goals."
          primaryAction={{ label: "Get started", onPress: openForm }}
        />
      ) : null}

      {profile && !formOpen && !overrideOpen ? (
        <ProfileActions onEdit={openForm} onOverride={openOverride} theme={theme} />
      ) : null}
    </>
  );
}

function ProfileActions({ onEdit, onOverride, theme }: { onEdit: () => void; onOverride: () => void; theme: ReturnType<typeof useTheme>["theme"] }) {
  return (
    <View style={{ flexDirection: "row", gap: 8, justifyContent: "flex-end", marginBottom: 8 }}>
      <AppButton label="Edit Profile" onPress={onEdit} size="compact" variant="secondary" />
      <AppButton label="Override" onPress={onOverride} size="compact" variant="secondary" />
    </View>
  );
}
