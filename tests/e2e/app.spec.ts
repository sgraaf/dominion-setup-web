import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/** The names of the cards that `dominion-setup setup --format names` sets up for *code*, with *args*. */
function cliNames(code: string, ...args: string[]): string[] {
  const output = execFileSync(
    "uv",
    ["run", "dominion-setup", "setup", code, "--format", "names", ...args],
    {
      // no config file
      env: { ...process.env, XDG_CONFIG_HOME: mkdtempSync(join(tmpdir(), "dominion-setup-")) },
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    },
  );
  return output.trim().split(", ");
}

/** The names of the cards in the list called *name* (e.g. "Kingdom"). */
function cardNames(page: Page, name: string): Promise<string[]> {
  return page
    .getByRole("list", { name, exact: true })
    .getByRole("button")
    .evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label") ?? ""));
}

/** The names of the Kingdom cards and Landscapes in view, in the order of `cliNames`. */
async function gameNames(page: Page): Promise<string[]> {
  return [...(await cardNames(page, "Kingdom")), ...(await cardNames(page, "Landscapes"))];
}

/** Own *sets* (e.g. "base_2e"), as if chosen on the collection screen. */
async function ownSets(page: Page, ...sets: string[]) {
  await page.addInitScript((sets) => {
    localStorage.setItem("collection", JSON.stringify({ sets, promos: [] }));
  }, sets);
}

const kingdomHeading = (page: Page) => page.getByRole("heading", { name: "Your Kingdom" });

// Board links, as dominion-setup writes them
const BASE =
  "kingdom=artisan,bureaucrat,cellar,chapel,gardens,harbinger,poacher,smithy,throne-room,witch";
const ADVENTURES =
  "players=3&kingdom=artisan,cellar,coin-of-the-realm,council-room,duplicate,hireling,merchant,raze,transmogrify,witch&landscapes=inheritance,lost-arts";
// with Menagerie as the Bane
const YOUNG_WITCH =
  "kingdom=advisor,butcher,candlestick-maker,carnival,farrier,ferryman,plaza,soothsayer,stonemason,young-witch&bane=menagerie&ferryman=farmhands";

test("a Board link sets up the same game as the CLI", async ({ page }) => {
  await page.goto(`/?${ADVENTURES}`);
  await expect(kingdomHeading(page)).toBeVisible();
  expect(await gameNames(page)).toEqual(cliNames(ADVENTURES));
  await expect(page).toHaveURL(`/?${ADVENTURES}`);
});

test("a link with gaps is filled up from your collection", async ({ page }) => {
  await ownSets(page, "cornucopia_guilds_2e");
  await page.goto("/?kingdom=young-witch,baker");
  await expect(kingdomHeading(page)).toBeVisible();
  const names = await cardNames(page, "Kingdom");
  expect(names).toEqual(expect.arrayContaining(["Young Witch", "Baker"]));
  // and the Bane
  expect(names).toHaveLength(11);
  // the URL is replaced with the complete link
  await expect(page).toHaveURL(/&bane=/);
  expect(await gameNames(page)).toEqual(cliNames(page.url()));
});

test("old links with a seed open the home screen", async ({ page }) => {
  await ownSets(page, "base_2e");
  await page.goto("/?set=base_2e&seed=42&v=2026.4.0");
  await expect(page.getByRole("button", { name: "Deal a Kingdom" })).toBeVisible();
  await expect(kingdomHeading(page)).toBeHidden();
});

test("copy the card names, as the CLI prints them", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(`/?${ADVENTURES}`);
  await expect(kingdomHeading(page)).toBeVisible();
  await page.getByRole("button", { name: "Copy card names" }).click();
  await expect(page.getByRole("button", { name: "Names copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(cliNames(ADVENTURES).join(", "));
});

test("deal a Kingdom from your collection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Base, 2nd edition" }).click();
  await page.getByRole("button", { name: "Intrigue, 2nd edition" }).click();
  await page.getByRole("button", { name: "Save collection" }).click();
  await page.getByRole("button", { name: "Deal a Kingdom" }).click();
  await expect(kingdomHeading(page)).toBeVisible();
  await expect(page).toHaveURL(/\?kingdom=/);
  const names = await cardNames(page, "Kingdom");
  expect(names.length).toBeGreaterThanOrEqual(10);
  // the URL is the game's link
  expect(await gameNames(page)).toEqual(cliNames(page.url()));

  // the URL keeps the game, and the collection is remembered
  await page.reload();
  await expect(kingdomHeading(page)).toBeVisible();
  expect(await cardNames(page, "Kingdom")).toEqual(names);
  await page.getByRole("button", { name: "Options" }).click();
  await expect(page.getByRole("list", { name: "Your sets" }).getByRole("listitem")).toHaveText([
    "Base",
    "Intrigue",
    "Change sets",
  ]);
});

test("open a recent game again, after a reload", async ({ page }) => {
  await ownSets(page, "base_2e");
  await page.goto(`/?${ADVENTURES}`);
  await expect(kingdomHeading(page)).toBeVisible();
  const names = await cardNames(page, "Kingdom");
  await page.getByRole("button", { name: "Deal again" }).click();
  await expect(page).not.toHaveURL(`/?${ADVENTURES}`);
  await page.getByRole("button", { name: "Options" }).click();

  await page.reload();
  const recent = page.getByRole("list", { name: "Recent games" }).getByRole("button");
  await expect(recent).toHaveCount(2);
  await expect(recent.nth(1)).toContainText(names.join(", "));
  await recent.nth(1).click();
  await expect(kingdomHeading(page)).toBeVisible();
  await expect(page).toHaveURL(`/?${ADVENTURES}`);
  expect(await cardNames(page, "Kingdom")).toEqual(names);
});

test("save a game, open it again after a reload, and remove it", async ({ page }) => {
  await ownSets(page, "base_2e");
  await page.goto(`/?${ADVENTURES}`);
  await expect(kingdomHeading(page)).toBeVisible();
  const names = await cardNames(page, "Kingdom");
  await page.getByRole("button", { name: "Save game" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  await page.getByRole("button", { name: "Deal again" }).click();
  await expect(page).not.toHaveURL(`/?${ADVENTURES}`);
  await expect(page.getByRole("button", { name: "Save game" })).toBeVisible();
  await page.getByRole("button", { name: "Options" }).click();

  await page.reload();
  const saved = page.getByRole("list", { name: "Saved games" });
  await expect(saved.getByRole("listitem")).toHaveCount(1);
  await expect(saved).toContainText(names.join(", "));
  await saved.getByRole("button").first().click();
  await expect(page).toHaveURL(`/?${ADVENTURES}`);
  expect(await cardNames(page, "Kingdom")).toEqual(names);
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

  await page.getByRole("button", { name: "Options" }).click();
  await saved.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(saved).toBeHidden();
});

test("sort the Kingdom in another order", async ({ page }) => {
  await page.goto(`/?${ADVENTURES}`);
  await expect(kingdomHeading(page)).toBeVisible();
  await page.getByRole("group", { name: "Sort the Kingdom by" }).getByText("Name").click();
  await expect(page.getByRole("radio", { name: "Name" })).toBeChecked();
  const byName = cliNames(ADVENTURES, "--sort", "name");
  await expect.poll(() => gameNames(page)).toEqual(byName);
  // the sort order is not in the link
  await expect(page).toHaveURL(`/?${ADVENTURES}`);
  // and new games and links are sorted the same way
  const preferences = await page.evaluate(() => localStorage.getItem("preferences"));
  expect(JSON.parse(preferences ?? "{}").sort_order).toBe("name");
  await page.reload();
  await expect.poll(() => gameNames(page)).toEqual(byName);
});

test("swap a card for a random one, or for one you pick, as the CLI does", async ({ page }) => {
  await ownSets(page, "base_2e", "adventures");
  await page.goto(`/?${ADVENTURES}`);
  await expect(kingdomHeading(page)).toBeVisible();
  const kingdom = page.getByRole("list", { name: "Kingdom", exact: true });
  const dialog = page.getByRole("dialog");
  const swapped = (await cardNames(page, "Kingdom"))[0]!;
  await kingdom.getByRole("button", { name: swapped, exact: true }).click();
  await dialog.getByRole("button", { name: "Swap for a random card" }).click();
  await expect(dialog).toBeHidden();
  // a new link, of the game in view
  await expect(page).not.toHaveURL(`/?${ADVENTURES}`);
  const afterSwap = page.url();
  expect(await cardNames(page, "Kingdom")).not.toContain(swapped);
  const afterSwapNames = await gameNames(page);
  expect(afterSwapNames).toEqual(cliNames(afterSwap));

  const picked = ["Village", "Smithy", "Market", "Cellar"].find(
    (name) => !afterSwapNames.includes(name),
  )!;
  const next = (await cardNames(page, "Kingdom"))[0]!;
  await kingdom.getByRole("button", { name: next, exact: true }).click();
  await dialog.getByRole("button", { name: "Swap for a card you pick" }).click();
  await dialog.getByRole("searchbox", { name: "Search the cards" }).fill(picked);
  await page
    .getByRole("list", { name: "Cards to swap for" })
    .getByRole("button", { name: picked, exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const names = await gameNames(page);
  expect(names).toEqual(cliNames(afterSwap, "--swap", `${next}=${picked}`));
  expect(names).toEqual(cliNames(page.url()));

  // and Back undoes the swap
  await page.goBack();
  await expect(kingdom.getByRole("button", { name: next, exact: true })).toBeVisible();
});

test("pick the card to swap for from your collection, searched and sorted", async ({ page }) => {
  await ownSets(page, "base_2e");
  await page.goto(`/?${BASE}`);
  await expect(kingdomHeading(page)).toBeVisible();
  await page
    .getByRole("list", { name: "Kingdom", exact: true })
    .getByRole("button")
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Swap for a card you pick" }).click();
  const picks = () => cardNames(page, "Cards to swap for");

  // the Base cards that are not in the game, sorted by cost like the Kingdom
  await expect
    .poll(picks)
    .toEqual([
      "Moat",
      "Merchant",
      "Vassal",
      "Village",
      "Workshop",
      "Militia",
      "Moneylender",
      "Remodel",
      "Bandit",
      "Council Room",
      "Festival",
      "Laboratory",
      "Library",
      "Market",
      "Mine",
      "Sentry",
    ]);
  await dialog.getByRole("group", { name: "Sort the cards by" }).getByText("Name").click();
  await expect.poll(picks).toHaveLength(16);
  const byName = await picks();
  expect(byName).toEqual(byName.toSorted());

  const search = dialog.getByRole("searchbox", { name: "Search the cards" });
  await search.fill("IL");
  await expect.poll(picks).toEqual(["Council Room", "Militia", "Village"]);
  await search.fill("xyz");
  await expect(dialog).toContainText("No cards match “xyz”.");

  // and back to the card
  await dialog.getByRole("button", { name: "Back" }).click();
  await expect(dialog.getByRole("button", { name: "Swap for a random card" })).toBeVisible();
});

test("a swap that is not possible shows an error and keeps the game", async ({ page }) => {
  // Menagerie is the Bane, which must cost $2 or $3
  await ownSets(page, "cornucopia_guilds_2e");
  await page.goto(`/?${YOUNG_WITCH}`);
  await expect(kingdomHeading(page)).toBeVisible();
  const kingdom = page.getByRole("list", { name: "Kingdom", exact: true });
  const before = await cardNames(page, "Kingdom");
  await kingdom.getByRole("button", { name: "Menagerie", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Swap for a card you pick" }).click();
  await dialog.getByRole("searchbox", { name: "Search the cards" }).fill("Baker");
  await page
    .getByRole("list", { name: "Cards to swap for" })
    .getByRole("button", { name: "Baker", exact: true })
    .click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "'Baker' is not eligible for Bane (Kingdom card costing $2-$3)",
  );
  expect(await cardNames(page, "Kingdom")).toEqual(before);
});

test("a link with an unknown card shows an error", async ({ page }) => {
  await page.goto("/?kingdom=nope");
  await expect(page.getByRole("alert")).toHaveText("Card 'nope' not found");
});

test("tap a card to read it, and exclude it from future games", async ({ page }) => {
  await page.goto(`/?${BASE}`);
  await page.getByRole("list", { name: "Kingdom" }).getByRole("button").first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const name = await dialog.getByRole("heading").textContent();

  await dialog.getByRole("button", { name: "Exclude from future games" }).click();
  await expect(dialog.getByRole("button", { name: "Excluded from future games" })).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
  const preferences = await page.evaluate(() => localStorage.getItem("preferences"));
  expect(JSON.parse(preferences ?? "{}").exclude).toEqual([name]);
});

test("cards are shown with their images", async ({ page }) => {
  await page.goto(`/?${BASE}`);
  // and not the set icons on them
  const images = page.getByRole("list", { name: "Kingdom" }).getByRole("img");
  await expect(images).toHaveCount(10);
  await expect
    .poll(() => images.first().evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
});

test("costs are shown with the wiki's images", async ({ page }) => {
  await page.goto(`/?${BASE}`);
  // the Kingdom is sorted by cost, with each cost above its cards
  const coin = page.getByRole("list", { name: "Kingdom" }).getByLabel("Cost $2").locator("img");
  await expect
    .poll(() => coin.evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
});

test.describe("without the service worker", () => {
  test.use({ serviceWorkers: "block" });

  test("cards without an image are shown as tiles", async ({ page }) => {
    await page.route("**/cards/**", (route) => route.fulfill({ status: 404 }));
    await page.goto(`/?${BASE}`);
    const kingdom = page.getByRole("list", { name: "Kingdom" });
    await expect(kingdom.getByTestId("card-tile")).toHaveCount(10);
  });
});

test("works offline once loaded", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.goto(`/?${BASE}`);
  await expect(kingdomHeading(page)).toBeVisible();
  expect(await cardNames(page, "Kingdom")).toEqual(cliNames(BASE));
});
