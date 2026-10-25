import type { Card, Catalog, Game, Options, SortOrder } from "./types";

/**
 * The URL of a card's image, made by scripts/fetch_images.py from the wiki's
 * file name (e.g. "Catapult/Rocks.jpg" → "cards/Catapult_Rocks-320.webp").
 */
export function imageUrl(image: string, width: 320 | 640): string {
  const stem = image.replace(/\.[^.]+$/, "").replace(/[^A-Za-z0-9-]/g, "_");
  return `${import.meta.env.BASE_URL}cards/${stem}-${width}.webp`;
}

/**
 * The URL of a set's icon, made by scripts/fetch_images.py. Cards of a second
 * edition have the set's icon, and cards only in a first edition its old one
 * (e.g. "Seaside, 2E" → "cards/icons/Seaside.webp", "Base, 1E" → "cards/icons/Base-1E.webp").
 */
export function setIconUrl(set: string): string {
  const stem = set
    .replace(", 2E", "")
    .replace(", 1E", "-1E")
    .replace(/[^A-Za-z0-9-]+/g, "_");
  return `${import.meta.env.BASE_URL}cards/icons/${stem}.webp`;
}

/**
 * The URL of a mat's or token's image, made by scripts/fetch_images.py
 * (e.g. "+1 Card token" → "cards/materials/1_Card_token.webp").
 */
export function materialUrl(material: string): string {
  const stem = material.replace(/[^A-Za-z0-9-]+/g, "_").replace(/^_+|_+$/g, "");
  return `${import.meta.env.BASE_URL}cards/materials/${stem}.webp`;
}

/**
 * The URL of a card's article on the Dominion Strategy Wiki
 * (e.g. "Way of the Mouse" → ".../index.php/Way_of_the_Mouse"). Split piles like
 * "Catapult/Rocks" have their own article. The Zombies, shown as one card, link to "Zombie".
 */
export function wikiUrl(name: string): string {
  const title = (name === "Zombies" ? "Zombie" : name).replaceAll(" ", "_");
  return `https://wiki.dominionstrategy.com/index.php/${title.split("/").map(encodeURIComponent).join("/")}`;
}

/**
 * The names of the Kingdom (with the Bane and other extra piles), the Landscapes, the Ally and
 * the Prophecy, joined by ", ", as `dominion-setup generate --format names` prints them.
 */
export function cardNames(game: Game): string {
  const cards = [...game.kingdom, ...game.landscapes, game.ally, game.prophecy];
  return cards.flatMap((card) => card?.name ?? []).join(", ");
}

/** Whether *card* can be swapped: a Kingdom card, extra pile (e.g. the Bane) or Landscape of *game*. */
export function isSwappable(game: Game, card: Card): boolean {
  const isIn = (cards: Card[]) => cards.some((other) => other.name === card.name);
  return (
    isIn(game.kingdom) ||
    isIn(game.landscapes) ||
    (isIn(game.non_supply) && card.purpose === "Kingdom Pile")
  );
}

/** The *cards* that *card* can be swapped for: those of its kind (Kingdom card or Landscape) not in *game*. */
export function swapReplacements(cards: Card[], game: Game, card: Card): Card[] {
  const inGame = new Set(
    [...game.kingdom, ...game.landscapes, ...game.non_supply, game.prophecy].flatMap(
      (other) => other?.name ?? [],
    ),
  );
  return cards.filter(
    (other) => !inGame.has(other.name) && isLandscape(other) === isLandscape(card),
  );
}

/** The catalog's cards that a game is dealt from: those in its sets and Promos that are not excluded. */
export function cardPool(
  catalog: Catalog,
  { sets, promos, exclude }: Pick<Options, "sets" | "promos" | "exclude">,
): Card[] {
  // each set's cards are in both editions (e.g. "Base") or only in this one (e.g. "Base, 2E")
  const setNames = new Set(
    catalog.sets
      .filter((set) => sets.includes(set.key))
      .flatMap((set) => (set.edition ? [set.name, `${set.name}, ${set.edition}E`] : [set.name])),
  );
  return catalog.cards.filter(
    (card) =>
      (setNames.has(card.set) || promos.includes(card.name)) && !exclude.includes(card.name),
  );
}

/** The *cards* with *query* in their name, whatever the case. */
export function searchCards<T extends Card>(cards: T[], query: string): T[] {
  const needle = query.trim().toLowerCase();
  return cards.filter((card) => card.name.toLowerCase().includes(needle));
}

/**
 * Sort *cards* as dominion-setup sorts the Kingdom, with the sets in the order of *setOrder*. But
 * a cost with a + or * comes after the same cost without, so that `groupKingdom` groups each.
 */
export function sortCards<T extends Card>(
  cards: T[],
  sortOrder: SortOrder,
  setOrder: string[],
): T[] {
  const cost = ({ cost }: Card) => [
    cost.coins ?? 0,
    cost.potion ? 1 : 0,
    cost.debt ?? 0,
    cost.extra ?? "",
  ];
  const key = (card: Card): (number | string)[] => {
    if (sortOrder === "name") return [card.name];
    if (sortOrder === "set") return [setOrder.indexOf(setName(card.set)), ...cost(card), card.name];
    return [...cost(card), card.name];
  };
  return cards.toSorted((a, b) => {
    const [keyA, keyB] = [key(a), key(b)];
    const i = keyA.findIndex((part, j) => part !== keyB[j]);
    return i === -1 ? 0 : keyA[i]! < keyB[i]! ? -1 : 1;
  });
}

/** The set's name without the edition, e.g. "Base" for "Base, 2E". */
export function setName(set: string): string {
  return set.replace(/, \dE$/, "");
}

// the types printed sideways, like the Landscapes
const SIDEWAYS_TYPES = ["Boon", "Hex", "State", "Artifact"];

export function isLandscape(card: Card): boolean {
  return card.purpose === "Landscape" || card.types.some((type) => SIDEWAYS_TYPES.includes(type));
}

/** The images of the cards shown together as one, keyed by the name they are shown under. */
export const COMPOSITE_IMAGES: Record<string, string[]> = {
  Shelters: ["Hovel.jpg", "Necropolis.jpg", "Overgrown Estate.jpg"],
  Zombies: ["Zombie Apprentice.jpg", "Zombie Mason.jpg", "Zombie Spy.jpg"],
};

/** Put the Zombies (if any) together as one card, "Zombies", where the first of them was. */
export function mergeZombies(cards: Card[]): Card[] {
  const zombies = cards.filter((card) => card.types.includes("Zombie"));
  const [first] = zombies;
  if (!first) return cards;
  const merged: Card = {
    ...first,
    name: "Zombies",
    instructions: zombies.map((card) => `${card.name}: ${card.instructions}`).join("\n\n"),
  };
  return cards.flatMap((card) => (card === first ? [merged] : zombies.includes(card) ? [] : card));
}

/** Whether a pile's mark is a Trait's (e.g. "Rich (Trait)"), rather than e.g. "Bane". */
export function isTraitMark(mark: string): boolean {
  return mark.endsWith(" (Trait)");
}

/** Cards next to each other in the Kingdom that cost the same, or are from the same set. */
export interface CardGroup {
  /** The cost (as `formatCost` formats it) or the set's name, or "" when the Kingdom is sorted by name. */
  key: string;
  cards: Card[];
}

/** Group the Kingdom, as sorted by *sortOrder*, by cost or by set (but not by name). */
export function groupKingdom(cards: Card[], sortOrder: SortOrder): CardGroup[] {
  if (sortOrder === "name") return [{ key: "", cards }];
  const groups: CardGroup[] = [];
  for (const card of cards) {
    const key = sortOrder === "cost" ? formatCost(card) : setName(card.set);
    const last = groups.at(-1);
    if (last?.key === key) last.cards.push(card);
    else groups.push({ key, cards: [card] });
  }
  return groups;
}

// the colours of the cards' frames, for the tiles shown instead of images
const TYPE_COLORS: Record<string, string> = {
  Action: "#e9e0cf",
  Treasure: "#e2bf4f",
  Victory: "#8dbb64",
  Curse: "#9a6ab0",
  Reaction: "#6d9dd3",
  Duration: "#e58f3b",
  Reserve: "#c7ab7b",
  Night: "#3d3a48",
  Ruins: "#8a5a3c",
  Shelter: "#c66d5b",
  Event: "#b4b0a8",
  Landmark: "#6fa57c",
  Project: "#e3a59e",
  Way: "#a9cfe3",
  Ally: "#e6d3a3",
  Trait: "#b9a2d1",
  Boon: "#f0d36c",
  Hex: "#86699f",
  State: "#d8d2c4",
  Artifact: "#c6a26a",
  Prophecy: "#97bcd8",
};

/** A CSS background for a card's tile, split between its first two coloured types. */
export function tileBackground(card: Card): string {
  const colors = card.types.flatMap((type) => TYPE_COLORS[type] ?? []);
  const [first = TYPE_COLORS.Action, second = first] = colors;
  return `linear-gradient(135deg, ${first} 0 50%, ${second} 50% 100%)`;
}

/** Whether a tile in this background needs light text. */
export function isDark(card: Card): boolean {
  return card.types.includes("Night") || card.types.includes("Hex") || card.types.includes("Ruins");
}

/** Format a cost as dominion-setup does, e.g. "$3", "$2P", "8D". */
export function formatCost(card: Card): string {
  const { coins, potion, debt, extra } = card.cost;
  return `${coins === undefined ? "" : `$${coins}`}${potion ? "P" : ""}${debt ? `${debt}D` : ""}${extra ?? ""}`;
}
