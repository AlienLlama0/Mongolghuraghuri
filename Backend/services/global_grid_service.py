"""
Create a coarse global MOLA elevation raster for Marswide route planning.

The source MOLA raster is never modified. The output is a separate Float32
GeoTIFF generated with average resampling so each coarse cell represents the
average elevation of the source pixels that fall within it.
"""
from __future__ import annotations

import math
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from rasterio.transform import from_bounds


def create_global_mola_grid(
    input_path: str | Path,
    output_path: str | Path,
    resolution_km: float = 10.0,
) -> dict:
    input_path = Path(input_path)
    output_path = Path(output_path)

    if not input_path.exists():
        raise FileNotFoundError(
            f"MOLA input not found: {input_path}. "
            "Copy your existing mola.tif into the backend data/ folder."
        )
    if resolution_km <= 0:
        raise ValueError("resolution_km must be greater than zero.")

    output_path.parent.mkdir(parents=True, exist_ok=True)

    with rasterio.open(input_path) as src:
        if src.count < 1:
            raise ValueError("The MOLA raster contains no bands.")
        if src.crs is None:
            raise ValueError("The MOLA raster has no CRS. A Mars CRS is required.")

        left, bottom, right, top = src.bounds
        target_resolution_m = resolution_km * 1000.0

        width = max(1, math.ceil((right - left) / target_resolution_m))
        height = max(1, math.ceil((top - bottom) / target_resolution_m))
        dst_transform = from_bounds(left, bottom, right, top, width, height)

        # Read the original raster at the target dimensions using average
        # resampling. Rasterio/GDAL handles source NoData during resampling.
        coarse = src.read(
            1,
            out_shape=(height, width),
            resampling=Resampling.average,
            masked=True,
        )

        coarse_float = np.asarray(coarse.filled(-9999.0), dtype=np.float32)
        valid = np.isfinite(coarse_float) & (coarse_float != -9999.0)
        if not valid.any():
            raise ValueError("The generated overview contains no valid elevation cells.")

        profile = {
            "driver": "GTiff",
            "height": height,
            "width": width,
            "count": 1,
            "dtype": "float32",
            "crs": src.crs,
            "transform": dst_transform,
            "nodata": -9999.0,
            "compress": "DEFLATE",
            "predictor": 3,
            "tiled": True,
            "blockxsize": 256,
            "blockysize": 256,
        }

        with rasterio.open(output_path, "w", **profile) as dst:
            dst.write(coarse_float, 1)
            dst.set_band_description(1, f"MOLA average elevation, target {resolution_km:g} km")
            dst.update_tags(
                source=str(input_path.name),
                resampling="average",
                target_resolution_km=str(resolution_km),
                purpose="Coarse global planning overview; not for local hazard assessment",
            )

        actual_x_resolution = (right - left) / width
        actual_y_resolution = (top - bottom) / height

        return {
            "input": str(input_path),
            "output": str(output_path),
            "source_width": src.width,
            "source_height": src.height,
            "output_width": width,
            "output_height": height,
            "output_cells": width * height,
            "target_resolution_km": resolution_km,
            "actual_pixel_width_km": actual_x_resolution / 1000.0,
            "actual_pixel_height_km": actual_y_resolution / 1000.0,
            "valid_cells": int(valid.sum()),
            "nodata_cells": int((~valid).sum()),
            "crs": str(src.crs),
            "bounds": [left, bottom, right, top],
        }
