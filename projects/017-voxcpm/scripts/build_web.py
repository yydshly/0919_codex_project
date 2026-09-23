#!/usr/bin/env python3
"""Copy the static VoxCPM research page into the shared GitHub Pages output."""

from pathlib import Path
import shutil


PROJECT = Path(__file__).resolve().parents[1]
OUTPUT = PROJECT.parents[1] / "web" / "017-voxcpm"


def main() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    for name in ("index.html", "styles.css"):
        shutil.copy2(PROJECT / "site" / name, OUTPUT / name)
    shutil.copy2(PROJECT / "assets" / "overview.png", OUTPUT / "overview.png")
    print(f"Built {OUTPUT}")


if __name__ == "__main__":
    main()
