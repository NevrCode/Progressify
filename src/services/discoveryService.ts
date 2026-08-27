import { api } from "@/utils/api";
import { isOfflineQueuedResponse } from "@/utils/offline-response";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export type DiscoveryResourceType = "food" | "exercise";

export type DiscoveryItem = {
  resource_type: DiscoveryResourceType;
  resource_id: string;
  display_name: string;
  subtitle?: string;
  source: "custom" | "external" | "catalog" | "progression" | "unknown";
  serving_id?: string;
  serving_description?: string;
};

export type DiscoveryFeed = {
  favorites: DiscoveryItem[];
  recent: DiscoveryItem[];
};

export type FavoriteInput = Pick<
  DiscoveryItem,
  "resource_type" | "resource_id" | "display_name" | "subtitle" | "serving_id" | "serving_description"
>;

export const discoveryQueryKey = (resourceType: DiscoveryResourceType) =>
  ["discovery", resourceType] as const;

export async function getDiscoveryFeed(resourceType: DiscoveryResourceType) {
  const response = await api.get<DiscoveryFeed>(`/v1/discovery/${resourceType}`);
  return response.data;
}

export async function saveFavorite(input: FavoriteInput) {
  const response = await api.put(
    `/v1/discovery/favorites/${input.resource_type}/${encodeURIComponent(input.resource_id)}`,
    {
      display_name: input.display_name,
      subtitle: input.subtitle ?? "",
      serving_id: input.serving_id ?? "",
      serving_description: input.serving_description ?? "",
    },
  );
  return response.data;
}

export async function removeFavorite(input: Pick<FavoriteInput, "resource_type" | "resource_id">) {
  const response = await api.delete(
    `/v1/discovery/favorites/${input.resource_type}/${encodeURIComponent(input.resource_id)}`,
  );
  return response.data;
}

export function useDiscoveryFeed(resourceType: DiscoveryResourceType) {
  return useQuery({
    queryKey: discoveryQueryKey(resourceType),
    queryFn: () => getDiscoveryFeed(resourceType),
  });
}

export function useToggleDiscoveryFavorite(resourceType: DiscoveryResourceType) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ input, favorite }: { input: FavoriteInput; favorite: boolean }) =>
      favorite ? saveFavorite(input) : removeFavorite(input),
    onMutate: async ({ input, favorite }) => {
      const key = discoveryQueryKey(resourceType);
      await client.cancelQueries({ queryKey: key });
      const previous = client.getQueryData<DiscoveryFeed>(key);
      client.setQueryData<DiscoveryFeed>(key, (current) => {
        if (!current) return current;
        const withoutItem = current.favorites.filter(
          (item) => item.resource_id !== input.resource_id,
        );
        return {
          ...current,
          favorites: favorite
            ? [{ ...input, source: sourceFromResourceID(input.resource_id) }, ...withoutItem]
            : withoutItem,
        };
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      client.setQueryData(discoveryQueryKey(resourceType), context?.previous);
    },
    onSuccess: (result) => {
      // A queued write has no authoritative server state to refetch yet; the
      // optimistic value intentionally remains until the existing sync queue replays it.
      if (!isOfflineQueuedResponse(result)) {
        client.invalidateQueries({ queryKey: discoveryQueryKey(resourceType) });
      }
    },
  });
}

export function sourceFromResourceID(resourceID: string): DiscoveryItem["source"] {
  const prefix = resourceID.split(":", 1)[0];
  return prefix === "custom" || prefix === "external" || prefix === "catalog" || prefix === "progression"
    ? prefix
    : "unknown";
}
