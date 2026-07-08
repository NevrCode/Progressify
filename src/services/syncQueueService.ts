import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";

const CACHE_PREFIX = "@progressify_cache:";
const SYNC_QUEUE_KEY = "@progressify_sync_queue";

export interface QueuedMutation {
  id: string;
  url: string;
  method: "POST" | "PUT" | "DELETE";
  data: any;
  timestamp: number;
}

const getBaseURL = () => {
  return Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;
};

// ── Caching ──────────────────────────────────────────────────────────────────

export const cacheResponse = async (url: string, data: any): Promise<void> => {
  try {
    const key = `${CACHE_PREFIX}${url}`;
    await AsyncStorage.setItem(key, JSON.stringify(data));
  } catch (error) {
    console.warn("Failed to cache response:", error);
  }
};

export const getCachedResponse = async (url: string): Promise<any | null> => {
  try {
    const key = `${CACHE_PREFIX}${url}`;
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn("Failed to retrieve cached response:", error);
    return null;
  }
};

// ── Mutation Queuing ──────────────────────────────────────────────────────────

export const enqueueMutation = async (
  url: string,
  method: QueuedMutation["method"],
  data: any,
): Promise<void> => {
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    const queue: QueuedMutation[] = raw ? JSON.parse(raw) : [];
    
    // Avoid queueing identical duplicate requests in short succession
    const isDuplicate = queue.some(
      (item) =>
        item.url === url &&
        item.method === method &&
        JSON.stringify(item.data) === JSON.stringify(data),
    );

    if (isDuplicate) return;

    const newMutation: QueuedMutation = {
      id: Math.random().toString(36).substring(2, 9),
      url,
      method,
      data,
      timestamp: Date.now(),
    };

    queue.push(newMutation);
    await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    console.log(`[Offline Sync] Queued ${method} request to ${url}`);
  } catch (error) {
    console.warn("Failed to enqueue mutation:", error);
  }
};

// ── Processing Queue ──────────────────────────────────────────────────────────

let isProcessing = false;

export const processSyncQueue = async (): Promise<void> => {
  if (isProcessing) return;
  
  try {
    const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
    if (!raw) return;

    const queue: QueuedMutation[] = JSON.parse(raw);
    if (queue.length === 0) return;

    isProcessing = true;
    console.log(`[Offline Sync] Processing queue with ${queue.length} items...`);

    const baseURL = getBaseURL();
    const token = await SecureStore.getItemAsync("access_token");

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const client = axios.create({
      baseURL,
      headers,
      timeout: 10000,
    });

    const failedItems: QueuedMutation[] = [];

    for (const item of queue) {
      try {
        console.log(`[Offline Sync] Syncing ${item.method} to ${item.url}...`);
        await client.request({
          url: item.url,
          method: item.method,
          data: item.data,
        });
        console.log(`[Offline Sync] Successfully synced item ${item.id}`);
      } catch (error: any) {
        const isServerDown =
          !error.response ||
          error.code === "ECONNABORTED" ||
          [502, 503, 504].includes(error.response?.status);

        if (isServerDown) {
          console.log("[Offline Sync] Server down or offline, halting queue processing.");
          failedItems.push(...queue.slice(queue.indexOf(item)));
          break;
        } else {
          // If the server rejected it (400, 401, 403, 404, 500), log error but discard to prevent blocking
          console.warn(`[Offline Sync] Server rejected queued mutation ${item.id}:`, error.message);
        }
      }
    }

    if (failedItems.length > 0) {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(failedItems));
    } else {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
      console.log("[Offline Sync] All items synced successfully!");
    }
  } catch (error) {
    console.warn("[Offline Sync] Failed to process sync queue:", error);
  } finally {
    isProcessing = false;
  }
};
