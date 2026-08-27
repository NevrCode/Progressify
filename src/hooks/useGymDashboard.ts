import {
  getExerciseProgressionPage,
  getGymDashboard,
} from "@/services/gymService";
import { useQuery } from "@tanstack/react-query";

export const useGymDashboard = () => {
  return useQuery({
    queryKey: ["gym", "dashboard"],
    queryFn: getGymDashboard,
  });
};

export const useExerciseProgressionPage = ({
  page,
  limit,
  search,
}: {
  page: number;
  limit: number;
  search?: string;
}) =>
  useQuery({
    queryKey: ["gym", "exercise-progressions", { page, limit, search }],
    queryFn: () => getExerciseProgressionPage({ page, limit, search }),
  });
