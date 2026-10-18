import { describe, expect, test } from "vitest";
import {
  cardNames,
  groupKingdom,
  isLandscape,
  isSwappable,
  isTraitMark,
  materialUrl,
  mergeZombies,
  setIconUrl,
  swapReplacements,
  wikiUrl,
} from "../../src/lib/cards";
import type { Card, CardCost, Game } from "../../src/lib/types";

function card(name: string, cost: CardCost, set: string): Card {
  return {
    name,
    cost,
    types: ["Action"],
    purpose: "Kingdom Pile",
    set,
    marks: [],
    size: 10,
    image: `${name}.jpg`,
    instructions: "",
  };
}

const cellar = card("Cellar", { coins: 2 }, "Base, 2E");
const village = card("Village", { coins: 3 }, "Base");
const ambassador = card("Ambassador", { coins: 3 }, "Seaside, 1E");
const mint = card("Mint", { coins: 5 }, "Prosperity");
const grandMarket = card("Grand Market", { coins: 6, extra: "*" }, "Prosperity");

describe("groupKingdom", () => {
  test("group the cards that cost the same", () => {
    const groups = groupKingdom([cellar, ambassador, village, mint, grandMarket], "cost");
    expect(groups).toEqual([
      { key: "$2", cards: [cellar] },
      { key: "$3", cards: [ambassador, village] },
      { key: "$5", cards: [mint] },
      { key: "$6*", cards: [grandMarket] },
    ]);
  });

  test("group the cards from the same set, whatever the edition", () => {
    const groups = groupKingdom([cellar, village, ambassador, mint, grandMarket], "set");
    expect(groups).toEqual([
      { key: "Base", cards: [cellar, village] },
      { key: "Seaside", cards: [ambassador] },
      { key: "Prosperity", cards: [mint, grandMarket] },
    ]);
  });

  test("do not group the cards sorted by name", () => {
    const cards = [ambassador, cellar, grandMarket, mint, village];
    expect(groupKingdom(cards, "name")).toEqual([{ key: "", cards }]);
  });
});

// the same paths as in tests/py/test_fetch_images.py
test.each([
  ["Seaside, 2E", "/cards/icons/Seaside.webp"],
  ["Base, 1E", "/cards/icons/Base-1E.webp"],
  ["Cornucopia & Guilds", "/cards/icons/Cornucopia_Guilds.webp"],
])("the icon of %s is at %s", (set, url) => {
  expect(setIconUrl(set)).toBe(url);
});

test.each([
  ["+1 Card token", "/cards/materials/1_Card_token.webp"],
  ["-1 Coin token", "/cards/materials/-1_Coin_token.webp"],
  ["Coffers / Villagers mat", "/cards/materials/Coffers_Villagers_mat.webp"],
])("the image of %s is at %s", (material, url) => {
  expect(materialUrl(material)).toBe(url);
});

test.each([
  ["Way of the Mouse", "Way_of_the_Mouse"],
  ["Catapult/Rocks", "Catapult/Rocks"],
  ["Will-o'-Wisp", "Will-o'-Wisp"],
  ["Zombies", "Zombie"],
])("the wiki's article on %s is %s", (name, title) => {
  expect(wikiUrl(name)).toBe(`https://wiki.dominionstrategy.com/index.php/${title}`);
});

test.each([
  ["Landscape", ["Event"], true],
  ["Mixed Pile Card", ["Boon"], true],
  ["Status", ["Hex"], true],
  ["Status", ["State"], true],
  ["Status", ["Artifact"], true],
  ["Kingdom Pile", ["Action"], false],
  ["Basic", ["Shelter"], false],
])("a %s card of types %j is sideways: %s", (purpose, types, landscape) => {
  expect(isLandscape({ ...cellar, purpose, types })).toBe(landscape);
});

test("tell a Trait's mark from the others", () => {
  expect(isTraitMark("Rich (Trait)")).toBe(true);
  expect(isTraitMark("Bane")).toBe(false);
});

test("put the Zombies together as one card", () => {
  const zombie = (name: string): Card => ({
    ...card(name, { coins: 3 }, "Nocturne"),
    types: ["Action", "Zombie"],
    instructions: `${name}'s text`,
  });
  const bat = card("Bat", { coins: 2 }, "Nocturne");
  const merged = mergeZombies([zombie("Zombie Apprentice"), zombie("Zombie Mason"), bat]);
  expect(merged.map((card) => card.name)).toEqual(["Zombies", "Bat"]);
  expect(merged[0]!.instructions).toBe(
    "Zombie Apprentice: Zombie Apprentice's text\n\nZombie Mason: Zombie Mason's text",
  );
  expect(mergeZombies([bat])).toEqual([bat]);
});

const game = (overrides: Partial<Game>): Game => ({
  players: null,
  sets: [],
  kingdom: [],
  landscapes: [],
  ally: null,
  prophecy: null,
  druid_boons: [],
  non_supply: [],
  black_market: [],
  basic_supply: [],
  materials: [],
  setup: [],
  ...overrides,
});

describe("cardNames", () => {
  test("lists the Kingdom, the Landscapes, the Ally and the Prophecy, like --format names", () => {
    const names = cardNames(
      game({
        kingdom: [
          card("Young Witch", { coins: 4 }, "Cornucopia"),
          card("Catapult/Rocks", { coins: 3 }, "Empires"),
        ],
        landscapes: [card("Way of the Mouse", { coins: 0 }, "Menagerie")],
        ally: card("Band of Nomads", {}, "Allies"),
        prophecy: card("Approaching Army", {}, "Rising Sun"),
        black_market: [card("Village", { coins: 3 }, "Base")],
      }),
    );
    expect(names).toBe(
      "Young Witch, Catapult/Rocks, Way of the Mouse, Band of Nomads, Approaching Army",
    );
  });

  test("leaves out a missing Ally and Prophecy", () => {
    expect(cardNames(game({ kingdom: [card("Village", { coins: 3 }, "Base")] }))).toBe("Village");
  });
});

describe("swaps", () => {
  const smithy = card("Smithy", { coins: 4 }, "Base");
  const bane = { ...card("Moat", { coins: 2 }, "Base"), marks: ["Bane"] };
  const extra = { ...card("Swamp Shacks", { coins: 4 }, "Rising Sun"), marks: ["Ferryman"] };
  const horse = { ...card("Horse", { coins: 3 }, "Menagerie"), purpose: "Non-Supply" };
  const mouse = { ...card("Way of the Mouse", { coins: 0 }, "Menagerie"), purpose: "Landscape" };
  const prophecy = { ...card("Panic", {}, "Rising Sun"), purpose: "Landscape" };
  const ally = { ...card("Band of Nomads", {}, "Allies"), purpose: "Ally" };
  const market = card("Market", { coins: 5 }, "Base");
  const alms = { ...card("Alms", { coins: 0 }, "Adventures"), purpose: "Landscape" };
  const dealt = game({
    kingdom: [smithy, bane],
    landscapes: [mouse],
    non_supply: [extra, horse],
    prophecy,
    ally,
    black_market: [market],
  });

  test("swap the Kingdom cards, extra piles and Landscapes", () => {
    for (const swappable of [smithy, bane, extra, mouse]) {
      expect(isSwappable(dealt, swappable)).toBe(true);
    }
    for (const other of [horse, prophecy, ally, market]) {
      expect(isSwappable(dealt, other)).toBe(false);
    }
  });

  test("a card is swapped for one of its kind that is not in the game", () => {
    const cards = [smithy, market, village, alms, mouse];
    expect(swapReplacements(cards, dealt, smithy)).toEqual([market, village]);
    expect(swapReplacements(cards, dealt, mouse)).toEqual([alms]);
  });
});
