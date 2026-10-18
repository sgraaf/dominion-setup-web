import { describe, expect, test } from "vitest";
import { fromSearchParams, toSearchParams } from "../../src/lib/share";
import { DEFAULT_PREFERENCES, type Options } from "../../src/lib/types";

const OPTIONS: Options = {
  ...DEFAULT_PREFERENCES,
  sets: ["base_2e"],
  promos: [],
  swaps: [],
  seed: 42,
};

describe("share links", () => {
  test("leave out the default options", () => {
    expect(toSearchParams(OPTIONS, "2026.3.0").toString()).toBe("set=base_2e&seed=42&v=2026.3.0");
  });

  test.each<Partial<Options>>([
    {},
    { sets: ["base_1e", "seaside_2e", "nocturne"], players: 4 },
    { promos: ["Stash", "Walled Village"], requirements: ["buys", "trashing"] },
    { include: ["Witch", "Architects' Guild"], exclude: ["Chapel"] },
    { use_colony: true, use_shelters: false, max_landscapes: 0 },
    { black_market_size: 5, sort_order: "set", seed: 0 },
    {
      swaps: [
        ["Smithy", null],
        ["Moat", "Village"],
      ],
    },
  ])("round-trip %o", (changes) => {
    const options = { ...OPTIONS, ...changes };
    const params = new URLSearchParams(toSearchParams(options, "2026.3.0").toString());
    expect(fromSearchParams(params)).toEqual({ options, version: "2026.3.0" });
  });

  test("write the swaps like --swap", () => {
    const options: Options = {
      ...OPTIONS,
      swaps: [
        ["Smithy", null],
        ["Moat", "Village"],
      ],
    };
    expect(toSearchParams(options, "2026.4.0").getAll("swap")).toEqual(["Smithy", "Moat=Village"]);
  });

  test("need a seed", () => {
    expect(fromSearchParams(new URLSearchParams("set=base_2e"))).toBeNull();
  });

  test("ignore invalid values", () => {
    const params = new URLSearchParams(
      "seed=7&players=x&colony=maybe&require=magic&sort=price&swap=&swap=Moat=",
    );
    expect(fromSearchParams(params)?.options).toEqual({ ...OPTIONS, sets: [], seed: 7 });
  });
});
