from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

# Allow running this file directly from the backend root.
BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

from services.global_grid_service import create_global_mola_grid


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Generate a coarse global MOLA GeoTIFF for Marswalk."
    )
    parser.add_argument("--input", default="data/mola.tif", help="Path to original MOLA GeoTIFF")
    parser.add_argument(
        "--output",
        default="data/mola_global_coarse.tif",
        help="Output coarse GeoTIFF path",
    )
    parser.add_argument(
        "--resolution-km",
        type=float,
        default=10.0,
        help="Approximate target pixel size in km (default: 10)",
    )
    args = parser.parse_args()

    result = create_global_mola_grid(
        input_path=BACKEND_ROOT / args.input,
        output_path=BACKEND_ROOT / args.output,
        resolution_km=args.resolution_km,
    )
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
