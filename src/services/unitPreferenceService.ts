import { api } from "@/utils/api";
import type { MeasurementSystem } from "@/utils/measurement-units";

export type UnitPreferenceResponse = {
  measurement_system: MeasurementSystem;
};

export const getUnitPreference = async (): Promise<UnitPreferenceResponse> => {
  const response = await api.get<UnitPreferenceResponse>("/v1/profile/preferences");
  return response.data;
};

export const saveUnitPreference = async (
  measurementSystem: MeasurementSystem,
): Promise<UnitPreferenceResponse> => {
  const response = await api.put<UnitPreferenceResponse>("/v1/profile/preferences", {
    measurement_system: measurementSystem,
  });
  return response.data;
};
