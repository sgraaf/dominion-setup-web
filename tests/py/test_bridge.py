"""Tests for ``bridge``: the app gets the same games as ``dominion-setup generate`` and ``setup``."""

import json
from pathlib import Path
from typing import Any

import bridge
import pytest
from click.testing import CliRunner
from dominion_setup import SET_EDITION_CHOICES
from dominion_setup.cli import cli

DEFAULT_OPTIONS: dict[str, Any] = {
    "sets": ["base_2e"],
    "promos": [],
    "players": None,
    "max_landscapes": 2,
    "use_colony": None,
    "use_shelters": None,
    "requirements": [],
    "include": [],
    "exclude": [],
    "black_market_size": 15,
    "sort_order": "cost",
    "seed": 42,
}

SET_UP_OPTIONS: dict[str, Any] = {
    "sets": ["base_2e"],
    "promos": [],
    "exclude": [],
    "players": None,
    "sort_order": "cost",
    "swaps": [],
}

# Board codes, as dominion-setup writes them
BASE = "kingdom=artisan,bureaucrat,cellar,chapel,gardens,harbinger,poacher,smithy,throne-room,witch"
YOUNG_WITCH = (
    "kingdom=advisor,butcher,candlestick-maker,carnival,farrier,ferryman,plaza,soothsayer,"
    "stonemason,young-witch&bane=menagerie&ferryman=farmhands"
)


@pytest.fixture(autouse=True)
def no_config_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep the CLI from reading the user's config file."""
    monkeypatch.setenv("XDG_CONFIG_HOME", str(tmp_path))


@pytest.mark.parametrize(
    ("options", "args"),
    [
        ({}, []),
        ({"seed": 7}, []),
        (
            {"sets": ["seaside_2e", "prosperity_2e", "nocturne"], "players": 4},
            ["--players", "4"],
        ),
        (
            {"sets": ["base_1e", "intrigue_2e"], "requirements": ["buys", "trashing"]},
            ["--require-buys", "--require-trashing"],
        ),
        (
            {"include": ["Witch", "Alms"], "exclude": ["Chapel"]},
            ["--include", "Witch", "--include", "Alms", "--exclude", "Chapel"],
        ),
        (
            {"promos": ["Stash", "Walled Village"]},
            ["--promo", "Stash", "--promo", "Walled Village"],
        ),
        (
            {
                "sets": ["base_2e", "dark_ages", "prosperity_1e"],
                "use_colony": True,
                "use_shelters": False,
                "max_landscapes": 0,
                "sort_order": "name",
            },
            ["--colony", "--no-shelters", "--max-landscapes", "0", "--sort", "name"],
        ),
        (
            {
                "sets": ["base_2e", "adventures", "empires", "rising_sun"],
                "include": ["Black Market"],
                "black_market_size": 5,
                "players": 6,
            },
            ["--include", "Black Market", "--black-market-size", "5", "--players", "6"],
        ),
    ],
)
def test_generate_matches_the_cli(options: dict[str, Any], args: list[str]) -> None:
    options = DEFAULT_OPTIONS | options
    result = json.loads(bridge.generate(json.dumps(options)))

    sets = [f"--set={key}" for key in options["sets"]]
    cli_args = ["generate", "--format", "json", "--seed", str(options["seed"])]
    cli_result = CliRunner().invoke(cli, [*cli_args, *sets, *args])
    assert cli_result.exit_code == 0, cli_result.output

    assert {"seed": options["seed"], **result["game"]} == json.loads(cli_result.output)


def test_generate_returns_an_error_for_options_without_a_game() -> None:
    options = DEFAULT_OPTIONS | {"include": ["Witch"], "exclude": ["Witch"]}
    assert json.loads(bridge.generate(json.dumps(options))) == {
        "error": "'Witch' is both included and excluded",
    }


def test_generate_returns_an_error_for_a_promo_that_is_not_one() -> None:
    options = DEFAULT_OPTIONS | {"promos": ["Witch"]}
    assert json.loads(bridge.generate(json.dumps(options))) == {
        "error": "'Witch' is not a Promo card",
    }


def without_the_order_of_the_boons(game: dict[str, Any]) -> dict[str, Any]:
    """Return the *game*, with the Druid's Boons sorted by name.

    A game set up from its code lists them in the order of the code, but
    ``generate_game`` deals them in random order.
    """
    boons = sorted(game["druid_boons"], key=lambda card: card["name"])
    return game | {"druid_boons": boons}


@pytest.mark.parametrize(
    "options",
    [
        {},
        {
            "sets": ["base_2e", "nocturne", "cornucopia_guilds_2e", "allies"],
            "include": ["Black Market", "Druid", "Young Witch"],
            "players": 4,
            "max_landscapes": 4,
        },
        {
            "sets": ["prosperity_2e", "dark_ages", "menagerie", "plunder"],
            "include": ["Way of the Mouse", "Obelisk", "Cheap"],
            "max_landscapes": 3,
            "use_colony": True,
            "use_shelters": True,
        },
    ],
)
def test_the_code_of_a_game_sets_it_up_again(options: dict[str, Any]) -> None:
    game = json.loads(bridge.generate(json.dumps(DEFAULT_OPTIONS | options)))["game"]
    # nothing is drawn, so the sets do not matter
    set_up_options = SET_UP_OPTIONS | {"sets": []}
    result = json.loads(bridge.set_up(game["code"], json.dumps(set_up_options)))
    assert without_the_order_of_the_boons(
        result["game"]
    ) == without_the_order_of_the_boons(game)


@pytest.mark.parametrize(
    ("code", "options", "args"),
    [
        (BASE, {}, []),
        (BASE, {"sort_order": "name"}, ["--sort", "name"]),
        (BASE, {"players": 4}, ["--players", "4"]),
        # the code's number of players comes first
        (f"players=3&{BASE}", {"players": 5}, []),
        (
            YOUNG_WITCH,
            {"swaps": [["Menagerie", "Village"]]},
            ["--swap", "Menagerie=Village"],
        ),
    ],
)
def test_set_up_matches_the_cli(
    code: str, options: dict[str, Any], args: list[str]
) -> None:
    options = SET_UP_OPTIONS | options
    result = json.loads(bridge.set_up(code, json.dumps(options)))

    sets = [f"--set={key}" for key in options["sets"]]
    cli_result = CliRunner().invoke(
        cli, ["setup", code, "--format", "json", *sets, *args]
    )
    assert cli_result.exit_code == 0, cli_result.output

    assert result["game"] == json.loads(cli_result.output)


def test_set_up_fills_the_gaps_from_the_collection() -> None:
    options = SET_UP_OPTIONS | {"sets": ["cornucopia_guilds_2e"]}
    game = json.loads(bridge.set_up("kingdom=young-witch,baker", json.dumps(options)))[
        "game"
    ]
    names = [card["name"] for card in game["kingdom"]]
    assert {"Young Witch", "Baker"} <= set(names)
    assert len(names) == 11  # with the Bane
    assert "&bane=" in game["code"]


def test_set_up_drops_choices_that_no_longer_apply() -> None:
    # a Bane without Young Witch
    result = json.loads(bridge.set_up(f"{BASE}&bane=moat", json.dumps(SET_UP_OPTIONS)))
    assert result["game"]["code"] == BASE


def test_set_up_returns_an_error_for_an_unknown_card() -> None:
    assert json.loads(bridge.set_up("kingdom=nope", json.dumps(SET_UP_OPTIONS))) == {
        "error": "Card 'nope' not found",
    }


def test_set_up_returns_an_error_for_a_swap_that_is_not_possible() -> None:
    options = SET_UP_OPTIONS | {"swaps": [["Platinum", None]]}
    assert json.loads(bridge.set_up(BASE, json.dumps(options))) == {
        "error": "'Platinum' is not a Kingdom card or Landscape",
    }


def test_catalog_has_the_sets_of_the_cli() -> None:
    catalog = json.loads(bridge.catalog())
    assert catalog["version"] == bridge.VERSION
    assert [set_["key"] for set_ in catalog["sets"]] == list(SET_EDITION_CHOICES)
    assert {
        key: value
        for key, value in catalog["sets"][1].items()
        if key != "kingdom_card_count"
    } == {"key": "base_2e", "name": "Base", "edition": 2}


def test_catalog_has_the_selectable_cards() -> None:
    cards = {card["name"]: card for card in json.loads(bridge.catalog())["cards"]}
    assert "Witch" in cards
    assert "Alms" in cards  # an Event
    assert "Copper" not in cards
    assert "Architects' Guild" not in cards  # an Ally
    assert cards["Stash"]["promo"]
    assert not cards["Witch"]["promo"]
    assert cards["Witch"]["image"] == "Witch.jpg"
