import { api } from "@/utils/api";

interface LoginRequest {
  email: string;
  password: string;
}
interface SignInRequest {
  name: string;
  email: string;
  password: string;
}

export const login = async ({ email, password }: LoginRequest) => {
  try {
    const response = await api.post("/auth/login", { email, password });
    return response.data;
  } catch (error: any) {
    console.log("ERROR DATA:", error.response?.data);
    console.log("STATUS:", error.response?.status);

    throw new Error(error.response?.data?.message || "Login failed");
  }
};
export const signIn = async ({ name, email, password }: SignInRequest) => {
  try {
    const role = "ROLE_ADMIN";
    const response = await api.post("/auth/register", {
      name,
      email,
      password,
      role,
    });
    return response.data;
  } catch (error: any) {
    console.log("ERROR DATA:", error.response?.data);
    console.log("STATUS:", error.response?.status);

    throw new Error(error.response?.data?.message || "Register failed");
  }
};
