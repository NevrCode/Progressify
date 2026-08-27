import type { MeasurementSystem } from "@/utils/measurement-units";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createContext, useContext, type ReactNode } from "react";

const UNIT_PREFERENCE_KEY = ["unit-preference"] as const;

type UnitPreferenceContextValue = {
  measurementSystem: MeasurementSystem;
  isLoading: boolean;
  setMeasurementSystem: (system: MeasurementSystem) => Promise<void>;
};

const UnitPreferenceContext = createContext<UnitPreferenceContextValue>({
  measurementSystem: "METRIC",
  isLoading: false,
  setMeasurementSystem: async () => undefined,
});

export function UnitPreferenceProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const queryClient = useQueryClient();
  const preference = useQuery({
    queryKey: UNIT_PREFERENCE_KEY,
    queryFn: async () => (await import("@/services/unitPreferenceService")).getUnitPreference(),
    enabled,
  });
  const save = useMutation({
    mutationFn: async (system: MeasurementSystem) =>
      (await import("@/services/unitPreferenceService")).saveUnitPreference(system),
    onSuccess: (next) => {
      queryClient.setQueryData(UNIT_PREFERENCE_KEY, next);
    },
  });

  const measurementSystem = preference.data?.measurement_system ?? "METRIC";
  return (
    <UnitPreferenceContext.Provider
      value={{
        measurementSystem,
        isLoading: preference.isLoading,
        setMeasurementSystem: async (system) => {
          if (system === measurementSystem) return;
          await save.mutateAsync(system);
        },
      }}
    >
      {children}
    </UnitPreferenceContext.Provider>
  );
}

export const useUnitPreference = () => useContext(UnitPreferenceContext);
