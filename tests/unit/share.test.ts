import { expect, test } from "vitest";
import { isBoardLink } from "../../src/lib/share";

test.each([
  "players=4&kingdom=bridge,clerk&landscapes=baths,way-of-the-mouse&bane=moat&way-of-the-mouse=village",
  // with gaps, to fill up
  "kingdom=young-witch",
])("a Board link: %s", (query) => {
  expect(isBoardLink(new URLSearchParams(query))).toBe(true);
});

test.each(["", "set=base_2e&players=4&seed=42&v=2026.4.0", "fbclid=abc"])(
  "not a Board link: %s",
  (query) => {
    expect(isBoardLink(new URLSearchParams(query))).toBe(false);
  },
);
