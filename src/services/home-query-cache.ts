import { getUserScopedKey } from "@/services/userScopedStorage";
import { logger } from "@/utils/logger";
import {
  dehydrate,
  hydrate,
  QueryClient,
  QueryKey,
} from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";

const HOME_QUERY_CACHE_NAMESPACE = "@progressify_home_query_cache";
const HOME_QUERY_CACHE_VERSION = 1;
const HOME_QUERY_CACHE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type PersistedHomeQueryCache = {
  version: number;
  savedAt: number;
  state: ReturnType<typeof dehydrate>;
};

const isHomeQuery = (queryKey: QueryKey) => {
  const [domain, resource] = queryKey;
  return domain === "nutrition-profile" ||
    domain === "diary-summary" ||
    domain === "profile" ||
    (domain === "gym" && resource === "dashboard");
};

export const restoreHomeQueryCache = async (queryClient: QueryClient) => {
  try {
    const key = await getUserScopedKey(HOME_QUERY_CACHE_NAMESPACE);
    if (!key) return;

    const raw = await AsyncStorage.getItem(key);
    if (!raw) return;

    const cached = JSON.parse(raw) as PersistedHomeQueryCache;
    const expired = Date.now() - cached.savedAt > HOME_QUERY_CACHE_MAX_AGE_MS;
    if (cached.version !== HOME_QUERY_CACHE_VERSION || expired) {
      await AsyncStorage.removeItem(key);
      return;
    }
    hydrate(queryClient, cached.state);
  } catch {
    logger.warn("home_query_cache_restore_failed");
  }
};

export const persistHomeQueryCache = async (queryClient: QueryClient) => {
  try {
    const key = await getUserScopedKey(HOME_QUERY_CACHE_NAMESPACE);
    if (!key) return;

    const payload: PersistedHomeQueryCache = {
      version: HOME_QUERY_CACHE_VERSION,
      savedAt: Date.now(),
      state: dehydrate(queryClient, {
        shouldDehydrateQuery: (query) =>
          query.state.status === "success" && isHomeQuery(query.queryKey),
      }),
    };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch {
    logger.warn("home_query_cache_persist_failed");
  }
};
