import {
  getExerciseProgressionPage,
  getGymDashboard,
  SplitType,
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
  split,
  search,
}: {
  page: number;
  limit: number;
  split?: SplitType;
  search?: string;
}) =>
  useQuery({
    queryKey: ["gym", "exercise-progressions", { page, limit, split, search }],
    queryFn: () => getExerciseProgressionPage({ page, limit, split, search }),
  });
