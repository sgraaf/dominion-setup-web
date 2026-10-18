// Share links: the options and seed of a game in the URL's query string, e.g.
// `?set=base_2e&set=seaside_2e&players=4&seed=123456&v=2026.3.0`.
// Options with their default values are left out.

import {
  DEFAULT_PREFERENCES,
  REQUIREMENTS,
  SORT_ORDERS,
  type Options,
  type Requirement,
  type SortOrder,
} from "./types";

const TRISTATE = { on: true, off: false } as const;

export function toSearchParams(options: Options, version: string): URLSearchParams {
  const params = new URLSearchParams();
  for (const key of options.sets) params.append("set", key);
  for (const name of options.promos) params.append("promo", name);
  if (options.players !== null) params.set("players", String(options.players));
  if (options.max_landscapes !== DEFAULT_PREFERENCES.max_landscapes) {
    params.set("landscapes", String(options.max_landscapes));
  }
  if (options.use_colony !== null) params.set("colony", options.use_colony ? "on" : "off");
  if (options.use_shelters !== null) params.set("shelters", options.use_shelters ? "on" : "off");
  for (const requirement of options.requirements) params.append("require", requirement);
  for (const name of options.include) params.append("include", name);
  for (const name of options.exclude) params.append("exclude", name);
  if (options.black_market_size !== DEFAULT_PREFERENCES.black_market_size) {
    params.set("black-market", String(options.black_market_size));
  }
  if (options.sort_order !== DEFAULT_PREFERENCES.sort_order) params.set("sort", options.sort_order);
  for (const [card, replacement] of options.swaps) {
    params.append("swap", replacement === null ? card : `${card}=${replacement}`);
  }
  params.set("seed", String(options.seed));
  params.set("v", version);
  return params;
}

/** Read the options and version from a share link, or `null` if it has no seed. */
export function fromSearchParams(
  params: URLSearchParams,
): { options: Options; version: string | null } | null {
  const seed = Number.parseInt(params.get("seed") ?? "", 10);
  if (Number.isNaN(seed)) return null;

  const int = (key: string, fallback: number) => {
    const value = Number.parseInt(params.get(key) ?? "", 10);
    return Number.isNaN(value) ? fallback : value;
  };
  const tristate = (key: string) => TRISTATE[params.get(key) as keyof typeof TRISTATE] ?? null;
  const players = int("players", 0);
  const sort = params.get("sort") ?? "";
  // like --swap: CARD or CARD=REPLACEMENT
  const swaps = params.getAll("swap").flatMap((value): [string, string | null][] => {
    const i = value.indexOf("=");
    const [card, replacement] = i < 0 ? [value, null] : [value.slice(0, i), value.slice(i + 1)];
    return card && replacement !== "" ? [[card, replacement]] : [];
  });

  return {
    options: {
      sets: params.getAll("set"),
      promos: params.getAll("promo"),
      players: players || null,
      max_landscapes: int("landscapes", DEFAULT_PREFERENCES.max_landscapes),
      use_colony: tristate("colony"),
      use_shelters: tristate("shelters"),
      requirements: params
        .getAll("require")
        .filter((name): name is Requirement => name in REQUIREMENTS),
      include: params.getAll("include"),
      exclude: params.getAll("exclude"),
      black_market_size: int("black-market", DEFAULT_PREFERENCES.black_market_size),
      sort_order: Object.hasOwn(SORT_ORDERS, sort)
        ? (sort as SortOrder)
        : DEFAULT_PREFERENCES.sort_order,
      swaps,
      seed,
    },
    version: params.get("v"),
  };
}
