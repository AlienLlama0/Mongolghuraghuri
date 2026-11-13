"""
Global coarse-grid A* planner.

This planner uses the downsampled global MOLA overview to find a broad route
across Mars. It is deliberately separate from the existing regional A* engine.
It is a prototype planner, not a crew-safety system.
"""
from __future__ import annotations

import heapq
import math
import os
import time

import numpy as np
import rasterio
from rasterio.transform import rowcol
from pyproj import Transformer

from schemas import Coordinate
from services.geo import haversine_m, normalize_lon


class GlobalRouteError(ValueError):
    pass


class GlobalRoutingService:
    def __init__(self, dataset):
        self.ds = dataset
        self.to_projected = Transformer.from_crs(
            dataset.crs.geodetic_crs, dataset.crs, always_xy=True
        )
        self.to_geographic = Transformer.from_crs(
            dataset.crs, dataset.crs.geodetic_crs, always_xy=True
        )
        self.max_explored = int(os.getenv("GLOBAL_MAX_EXPLORED_NODES", "300000"))
        self.slope_penalty = float(os.getenv("GLOBAL_SLOPE_PENALTY", "2.0"))
        self.max_slope_deg = float(os.getenv("GLOBAL_MAX_SLOPE_DEG", "25.0"))

    def _cell_for(self, coordinate):
        x, y = self.to_projected.transform(
            normalize_lon(coordinate.longitude), coordinate.latitude
        )
        row, col = rowcol(self.ds.transform, x, y)
        row, col = int(row), int(col)
        if not (0 <= row < self.ds.height and 0 <= col < self.ds.width):
            raise GlobalRouteError("Start or destination is outside the global MOLA grid.")
        return row, col

    def _neighbors(self, row, col, height, width):
        # Wrap left/right at the 0°/360° longitude seam.
        for dr, dc in (
            (-1, 0), (1, 0), (0, -1), (0, 1),
            (-1, -1), (-1, 1), (1, -1), (1, 1),
        ):
            rr = row + dr
            cc = (col + dc) % width
            if 0 <= rr < height:
                yield rr, cc, dr, dc

    def plan(self, start: Coordinate, destination: Coordinate):
        started = time.perf_counter()
        straight_m = haversine_m(
            start.latitude, start.longitude,
            destination.latitude, destination.longitude,
        )
        if straight_m < 1:
            raise GlobalRouteError("Start and destination are effectively the same location.")

        # The coarse overview is small enough to read into memory.
        masked = self.ds.read(1, masked=True)
        elevation = masked.astype(np.float32).filled(np.nan)
        valid = np.isfinite(elevation)
        height, width = elevation.shape

        sr, sc = self._cell_for(start)
        er, ec = self._cell_for(destination)
        if not valid[sr, sc]:
            raise GlobalRouteError("Start location falls on NoData in the coarse MOLA grid.")
        if not valid[er, ec]:
            raise GlobalRouteError("Destination falls on NoData in the coarse MOLA grid.")

        # Estimate physical cell dimensions. Equirectangular x-distance varies
        # with latitude, so east-west step distance is adjusted per row.
        pixel_x_m = abs(self.ds.transform.a)
        pixel_y_m = abs(self.ds.transform.e)

        # Compute terrain gradients in projected metres. Adjust east-west
        # gradient by cos(latitude) when estimating physical slope.
        filled = np.where(valid, elevation, np.nan)
        safe = np.where(valid, elevation, np.nanmedian(elevation[valid]))
        gy, gx = np.gradient(safe, pixel_y_m, pixel_x_m)
        row_latitudes = np.empty(height, dtype=np.float32)
        for r in range(height):
            x, y = self.ds.transform * (width / 2, r + 0.5)
            _, lat = self.to_geographic.transform(x, y)
            row_latitudes[r] = lat
        cos_lat = np.maximum(0.05, np.abs(np.cos(np.radians(row_latitudes))))
        physical_gx = gx / cos_lat[:, None]
        slope = np.degrees(np.arctan(np.hypot(physical_gx, gy)))
        allowed = valid & np.isfinite(slope) & (slope <= self.max_slope_deg)
        allowed[sr, sc] = True
        allowed[er, ec] = True

        # Use a Mars-surface distance heuristic. It remains admissible because
        # each traversed cell costs at least its physical step distance.
        def heuristic(r, c):
            x, y = self.ds.transform * (c + 0.5, r + 0.5)
            lon, lat = self.to_geographic.transform(x, y)
            return haversine_m(lat, lon, destination.latitude, destination.longitude)

        def step_distance(r, rr, dr, dc):
            lat = float(row_latitudes[r])
            dx = pixel_x_m * max(0.05, abs(math.cos(math.radians(lat))))
            dy = pixel_y_m
            return math.hypot(dx if dc else 0.0, dy if dr else 0.0)

        # Dense arrays avoid Python dictionaries for millions of possible cells.
        total = height * width
        g_score = np.full((height, width), np.inf, dtype=np.float64)
        parent = np.full(total, -1, dtype=np.int64)
        closed = np.zeros((height, width), dtype=np.bool_)

        g_score[sr, sc] = 0.0
        queue = [(heuristic(sr, sc), 0.0, sr, sc)]
        explored = 0
        found = False

        while queue:
            _, current_cost, row, col = heapq.heappop(queue)
            if closed[row, col]:
                continue
            if current_cost > g_score[row, col]:
                continue

            if (row, col) == (er, ec):
                found = True
                break

            closed[row, col] = True
            explored += 1
            if explored >= self.max_explored:
                raise GlobalRouteError(
                    f"Global search reached its {self.max_explored:,}-node limit. "
                    "Try a coarser global grid or a different route."
                )

            for rr, cc, dr, dc in self._neighbors(row, col, height, width):
                if closed[rr, cc] or not allowed[rr, cc]:
                    continue

                # Prevent diagonal corner cutting through blocked cells.
                if dr and dc:
                    side_a = (row, cc)
                    side_b = (rr, col)
                    if not allowed[side_a] or not allowed[side_b]:
                        continue

                step = step_distance(row, rr, dr, dc)
                local_slope = max(float(slope[row, col]), float(slope[rr, cc]))
                multiplier = 1.0 + self.slope_penalty * (
                    local_slope / max(self.max_slope_deg, 0.1)
                ) ** 2
                new_cost = current_cost + step * multiplier

                if new_cost < g_score[rr, cc]:
                    g_score[rr, cc] = new_cost
                    parent[rr * width + cc] = row * width + col
                    heapq.heappush(
                        queue,
                        (new_cost + heuristic(rr, cc), new_cost, rr, cc),
                    )

        if not found:
            raise GlobalRouteError(
                "No global route found within the explored area and slope constraints."
            )

        # Reconstruct the path from compact integer cell identifiers.
        path_ids = [er * width + ec]
        while path_ids[-1] != sr * width + sc:
            previous = int(parent[path_ids[-1]])
            if previous < 0:
                raise GlobalRouteError("Could not reconstruct the global route.")
            path_ids.append(previous)
        path_ids.reverse()

        route = []
        profile = []
        distance_m = 0.0
        previous_coordinate = None
        for index, cell_id in enumerate(path_ids):
            row, col = divmod(cell_id, width)
            x, y = self.ds.transform * (col + 0.5, row + 0.5)
            lon, lat = self.to_geographic.transform(x, y)
            point = {
                "latitude": float(lat),
                "longitude": normalize_lon(float(lon)),
            }
            if index == 0:
                point = {"latitude": start.latitude, "longitude": start.longitude}
            elif index == len(path_ids) - 1:
                point = {
                    "latitude": destination.latitude,
                    "longitude": destination.longitude,
                }

            if previous_coordinate is not None:
                distance_m += haversine_m(
                    previous_coordinate["latitude"],
                    previous_coordinate["longitude"],
                    point["latitude"],
                    point["longitude"],
                )
            route.append(point)
            profile.append({
                "distance_km": round(distance_m / 1000.0, 3),
                "elevation_m": round(float(elevation[row, col]), 2),
                "slope_deg": round(float(slope[row, col]), 2),
            })
            previous_coordinate = point

        return {
            "status": "success",
            "planner": "global_mola_coarse_astar",
            "route": route,
            "elevation_profile": profile,
            "summary": {
                "straight_line_distance_km": round(straight_m / 1000.0, 3),
                "coarse_route_distance_km": round(distance_m / 1000.0, 3),
                "total_points": len(route),
                "explored_nodes": explored,
                "grid_dimensions": {"width": width, "height": height},
                "global_grid_resolution_km": {
                    "x": round(pixel_x_m / 1000.0, 3),
                    "y": round(pixel_y_m / 1000.0, 3),
                },
                "slope_limit_deg": self.max_slope_deg,
                "calculation_seconds": round(time.perf_counter() - started, 3),
            },
            "data_quality": {
                "elevation_source": "MOLA coarse average-resampled overview",
                "nominal_resolution": "approximately 10 km per cell; see actual grid metadata",
                "purpose": "broad global corridor planning only",
                "safety_status": "not crew-safety certified",
                "warnings": [
                    "This is a coarse global corridor, not a locally refined route.",
                    "Small craters, rocks, slopes and astronaut-scale hazards are unresolved.",
                    "NoData cells are treated as impassable, not safe.",
                    "The global grid is equirectangular; distance and slope estimates are approximate, especially near the poles.",
                    "The regional MOLA planner should refine this corridor before mission use.",
                ],
            },
        }
