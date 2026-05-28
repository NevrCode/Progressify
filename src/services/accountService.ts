import { api } from "@/utils/api";
import * as SecureStore from "expo-secure-store";
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
    const token = await SecureStore.getItemAsync("access_token");
    console.log("TOKEN:", token);
    const response = await api.post(
      "/v1/account",
      {
        account_name,
        account_type,
        balance,
      },
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    );
    const data = response.data;
    return data;
  } catch (error: any) {
    console.log("ERROR DATA:", error.response?.data);
    console.log("STATUS:", error.response?.status);
    throw new Error(error.response?.data?.message || "Create account failed");
  }
};

export const getAccount = async () => {
  try {
    const token = await SecureStore.getItemAsync("access_token");
    console.log("TOKEN:", token);
    const response = await api.get<PageResponse<AccountResponse>>(
      "/v1/account",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
    const data = response.data;
    return data;
  } catch (error: any) {
    console.log("ERROR DATA:", error.response?.data);
    console.log("STATUS:", error.response?.status);
    throw new Error(error.response?.data?.message || "read account failed");
  }
};

export const UpdateBalance = async (account: AccountResponse, bal: number) => {
  const token = await SecureStore.getItemAsync("access_token");
  console.log(`Bearer ${token}`);
  const res = await api.put(
    `/v1/account/${account.id}`,
    {
      account_name: account.account_name,
      balance: bal,
      account_type: account.account_type,
    },
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    },
  );
};
