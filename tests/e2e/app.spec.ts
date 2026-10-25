import { execFileSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";

/** The names of the cards that `dominion-setup generate --format names` deals with *args*. */
function cliNames(...args: string[]): string[] {
  const output = execFileSync(
    "uv",
    ["run", "dominion-setup", "generate", "--format", "names", ...args],
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

const kingdomHeading = (page: Page) => page.getByRole("heading", { name: "Your Kingdom" });

test("a share link deals the same game as the CLI", async ({ page }) => {
  await page.goto("/?set=base_2e&set=adventures&players=3&seed=42");
  await expect(kingdomHeading(page)).toBeVisible();
  const names = [...(await cardNames(page, "Kingdom")), ...(await cardNames(page, "Landscapes"))];
  const expected = cliNames("--set", "base_2e", "--set", "adventures", "--seed", "42");
  expect(names).toEqual(expected);
});

test("copy the card names, as the CLI prints them", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?set=base_2e&set=adventures&seed=42");
  await expect(kingdomHeading(page)).toBeVisible();
  await page.getByRole("button", { name: "Copy card names" }).click();
  await expect(page.getByRole("button", { name: "Names copied" })).toBeVisible();
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(
    cliNames("--set", "base_2e", "--set", "adventures", "--seed", "42").join(", "),
  );
});

test("deal a Kingdom from your collection", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Base, 2nd edition" }).click();
  await page.getByRole("button", { name: "Intrigue, 2nd edition" }).click();
  await page.getByRole("button", { name: "Save collection" }).click();
  await page.getByRole("button", { name: "Deal a Kingdom" }).click();
  await expect(kingdomHeading(page)).toBeVisible();
  await expect(page).toHaveURL(/set=base_2e&set=intrigue_2e&seed=\d+/);
  const names = await cardNames(page, "Kingdom");
  expect(names.length).toBeGreaterThanOrEqual(10);

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
  await page.goto("/");
  await page.getByRole("button", { name: "Base, 2nd edition" }).click();
  await page.getByRole("button", { name: "Save collection" }).click();
  await page.goto("/?set=base_2e&set=adventures&seed=42");
  await expect(kingdomHeading(page)).toBeVisible();
  const names = await cardNames(page, "Kingdom");
  await page.getByRole("button", { name: "Deal again" }).click();
  await expect(page).not.toHaveURL(/seed=42/);
  await page.getByRole("button", { name: "Options" }).click();

  await page.reload();
  const recent = page.getByRole("list", { name: "Recent games" }).getByRole("button");
  await expect(recent).toHaveCount(2);
  await expect(recent.nth(1)).toContainText(names.join(", "));
  await recent.nth(1).click();
  await expect(kingdomHeading(page)).toBeVisible();
  await expect(page).toHaveURL(/seed=42/);
  expect(await cardNames(page, "Kingdom")).toEqual(names);
});

test("save a game, open it again after a reload, and remove it", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Base, 2nd edition" }).click();
  await page.getByRole("button", { name: "Save collection" }).click();
  await page.goto("/?set=base_2e&set=adventures&seed=42");
  await expect(kingdomHeading(page)).toBeVisible();
  const names = await cardNames(page, "Kingdom");
  await page.getByRole("button", { name: "Save game" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  await page.getByRole("button", { name: "Deal again" }).click();
  await expect(page).not.toHaveURL(/seed=42/);
  await expect(page.getByRole("button", { name: "Save game" })).toBeVisible();
  await page.getByRole("button", { name: "Options" }).click();

  await page.reload();
  const saved = page.getByRole("list", { name: "Saved games" });
  await expect(saved.getByRole("listitem")).toHaveCount(1);
  await expect(saved).toContainText(names.join(", "));
  await saved.getByRole("button").first().click();
  await expect(page).toHaveURL(/seed=42/);
  expect(await cardNames(page, "Kingdom")).toEqual(names);
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();

  await page.getByRole("button", { name: "Options" }).click();
  await saved.getByRole("button", { name: "Remove", exact: true }).click();
  await expect(saved).toBeHidden();
});

test("sort the Kingdom in another order", async ({ page }) => {
  await page.goto("/?set=base_2e&set=adventures&seed=42");
  await expect(kingdomHeading(page)).toBeVisible();
  await page.getByRole("group", { name: "Sort the Kingdom by" }).getByText("Name").click();
  await expect(page).toHaveURL(/sort=name&seed=42/);
  await expect(page.getByRole("radio", { name: "Name" })).toBeChecked();
  const names = [...(await cardNames(page, "Kingdom")), ...(await cardNames(page, "Landscapes"))];
  const args = ["--set", "base_2e", "--set", "adventures", "--seed", "42", "--sort", "name"];
  expect(names).toEqual(cliNames(...args));
  // and new games are sorted the same way
  const preferences = await page.evaluate(() => localStorage.getItem("preferences"));
  expect(JSON.parse(preferences ?? "{}").sort_order).toBe("name");
});

test("swap a card for a random one, or for one you pick, as the CLI does", async ({ page }) => {
  const args = ["--set", "base_2e", "--set", "adventures", "--seed", "42"];
  await page.goto("/?set=base_2e&set=adventures&seed=42");
  await expect(kingdomHeading(page)).toBeVisible();
  const kingdom = page.getByRole("list", { name: "Kingdom", exact: true });
  const dialog = page.getByRole("dialog");
  const swapped = (await cardNames(page, "Kingdom"))[0]!;
  await kingdom.getByRole("button", { name: swapped, exact: true }).click();
  await dialog.getByRole("button", { name: "Swap for a random card" }).click();
  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL(new RegExp(`swap=${encodeURIComponent(swapped)}&seed=42`));
  const afterSwap = cliNames(...args, "--swap", swapped);
  expect(await cardNames(page, "Kingdom")).not.toContain(swapped);

  const picked = ["Village", "Smithy", "Market", "Cellar"].find(
    (name) => !afterSwap.includes(name),
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
  const names = [...(await cardNames(page, "Kingdom")), ...(await cardNames(page, "Landscapes"))];
  expect(names).toEqual(cliNames(...args, "--swap", swapped, "--swap", `${next}=${picked}`));

  // and Back undoes the swap
  await page.goBack();
  await expect(kingdom.getByRole("button", { name: next, exact: true })).toBeVisible();
});

test("pick the card to swap for from the game's sets, searched and sorted", async ({ page }) => {
  await page.goto("/?set=base_2e&seed=42");
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
  await page.goto("/?set=cornucopia_guilds_2e&include=Young+Witch&seed=42");
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

test("options without a game show an error", async ({ page }) => {
  await page.goto("/?set=base_2e&include=Witch&exclude=Witch&seed=1");
  await expect(page.getByRole("alert")).toHaveText("'Witch' is both included and excluded");
});

test("tap a card to read it, and exclude it from future games", async ({ page }) => {
  await page.goto("/?set=base_2e&seed=42");
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
  await page.goto("/?set=base_2e&seed=42");
  // and not the set icons on them
  const images = page.getByRole("list", { name: "Kingdom" }).getByRole("img");
  await expect(images).toHaveCount(10);
  await expect
    .poll(() => images.first().evaluate((img: HTMLImageElement) => img.naturalWidth))
    .toBeGreaterThan(0);
});

test.describe("without the service worker", () => {
  test.use({ serviceWorkers: "block" });

  test("cards without an image are shown as tiles", async ({ page }) => {
    await page.route("**/cards/**", (route) => route.fulfill({ status: 404 }));
    await page.goto("/?set=base_2e&seed=42");
    const kingdom = page.getByRole("list", { name: "Kingdom" });
    await expect(kingdom.getByTestId("card-tile")).toHaveCount(10);
  });
});

test("works offline once loaded", async ({ page, context }) => {
  await page.goto("/");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await context.setOffline(true);
  await page.goto("/?set=base_2e&seed=42");
  await expect(kingdomHeading(page)).toBeVisible();
  expect(await cardNames(page, "Kingdom")).toEqual(cliNames("--set", "base_2e", "--seed", "42"));
});
