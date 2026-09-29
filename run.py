import sys
from pathlib import Path

# Add current workspace root and backend directory to path
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"

for p in [str(ROOT_DIR), str(BACKEND_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from backend.run import main

if __name__ == "__main__":
    main()
