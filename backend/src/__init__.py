"""Backend package bootstrap.

Allows the codebase to work in both of these modes:
- `uvicorn src.main:app` from `backend`
- direct module imports used by the existing tests (`from main import app`)

The project currently uses top-level imports like `from api import auth`.
When `src` is imported as a package, Python would normally resolve those
imports relative to the process working directory instead of this folder.
Adding `src` itself to `sys.path` keeps the current import style working
without forcing a broad refactor across the backend modules.
"""

from pathlib import Path
import sys


SRC_DIR = Path(__file__).resolve().parent
src_dir_str = str(SRC_DIR)

if src_dir_str not in sys.path:
    sys.path.insert(0, src_dir_str)
