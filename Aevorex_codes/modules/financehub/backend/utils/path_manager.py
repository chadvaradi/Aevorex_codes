"""FinBotPathManager – Central helper for robust PYTHONPATH setup.

This module provides a single public function ``ensure_pythonpath()`` which
adds the (1) *Aevorex_codes* monorepo sub-root *and* (2) its parent workspace
root to ``sys.path`` **exactly once**, preventing duplicate entries and ensuring
that imports such as ``modules.shared.ai.model_catalogue`` and the root-level
``model_catalogue`` always resolve – even under the Uvicorn/WatchFiles
reloader which spawns child interpreter processes.

Import this helper **as early as possible** in every executable entry point
(e.g. ``backend/main.py`` or management scripts) *before* any other internal
imports.  The function is idempotent and therefore safe to call multiple
times.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import List

__all__: List[str] = ["ensure_pythonpath"]


def _add_path(p: Path) -> None:  # pragma: no cover – trivial helper
    """Prepend *p* to ``sys.path`` if it is a directory and not already set."""
    if p.is_dir():
        str_p = str(p)
        if str_p not in sys.path:
            # Prepend so it has priority over site-packages.
            sys.path.insert(0, str_p)


def ensure_pythonpath(reference_file: Path | str | None = None) -> None:
    """Ensure all relevant repository roots are present on ``sys.path``.

    Parameters
    ----------
    reference_file:
        Any file located *inside* the monorepo (defaults to this file).
        The function climbs up the directory hierarchy to locate the
        ``Aevorex_codes`` folder and its parent workspace root.
    """
    ref_path = Path(reference_file or __file__).resolve()

    # Search upwards for the *Aevorex_codes* directory marker.
    aevorex_root = None
    for parent in ref_path.parents:
        if parent.name == "Aevorex_codes":
            aevorex_root = parent
            break

    # Fallback: if not found (unusual), just use the third parent.
    if aevorex_root is None:
        aevorex_root = ref_path.parents[3]

    workspace_root = aevorex_root.parent

    # Insert both paths (workspace_root enables ``import model_catalogue``).
    _add_path(aevorex_root)
    _add_path(workspace_root) 