import { getGymDashboard } from "@/services/gymService";
import { useQuery } from "@tanstack/react-query";

export const useGymDashboard = () => {
  return useQuery({
    queryKey: ["gym", "dashboard"],
    queryFn: getGymDashboard,
  });
};
