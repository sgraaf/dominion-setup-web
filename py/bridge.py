"""The app's Python side: dominion-setup behind a JSON interface, run in Pyodide.

The web worker calls ``catalog()`` once, and then ``generate(options)`` for
every game. ``generate`` does what ``dominion-setup generate`` does, so a seed
gives the same game in the app as on the command line.
"""

from __future__ import annotations

import json
import random
from importlib import metadata
from typing import TYPE_CHECKING, Any

from dominion_setup import (
    CARD_SETS_WITH_SECOND_EDITIONS,
    SET_EDITION_CHOICES,
    CardSet,
    KingdomRequirement,
    KingdomSortOrder,
    Pile,
    SetupGenerationError,
    generate_game,
    is_selectable,
    load_card_database,
)

if TYPE_CHECKING:
    from dominion_setup import Card

VERSION = metadata.version("dominion-setup")
DB = load_card_database()

# The Kingdom cards and Landscapes that can be included or excluded.
SELECTABLE_CARDS: list[Card] = sorted(
    filter(is_selectable, DB),
    key=lambda card: card.name,
)

# Kingdom requirements, keyed by their names in lowercase (e.g. "buys").
REQUIREMENTS = {
    requirement.name.lower(): requirement for requirement in KingdomRequirement
}


def catalog() -> str:
    """Return the version, sets and selectable cards, as JSON, for the app's menus."""
    sets = [
        {
            "key": key,
            "name": set_,
            "edition": edition if set_ in CARD_SETS_WITH_SECOND_EDITIONS else None,
            "kingdom_card_count": len(DB.get_cards_by_set_edition(set_, edition)),
        }
        for key, (set_, edition) in SET_EDITION_CHOICES.items()
    ]
    cards = [
        Pile(card).to_dict() | {"promo": card.set == CardSet.PROMO}
        for card in SELECTABLE_CARDS
    ]
    return json.dumps({"version": VERSION, "sets": sets, "cards": cards})


def generate(options_json: str) -> str:
    """Generate a game from the app's options, as JSON.

    The options are those of ``dominion-setup generate``, keyed by the
    parameter names of ``generate_game`` (plus ``sets`` and ``seed``). The
    result is ``{"version", "game"}``, or ``{"error"}`` if the options cannot
    produce a game.
    """
    options: dict[str, Any] = json.loads(options_json)
    try:
        game = generate_game(
            DB,
            sets_editions={SET_EDITION_CHOICES[key] for key in options["sets"]},
            sort_order=KingdomSortOrder(options["sort_order"]),
            use_colony=options["use_colony"],
            use_shelters=options["use_shelters"],
            max_landscapes=options["max_landscapes"],
            requirements=[REQUIREMENTS[name] for name in options["requirements"]],
            include=options["include"],
            exclude=options["exclude"],
            promos=options["promos"],
            black_market_size=options["black_market_size"],
            swaps=[(card, replacement) for card, replacement in options["swaps"]],
            players=options["players"],
            rng=random.Random(options["seed"]),  # noqa: S311
        )
    except SetupGenerationError as exc:
        return json.dumps({"error": str(exc)})
    return json.dumps({"version": VERSION, "game": game.to_dict()})
