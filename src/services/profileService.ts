import { api } from "@/utils/api";
interface ProfileResponse {
  name: string;
  email: string;
  profile_picture_url: string;
}

export const getProfile = async () => {
  try {
    const res = await api.get<ProfileResponse>("/v1/user/me");
    return res;
  } catch (error) {
    console.error("Error fetching profile:", error);
    throw error;
  }
};
