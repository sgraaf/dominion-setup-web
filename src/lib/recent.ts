// The games dealt last, to open again (e.g. after "Deal again" by mistake), and the games saved.
// They are kept as Board codes, so they stay the same games after a new release.

export interface RecentGame {
  /** The Board code, which leaves out the sort order. */
  code: string;
  /** When the game was dealt, in milliseconds since the epoch. */
  dealtAt: number;
  /** The names of the Kingdom's cards, to recognise the game by. */
  kingdom: string[];
}

const LIMIT = 20;

/** Whether *games* has the game of Board *code*. */
export function hasGame(games: RecentGame[], code: string): boolean {
  return games.some((game) => game.code === code);
}

/** *games* without the game of Board *code*. */
export function removeGame(games: RecentGame[], code: string): RecentGame[] {
  return games.filter((game) => game.code !== code);
}

/** Put *game* first in *games*, in place of the same game dealt before, and keep the last 20. */
export function addRecent(games: RecentGame[], game: RecentGame): RecentGame[] {
  return [game, ...removeGame(games, game.code)].slice(0, LIMIT);
}
