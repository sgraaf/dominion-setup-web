"""Fetch the images of the cards, sets, mats and tokens from the Dominion Strategy Wiki.

They go into public/cards/: the card images as WebP, 320 and 640 pixels wide,
and the set icons (in icons/) and the mats and tokens (in materials/) as WebP
with their transparency. The wiki uses an anti-bot challenge that requires a
real browser engine to solve, so the images are fetched by Chromium once it
has passed (as in dominion-setup's bin/scrape_cards_list.py). Images that are
already there are skipped, so run this again when the card data changes.

Usage:
    uv run scripts/fetch_images.py [--headed]
"""

from __future__ import annotations

import io
import re
import sys
import time
from pathlib import Path
from typing import NamedTuple
from urllib.parse import quote

from dominion_setup import Material, load_card_database
from PIL import Image
from playwright.sync_api import sync_playwright

WIKI_INDEX_URL = "https://wiki.dominionstrategy.com/index.php"
CARDS_DIR = Path(__file__).parent.parent / "public" / "cards"
WIDTHS = (320, 640)
# the width of the set icons, mats and tokens, which are shown small
SMALL_WIDTH = 192
# pause between downloads, to go easy on the wiki
DELAY = 0.2

# the wiki's file of each set's icon, by the set as cards name it (``Card.display_set``,
# without ", 2E"), so the cards that are only in a first edition get the old icon
SET_ICONS = {
    "Base": "Dominion_icon.png",
    "Base, 1E": "Dominion_old_icon.png",
    "Intrigue": "Intrigue_icon.png",
    "Intrigue, 1E": "Intrigue_old_icon.png",
    "Seaside": "Seaside_icon.png",
    "Seaside, 1E": "Seaside_old_icon.png",
    "Alchemy": "Alchemy_icon.png",
    "Prosperity": "Prosperity_icon.png",
    "Prosperity, 1E": "Prosperity_old_icon.png",
    "Cornucopia & Guilds": "Cornucopia_&_Guilds_icon.png",
    "Cornucopia & Guilds, 1E": "Cornucopia_&_Guilds_icon.png",
    "Hinterlands": "Hinterlands_icon.png",
    "Hinterlands, 1E": "Hinterlands_old_icon.png",
    "Dark Ages": "Dark_Ages_icon.png",
    "Adventures": "Adventures_icon.png",
    "Empires": "Empires_icon.png",
    "Nocturne": "Nocturne_icon.png",
    "Renaissance": "Renaissance_icon.png",
    "Menagerie": "Menagerie_(expansion)_icon.png",
    "Allies": "Allies_icon.png",
    "Plunder": "Plunder_(expansion)_icon.png",
    "Rising Sun": "Rising_Sun_icon.png",
    "Promo": "Promo_icon.png",
}

# the wiki's picture of each mat and token
MATERIAL_IMAGES = {
    Material.ISLAND_MAT: "Island_mat.jpg",
    Material.PIRATE_SHIP_MAT: "Pirate_Ship_mat.jpg",
    Material.NATIVE_VILLAGE_MAT: "Native_Village_mat.jpg",
    Material.TRADE_ROUTE_MAT: "Trade_Route_mat.jpg",
    Material.TAVERN_MAT: "Tavern_mat.jpg",
    Material.COFFERS_MAT: "Coffers_mat.jpg",
    Material.COFFERS_VILLAGERS_MAT: "CoffersVillagers_mat.jpg",
    Material.EXILE_MAT: "Exile_mat.jpg",
    Material.FAVORS_MAT: "Favors_mat.jpg",
    Material.VICTORY_TOKENS: "VP.png",
    Material.COIN_TOKENS: "Coin_token.png",
    Material.EMBARGO_TOKENS: "Embargo_token_side_1.png",
    Material.PLUS_ONE_CARD_TOKEN: "Card_token.png",
    Material.PLUS_ONE_ACTION_TOKEN: "Action_token.png",
    Material.PLUS_ONE_BUY_TOKEN: "Buy_token.png",
    Material.PLUS_ONE_COIN_TOKEN: "PlusCoin_token.png",
    Material.TRASHING_TOKEN: "Trashing_token.png",
    Material.MINUS_ONE_CARD_TOKEN: "MinusCard_token.png",
    Material.MINUS_ONE_COIN_TOKEN: "MinusCoin_token.png",
    Material.JOURNEY_TOKEN: "Journey_token.png",
    Material.ESTATE_TOKEN: "Estate_token.png",
    Material.DEBT_TOKENS: "Debt_token_(metal).png",
    Material.WOODEN_CUBES: "WoodenCubesOnProject.jpg",
    Material.SUN_TOKENS: "Sun.png",
}


class Job(NamedTuple):
    """An image to fetch: the wiki's file, and the widths to save it at, by path."""

    file: str
    outputs: dict[Path, int]
    transparent: bool = False


def path(image: str, width: int) -> Path:
    """Return the path of *image* at *width* in the app (see ``imageUrl`` in src/lib/cards.ts)."""
    stem = re.sub(r"[^A-Za-z0-9-]", "_", image.rsplit(".", 1)[0])
    return CARDS_DIR / f"{stem}-{width}.webp"


def icon_path(set_: str) -> Path:
    """Return the path of the icon of *set_* in the app (see ``setIconUrl`` in src/lib/cards.ts)."""
    key = set_.replace(", 2E", "").replace(", 1E", "-1E")
    stem = re.sub(r"[^A-Za-z0-9-]+", "_", key)
    return CARDS_DIR / "icons" / f"{stem}.webp"


def material_path(material: str) -> Path:
    """Return the path of *material*'s image in the app (see ``materialUrl`` in src/lib/cards.ts)."""
    stem = re.sub(r"[^A-Za-z0-9-]+", "_", material).strip("_")
    return CARDS_DIR / "materials" / f"{stem}.webp"


def jobs() -> list[Job]:
    """Return the images of every card, the icons of their sets, and every mat and token."""
    db = load_card_database()
    cards = [
        Job(image, {path(image, width): width for width in WIDTHS})
        for image in sorted({card.image for card in db})
    ]
    icons = {
        icon_path(set_): SET_ICONS[set_.replace(", 2E", "")]
        for set_ in sorted({card.display_set for card in db})
    }
    return [
        *cards,
        *(
            Job(file, {icon: SMALL_WIDTH}, transparent=True)
            for icon, file in icons.items()
        ),
        *(
            Job(file, {material_path(material): SMALL_WIDTH}, transparent=True)
            for material, file in MATERIAL_IMAGES.items()
        ),
    ]


def save(data: bytes, job: Job) -> None:
    """Save the image *data* as WebP at each of the *job*'s paths and widths."""
    with Image.open(io.BytesIO(data)) as original:
        image = original.convert("RGBA" if job.transparent else "RGB")
    for output, width in job.outputs.items():
        resized = image
        if image.width > width:
            height = round(image.height * width / image.width)
            resized = image.resize((width, height), Image.Resampling.LANCZOS)
        output.parent.mkdir(parents=True, exist_ok=True)
        resized.save(output, quality=80, method=6)


def main() -> None:
    """Fetch the images that are not in public/cards/ yet."""
    headless = "--headed" not in sys.argv
    all_jobs = jobs()
    todo = [
        job for job in all_jobs if not all(output.exists() for output in job.outputs)
    ]
    print(f"{len(all_jobs)} images, {len(todo)} to fetch")
    if not todo:
        return

    missing = []
    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=headless)
        page = browser.new_page()
        # wait for the anti-bot challenge to resolve, which sets a session cookie
        page.goto(WIKI_INDEX_URL, timeout=10_000, wait_until="domcontentloaded")
        page.wait_for_selector("h1#firstHeading", timeout=10_000)

        for i, job in enumerate(todo, start=1):
            width = max(job.outputs.values())
            url = f"{WIKI_INDEX_URL}/Special:FilePath/{quote(job.file)}?width={width}"
            response = page.request.get(url)
            if response.ok and response.headers["content-type"].startswith("image/"):
                save(response.body(), job)
                print(f"[{i}/{len(todo)}] {job.file}")
            else:
                missing.append(job.file)
                print(f"[{i}/{len(todo)}] {job.file}: not found ({response.status})")
            time.sleep(DELAY)
        browser.close()

    if missing:
        print(
            f"{len(missing)} images not found (the app shows a tile, or no icon, instead):",
        )
        for file in missing:
            print(f"  {file}")


if __name__ == "__main__":
    main()
