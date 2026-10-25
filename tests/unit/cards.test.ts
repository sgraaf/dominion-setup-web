import { describe, expect, test } from "vitest";
import {
  cardNames,
  cardPool,
  groupKingdom,
  isLandscape,
  isSwappable,
  isTraitMark,
  materialUrl,
  mergeZombies,
  searchCards,
  setIconUrl,
  sortCards,
  swapReplacements,
  wikiUrl,
} from "../../src/lib/cards";
import type { Card, CardCost, Catalog, Game, SortOrder } from "../../src/lib/types";

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

describe("cardPool", () => {
  const set = (key: string, name: string, edition: number | null) => ({
    key,
    name,
    edition,
    kingdom_card_count: 0,
  });
  const promo = (name: string) => ({ ...card(name, { coins: 5 }, "Promo"), promo: true });
  const stash = promo("Stash");
  const envoy = promo("Envoy");
  const catalog: Catalog = {
    version: "1.0.0",
    sets: [
      set("base_1e", "Base", 1),
      set("base_2e", "Base", 2),
      set("seaside_1e", "Seaside", 1),
      set("seaside_2e", "Seaside", 2),
      set("prosperity_1e", "Prosperity", 1),
      set("prosperity_2e", "Prosperity", 2),
      set("alchemy", "Alchemy", null),
      set("promo", "Promo", null),
    ],
    cards: [
      { ...cellar, promo: false },
      { ...village, promo: false },
      { ...ambassador, promo: false },
      { ...mint, promo: false },
      { ...card("Vineyard", { coins: 0, potion: true }, "Alchemy"), promo: false },
      stash,
      envoy,
    ],
  };
  const pool = (sets: string[], promos: string[] = [], exclude: string[] = []) =>
    cardPool(catalog, { sets, promos, exclude }).map((card) => card.name);

  test("has the cards of the game's sets, in the edition", () => {
    expect(pool(["base_2e", "seaside_2e", "alchemy"])).toEqual(["Cellar", "Village", "Vineyard"]);
    expect(pool(["base_1e", "seaside_1e"])).toEqual(["Village", "Ambassador"]);
  });

  test("has the game's Promos, or all of them with the Promo set", () => {
    expect(pool(["prosperity_1e"], ["Stash"])).toEqual(["Mint", "Stash"]);
    expect(pool(["promo"])).toEqual(["Stash", "Envoy"]);
  });

  test("leaves out the excluded cards", () => {
    expect(pool(["base_2e"], [], ["Village"])).toEqual(["Cellar"]);
  });
});

test("search the cards by any part of their name, whatever the case", () => {
  const blessedVillage = card("Blessed Village", { coins: 4 }, "Nocturne");
  const villain = card("Villain", { coins: 5 }, "Renaissance");
  const cards = [blessedVillage, cellar, village, villain];
  expect(searchCards(cards, "Vil")).toEqual([blessedVillage, village, villain]);
  expect(searchCards(cards, " VILLAGE ")).toEqual([blessedVillage, village]);
  expect(searchCards(cards, "")).toEqual(cards);
  expect(searchCards(cards, "xyz")).toEqual([]);
});

describe("sortCards", () => {
  const setOrder = [
    "Base",
    "Base",
    "Seaside",
    "Alchemy",
    "Prosperity",
    "Cornucopia & Guilds",
    "Empires",
  ];
  const transmute = card("Transmute", { coins: 0, potion: true }, "Alchemy");
  const engineer = card("Engineer", { debt: 4 }, "Empires");
  const doctor = card("Doctor", { coins: 3, extra: "+" }, "Cornucopia & Guilds");
  const cards = [village, mint, transmute, doctor, cellar, grandMarket, ambassador, engineer];
  const sorted = (sortOrder: SortOrder) =>
    sortCards(cards, sortOrder, setOrder).map((card) => card.name);

  test("sort by cost: coins, then Potion, then Debt, then + or *, then name", () => {
    expect(sorted("cost")).toEqual([
      "Engineer",
      "Transmute",
      "Cellar",
      "Ambassador",
      "Village",
      "Doctor",
      "Mint",
      "Grand Market",
    ]);
  });

  test("sort by name", () => {
    expect(sorted("name")).toEqual([
      "Ambassador",
      "Cellar",
      "Doctor",
      "Engineer",
      "Grand Market",
      "Mint",
      "Transmute",
      "Village",
    ]);
  });

  test("sort by set, in the sets' order, then by cost", () => {
    expect(sorted("set")).toEqual([
      "Cellar",
      "Village",
      "Ambassador",
      "Transmute",
      "Mint",
      "Grand Market",
      "Doctor",
      "Engineer",
    ]);
  });

  test("leave the cards as they were", () => {
    sortCards(cards, "name", setOrder);
    expect(cards[0]).toBe(village);
  });
});
