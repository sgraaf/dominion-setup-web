import { afterEach, beforeEach, expect, test, vi } from "vitest";

beforeEach(() => {
  vi.resetModules();
});

/** Import the settings, with a fresh copy of Svelte's runtime (to await their effects). */
async function importSettings() {
  const { tick } = await import("svelte");
  return { ...(await import("../../src/lib/settings.svelte")), tick };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

/** Stand in for localStorage with *storage*. */
function stubStorage(storage: Map<string, string>) {
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
}

test("the collection is kept in localStorage", async () => {
  const storage = new Map([["collection", '{"sets":["base_2e"],"promos":[]}']]);
  stubStorage(storage);
  const { collection, tick } = await importSettings();
  expect(collection.value).toEqual({ sets: ["base_2e"], promos: [] });

  collection.value = { sets: ["nocturne"], promos: ["Stash"] };
  await tick();
  expect(storage.get("collection")).toBe('{"sets":["nocturne"],"promos":["Stash"]}');
});

test("the collection is kept for the session if localStorage is unavailable", async () => {
  vi.stubGlobal("localStorage", {
    getItem: () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
    setItem: () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
    removeItem: () => {
      throw new DOMException("The operation is insecure.", "SecurityError");
    },
  });
  const { collection, tick } = await importSettings();
  expect(collection.value).toBeNull();

  collection.value = { sets: ["nocturne"], promos: [] };
  await tick();
  expect(collection.value).toEqual({ sets: ["nocturne"], promos: [] });
});

test("the recent and saved games of old versions are removed", async () => {
  const storage = new Map([
    ["recent-games", "[]"],
    ["saved-games", "[]"],
  ]);
  stubStorage(storage);
  await importSettings();
  expect(storage.has("recent-games")).toBe(false);
  expect(storage.has("saved-games")).toBe(false);
});
