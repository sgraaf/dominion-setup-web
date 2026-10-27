// The JSON that py/bridge.py returns, made by `Game.to_dict` and `Pile.to_dict`
// in dominion-setup.

export interface CardCost {
  coins?: number;
  potion?: boolean;
  debt?: number;
  extra?: "+" | "*";
}

/** A card, with the marks and size of its pile (if any). */
export interface Card {
  name: string;
  cost: CardCost;
  types: string[];
  /** What the card is for in the game, e.g. "Kingdom Pile" or "Landscape". */
  purpose: string;
  /** The set, with the edition if the card is only in one, e.g. "Base, 2E". */
  set: string;
  marks: string[];
  size: number | null;
  /** The file name of the card's image on the Dominion Strategy wiki. */
  image: string;
  instructions: string;
}

/** A setup step, labelled with what it is for: a card (e.g. "Arena") or "Starting decks". */
export interface SetupInstruction {
  label: string;
  text: string;
}

export interface Game {
  /** The Board code: the query string of the game's link, which sets it up again. */
  code: string;
  players: number | null;
  sets: string[];
  kingdom: Card[];
  landscapes: Card[];
  ally: Card | null;
  prophecy: Card | null;
  druid_boons: Card[];
  non_supply: Card[];
  black_market: Card[];
  basic_supply: Card[];
  materials: string[];
  setup: SetupInstruction[];
}

export interface SetEdition {
  /** The `--set` choice of `dominion-setup generate`, e.g. "base_2e". */
  key: string;
  name: string;
  /** The edition, for the sets that have two. */
  edition: number | null;
  kingdom_card_count: number;
}

export interface Catalog {
  version: string;
  sets: SetEdition[];
  /** The Kingdom cards and Landscapes that can be included or excluded. */
  cards: (Card & { promo: boolean })[];
}

export const REQUIREMENTS = {
  actions: "+Actions",
  cards: "+Cards",
  buys: "+Buys",
  attack: "Attack",
  reaction: "Reaction",
  trashing: "Trashing",
} as const;

export type Requirement = keyof typeof REQUIREMENTS;

export const SORT_ORDERS = {
  cost: "Cost",
  name: "Name",
  set: "Set",
} as const;

export type SortOrder = keyof typeof SORT_ORDERS;

/** The options of `dominion-setup generate`, keyed by `generate_game`'s parameters. */
export interface Options {
  sets: string[];
  promos: string[];
  players: number | null;
  max_landscapes: number;
  use_colony: boolean | null;
  use_shelters: boolean | null;
  requirements: Requirement[];
  include: string[];
  exclude: string[];
  black_market_size: number;
  sort_order: SortOrder;
}

/** The options of `dominion-setup setup`, for what a Board code leaves out, and its swaps. */
export interface SetUpOptions extends Pick<
  Options,
  "sets" | "promos" | "exclude" | "players" | "sort_order"
> {
  /** `(card, replacement)` pairs, in order; a `null` replacement is drawn at random. */
  swaps: [string, string | null][];
}

/** The options the user last chose, other than the collection. */
export type Preferences = Omit<Options, "sets" | "promos">;

export const DEFAULT_PREFERENCES: Preferences = {
  players: null,
  max_landscapes: 2,
  use_colony: null,
  use_shelters: null,
  requirements: [],
  include: [],
  exclude: [],
  black_market_size: 15,
  sort_order: "cost",
};

export type GenerateResult = { game: Game } | { error: string };
