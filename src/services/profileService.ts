import { api } from "@/utils/api";
import * as SecureToken from "expo-secure-store";
interface ProfileResponse {
  name: string;
  email: string;
  profile_picture_url: string;
}

export const getProfile = async () => {
  try {
    const token = await SecureToken.getItemAsync("access_token");
    const res = await api.get<ProfileResponse>("/v1/user/me", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return res;
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
};
