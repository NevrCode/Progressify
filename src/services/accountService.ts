import { api } from "@/utils/api";
interface CreateAccountRequest {
  account_name: string;
  account_type: "BANK" | "CASH" | "E_WALLET" | "INVESTMENT";
  balance: number;
}
export interface PageResponse<T> {
  data: T[];
  total_elements: number;
  total_pages: number;
}
export interface AccountResponse {
  id: number;
  account_name: string;
  account_type: "BANK" | "CASH" | "E_WALLET" | "INVESTMENT";
  balance: number;
}
export const createAccount = async ({
  account_name,
  account_type,
  balance,
}: CreateAccountRequest) => {
  try {
    const response = await api.post("/v1/account", {
      account_name,
      account_type,
      balance,
    });
    const data = response.data;
    return data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "Create account failed");
  }
};

export const getAccount = async () => {
  try {
    const response =
      await api.get<PageResponse<AccountResponse>>("/v1/account");
    const data = response.data;
    return data;
  } catch (error: any) {
    throw new Error(error.response?.data?.message || "read account failed");
  }
};

export const UpdateBalance = async (account: AccountResponse, bal: number) => {
  await api.put(`/v1/account/${account.id}`, {
    account_name: account.account_name,
    balance: bal,
    account_type: account.account_type,
  });
};
