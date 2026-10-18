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

test("the collection is kept in localStorage", async () => {
  const storage = new Map([["collection", '{"sets":["base_2e"],"promos":[]}']]);
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
  });
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
  });
  const { collection, tick } = await importSettings();
  expect(collection.value).toBeNull();

  collection.value = { sets: ["nocturne"], promos: [] };
  await tick();
  expect(collection.value).toEqual({ sets: ["nocturne"], promos: [] });
});
