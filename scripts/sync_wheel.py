"""Put the wheel of the dominion-setup version in uv.lock into public/wheels/.

The app installs this wheel into Pyodide. For a release from PyPI, the wheel is
downloaded (and its hash checked); for a local checkout (a ``directory`` or
``editable`` source), it is built with ``uv build``.

Usage:
    uv run scripts/sync_wheel.py
"""

from __future__ import annotations

import hashlib
import shutil
import subprocess
import tomllib
import urllib.request
from pathlib import Path

ROOT = Path(__file__).parent.parent
WHEELS_DIR = ROOT / "public" / "wheels"


def main() -> None:
    """Put the wheel of the locked dominion-setup version into public/wheels/."""
    lock = tomllib.loads((ROOT / "uv.lock").read_text(encoding="utf-8"))
    package = next(p for p in lock["package"] if p["name"] == "dominion-setup")
    source = package["source"]

    shutil.rmtree(WHEELS_DIR, ignore_errors=True)
    WHEELS_DIR.mkdir(parents=True)

    if local_path := source.get("directory") or source.get("editable"):
        subprocess.run(  # noqa: S603
            ["uv", "build", "--wheel", "--out-dir", WHEELS_DIR, ROOT / local_path],  # noqa: S607
            check=True,
        )
        (WHEELS_DIR / ".gitignore").unlink(missing_ok=True)  # written by uv build
    else:
        wheel = next(w for w in package["wheels"] if w["url"].endswith("-none-any.whl"))
        with urllib.request.urlopen(wheel["url"]) as response:  # noqa: S310
            data = response.read()
        algorithm, expected = wheel["hash"].split(":")
        if hashlib.new(algorithm, data).hexdigest() != expected:
            msg = f"Hash mismatch for {wheel['url']}"
            raise RuntimeError(msg)
        (WHEELS_DIR / wheel["url"].rsplit("/", 1)[1]).write_bytes(data)

    print(f"dominion-setup {package['version']} → {WHEELS_DIR.relative_to(ROOT)}/")


if __name__ == "__main__":
    main()
