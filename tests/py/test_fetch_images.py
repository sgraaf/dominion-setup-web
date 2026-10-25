"""Tests for ``fetch_images``: it knows an image of every set and material, where the app looks."""

import fetch_images
import pytest
from dominion_setup import CardCost, Material, load_card_database


def test_every_set_has_an_icon() -> None:
    sets = {card.display_set.replace(", 2E", "") for card in load_card_database()}
    assert sets <= fetch_images.SET_ICONS.keys()


def test_every_material_has_an_image() -> None:
    assert fetch_images.MATERIAL_IMAGES.keys() == set(Material)


# the same paths as in tests/unit/cards.test.ts
@pytest.mark.parametrize(
    ("set_", "file"),
    [
        ("Seaside, 2E", "Seaside.webp"),
        ("Base, 1E", "Base-1E.webp"),
        ("Cornucopia & Guilds", "Cornucopia_Guilds.webp"),
    ],
)
def test_icon_path(set_: str, file: str) -> None:
    assert fetch_images.icon_path(set_) == fetch_images.CARDS_DIR / "icons" / file


@pytest.mark.parametrize(
    ("material", "file"),
    [
        ("+1 Card token", "1_Card_token.webp"),
        ("-1 Coin token", "-1_Coin_token.webp"),
        ("Coffers / Villagers mat", "Coffers_Villagers_mat.webp"),
    ],
)
def test_material_path(material: str, file: str) -> None:
    assert (
        fetch_images.material_path(material)
        == fetch_images.CARDS_DIR / "materials" / file
    )


@pytest.mark.parametrize(
    ("cost", "files"),
    [
        (CardCost(coins=7, extra="*"), ["Coin7star.webp"]),
        (CardCost(coins=3, extra="+"), ["Coin3plus.webp"]),
        (CardCost(coins=2, potion=True), ["Coin2.webp", "Potion.webp"]),
        (CardCost(coins=4, debt=3), ["Coin4.webp", "Debt3.webp"]),
        (CardCost(debt=8), ["Debt8.webp"]),
    ],
)
def test_cost_paths(cost: CardCost, files: list[str]) -> None:
    paths = [fetch_images.cost_path(image) for image in fetch_images.cost_images(cost)]
    assert paths == [fetch_images.CARDS_DIR / "costs" / file for file in files]
