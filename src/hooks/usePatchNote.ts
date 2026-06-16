import { CHANGELOG, LATEST_VERSION } from "@/data/changeLog";
import * as SecureStore from "expo-secure-store";
import { useCallback, useEffect, useState } from "react";

const SEEN_VERSION_KEY = "last_seen_patch_version";

export const usePatchNotes = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [seenVersion, setSeenVersion] = useState<string | null>(null);

  // On mount — check if user has seen the latest version
  useEffect(() => {
    (async () => {
      const seen = await SecureStore.getItemAsync(SEEN_VERSION_KEY);
      setSeenVersion(seen);
      if (seen !== LATEST_VERSION) {
        setShowPopup(true);
      }
      setIsReady(true);
    })();
  }, []);

  // Called when user dismisses popup — marks version as seen
  const markAsSeen = useCallback(async () => {
    await SecureStore.setItemAsync(SEEN_VERSION_KEY, LATEST_VERSION);
    setSeenVersion(LATEST_VERSION);
    setShowPopup(false);
  }, []);

  const latestPatch = CHANGELOG[0];

  const hasUnread = seenVersion !== LATEST_VERSION;

  return {
    showPopup,
    setShowPopup,
    markAsSeen,
    latestPatch,
    hasUnread,
    isReady,
    changelog: CHANGELOG,
  };
};
