import { getAccount } from "@/services/accountService";
import { useQuery } from "@tanstack/react-query";

export const useAccounts = () => {
  return useQuery({
    queryKey: ["accounts"],
    queryFn: async () => {
      const res = await getAccount();
      return res.data;
    },
    staleTime: 1000 * 60 * 5,
  });
};
