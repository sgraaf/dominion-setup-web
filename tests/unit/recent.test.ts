import { expect, test } from "vitest";
import { addRecent, hasGame, removeGame, type RecentGame } from "../../src/lib/recent";

function recent(id: number, dealtAt = id): RecentGame {
  return { code: `players=${id}&kingdom=village,smithy`, dealtAt, kingdom: ["Village", "Smithy"] };
}

test("the newest game comes first", () => {
  expect(addRecent([recent(1), recent(2)], recent(3))).toEqual([recent(3), recent(1), recent(2)]);
});

test("only the last 20 games are kept", () => {
  const games = Array.from({ length: 20 }, (_, i) => recent(i));
  const added = addRecent(games, recent(99));
  expect(added).toHaveLength(20);
  expect(added[0]).toEqual(recent(99));
  expect(added.at(-1)).toEqual(recent(18));
});

test("a game opened again moves to the top", () => {
  const again = recent(1, 10);
  expect(addRecent([recent(2), recent(1)], again)).toEqual([again, recent(2)]);
});

test("a saved game is found by its code", () => {
  expect(hasGame([recent(2), recent(1)], recent(1).code)).toBe(true);
  expect(hasGame([recent(2)], recent(1).code)).toBe(false);
});

test("remove a saved game", () => {
  expect(removeGame([recent(2), recent(1), recent(3)], recent(1).code)).toEqual([
    recent(2),
    recent(3),
  ]);
});
