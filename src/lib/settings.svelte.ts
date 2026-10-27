import type { RecentGame } from "./recent";
import { DEFAULT_PREFERENCES, type Preferences } from "./types";

/** The sets and Promos the user owns. */
export interface Collection {
  sets: string[];
  promos: string[];
}

/**
 * Keep a value in localStorage, so it survives a reload.
 *
 * Storage can be unavailable (e.g. in a private window), so the value then
 * lives for the session only.
 */
function persisted<T>(key: string, initial: T): { value: T } {
  const box = $state({ value: initial });
  try {
    const stored = localStorage.getItem(key);
    if (stored !== null) box.value = JSON.parse(stored);
  } catch {
    // keep the initial value
  }
  $effect.root(() => {
    $effect(() => {
      const json = JSON.stringify(box.value);
      try {
        localStorage.setItem(key, json);
      } catch {
        // keep the value for the session only
      }
    });
  });
  return box;
}

/** The user's collection, or `null` until they have chosen one. */
export const collection = persisted<Collection | null>("collection", null);

export const preferences = persisted<Preferences>("preferences", DEFAULT_PREFERENCES);

/** The games dealt last, newest first. */
export const recentGames = persisted<RecentGame[]>("recent-boards", []);

/** The games the user saved, newest first. */
export const savedGames = persisted<RecentGame[]>("saved-boards", []);

// the games kept as options and seeds, which a newer card list could deal differently
try {
  localStorage.removeItem("recent-games");
  localStorage.removeItem("saved-games");
} catch {
  // storage is unavailable
}
