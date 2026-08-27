import type { DiscoveryItem } from "@/services/discoveryService";

export type RankedDiscovery<T> = {
  favorites: T[];
  recent: T[];
  matches: T[];
};

type DiscoveryLike = Pick<DiscoveryItem, "resource_type" | "resource_id">;

export const discoveryIdentity = (item: DiscoveryLike) =>
  `${item.resource_type}:${item.resource_id}`;

/** Orders each section deterministically while giving the earlier section ownership of duplicates. */
export function rankDiscovery<T extends DiscoveryLike>(
  favorites: readonly T[],
  recent: readonly T[],
  matches: readonly T[],
): RankedDiscovery<T> {
  const seen = new Set<string>();
  const takeUnique = (items: readonly T[]) =>
    items.filter((item) => {
      const identity = discoveryIdentity(item);
      if (seen.has(identity)) return false;
      seen.add(identity);
      return true;
    });
  return { favorites: takeUnique(favorites), recent: takeUnique(recent), matches: takeUnique(matches) };
}
