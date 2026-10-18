// The games dealt last, to open again (e.g. after "Deal again" by mistake), and the games saved.
// They are kept like share links, so a newer card list may deal another game.

import { toSearchParams } from "./share";
import { DEFAULT_PREFERENCES, type Options } from "./types";

export interface RecentGame {
  options: Options;
  version: string;
  /** When the game was dealt, in milliseconds since the epoch. */
  dealtAt: number;
  /** The names of the Kingdom's cards, to recognise the game by. */
  kingdom: string[];
}

const LIMIT = 20;

/** The game's options and version, other than the sort order. */
function key(game: RecentGame): string {
  const options = { ...game.options, sort_order: DEFAULT_PREFERENCES.sort_order };
  return toSearchParams(options, game.version).toString();
}

/** Whether *games* has *game*, whatever its sort order. */
export function hasGame(games: RecentGame[], game: RecentGame): boolean {
  const gameKey = key(game);
  return games.some((other) => key(other) === gameKey);
}

/** *games* without *game*, whatever its sort order. */
export function removeGame(games: RecentGame[], game: RecentGame): RecentGame[] {
  const gameKey = key(game);
  return games.filter((other) => key(other) !== gameKey);
}

/** Put *game* first in *games*, in place of the same game dealt before, and keep the last 20. */
export function addRecent(games: RecentGame[], game: RecentGame): RecentGame[] {
  return [game, ...removeGame(games, game)].slice(0, LIMIT);
}
