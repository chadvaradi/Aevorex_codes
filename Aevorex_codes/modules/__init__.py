"""Aevorex modules namespace.

This file marks the 'modules' directory as a regular Python package so that
imports such as ``import modules.shared.ai`` work reliably when the project
root is on ``PYTHONPATH`` (configured by `FinBotConfig`).

Subpackages:
    financehub
    contenthub
    shared
    ... (others)
"""

from importlib import util as _importlib_util
from pathlib import Path as _Path

# Ensure namespace packages inside `modules` can be discovered even if their
# own `__init__.py` files are absent (PEP 420 compatibility).
if not _importlib_util.find_spec(__name__ + '.shared'):
    # Add subdirectories dynamically to module search path
    _this_dir = _Path(__file__).parent
    for _child in _this_dir.iterdir():
        if _child.is_dir() and (_child / '__init__.py').exists():
            __path__.append(str(_child))

# ---------------------------------------------------------------------------
# Guarantee import-time discoverability of the monorepo roots
# ---------------------------------------------------------------------------
# ``modules`` resides inside <workspace_root>/Aevorex_codes/modules/  →  we want to
# ensure that BOTH ① the *Aevorex_codes* folder (top-level package siblings such
# as ``model_catalogue.py``) **and** ② the workspace root itself are on
# ``sys.path``.
# This is executed exactly once when the ``modules`` package is imported, making
# it the single, authoritative place for PYTHONPATH bootstrapping – all entry
# points (backend, unit-tests, scripts, celery workers) implicitly benefit.
import sys as _sys
from pathlib import Path as _P

_this_dir = _P(__file__).resolve().parent                          # …/modules
_aevorex_root = _this_dir.parent                                   # …/Aevorex_codes
_workspace_root = _aevorex_root.parent                             # …/<repo>

for _pth in (_aevorex_root, _workspace_root):
    _str = str(_pth)
    if _pth.is_dir() and _str not in _sys.path:
        _sys.path.insert(0, _str)
# ---------------------------------------------------------------------------
# End of bootstrap
# --------------------------------------------------------------------------- 