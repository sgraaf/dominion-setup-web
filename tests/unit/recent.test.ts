import { expect, test } from "vitest";
import { addRecent, hasGame, removeGame, type RecentGame } from "../../src/lib/recent";
import { DEFAULT_PREFERENCES } from "../../src/lib/types";

function recent(seed: number, dealtAt = seed): RecentGame {
  return {
    options: { ...DEFAULT_PREFERENCES, sets: ["base_2e"], promos: [], swaps: [], seed },
    version: "2026.3.0",
    dealtAt,
    kingdom: ["Village", "Smithy"],
  };
}

test("the newest game comes first", () => {
  expect(addRecent([recent(1), recent(2)], recent(3)).map((game) => game.options.seed)).toEqual([
    3, 1, 2,
  ]);
});

test("only the last 20 games are kept", () => {
  const games = Array.from({ length: 20 }, (_, i) => recent(i));
  const added = addRecent(games, recent(99));
  expect(added).toHaveLength(20);
  expect(added[0].options.seed).toBe(99);
  expect(added.at(-1)?.options.seed).toBe(18);
});

test("a game opened again moves to the top, whatever its sort order", () => {
  const sorted = {
    ...recent(1, 10),
    options: { ...recent(1).options, sort_order: "name" as const },
  };
  const added = addRecent([recent(2), recent(1)], sorted);
  expect(added).toEqual([sorted, recent(2)]);
});

test("the same seed with other options or another version is another game", () => {
  const players = { ...recent(1), options: { ...recent(1).options, players: 3 } };
  const version = { ...recent(1), version: "2026.4.0" };
  expect(addRecent([recent(1)], players)).toHaveLength(2);
  expect(addRecent([recent(1)], version)).toHaveLength(2);
});

test("a saved game is found whatever its sort order", () => {
  const sorted = { ...recent(1), options: { ...recent(1).options, sort_order: "name" as const } };
  expect(hasGame([recent(2), recent(1)], sorted)).toBe(true);
  expect(hasGame([recent(2)], sorted)).toBe(false);
});

test("remove a saved game", () => {
  const sorted = { ...recent(1), options: { ...recent(1).options, sort_order: "name" as const } };
  expect(removeGame([recent(2), recent(1), recent(3)], sorted)).toEqual([recent(2), recent(3)]);
});
