"""Tests for ``bridge``: the app gets the same games as ``dominion-setup generate``."""

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
    "swaps": [],
    "seed": 42,
}


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
        (
            {
                "swaps": [["Smithy", None], ["Moat", "Village"]],
                "include": ["Smithy", "Moat"],
            },
            [
                "--include",
                "Smithy",
                "--include",
                "Moat",
                "--swap",
                "Smithy",
                "--swap",
                "Moat=Village",
            ],
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

    assert result["version"] == bridge.VERSION
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


def test_generate_returns_an_error_for_a_swap_that_is_not_possible() -> None:
    options = DEFAULT_OPTIONS | {"swaps": [["Platinum", None]]}
    assert json.loads(bridge.generate(json.dumps(options))) == {
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
