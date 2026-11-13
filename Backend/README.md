# Marswalk Backend V8.3 — Routing Quality Diagnostics

One backend, one dependency environment, one shared `data/` directory, and
three selectable routing engines (V5, V6, V7). V8 adds version selection and
same-input comparison without duplicating MOLA datasets.

## Setup once
Copy your existing `mola.tif` and `mola_global_coarse.tif` into this package's
`data/` folder. Do not regenerate the coarse file if you already have it.

```bash
uv sync
uv run uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Check `GET http://127.0.0.1:8000/api/health`; confirm `version_lab_available`
is true and `available_planner_versions` lists v5, v6 and v7.

## Select a version
`POST /api/route/versioned`

```json
{
  "planner_version": "v7",
  "start": {"latitude": 18.4, "longitude": 77.5},
  "destination": {"latitude": -5.4, "longitude": 137.8},
  "max_leg_km": 100,
  "max_slope_deg": 25,
  "slope_penalty": 3,
  "slope_retry_steps": [5, 10],
  "max_retry_slope_deg": 40
}
```
Set `planner_version` to `v5`, `v6` or `v7`. V5 is global coarse A*; V6 is
the original hierarchical planner; V7 adds transparent slope retries.

## Compare identical journeys
`POST /api/route/compare`

```json
{
  "versions": ["v5", "v6", "v7"],
  "start": {"latitude": 18.4, "longitude": 77.5},
  "destination": {"latitude": -5.4, "longitude": 137.8},
  "max_leg_km": 100,
  "max_slope_deg": 25,
  "slope_penalty": 3,
  "slope_retry_steps": [5, 10],
  "max_retry_slope_deg": 40
}
```
Choose a subset such as `["v6","v7"]`. The response includes full routes and compact metrics. V8.2 measures route distance from the complete returned polyline for every planner version. Hierarchical results separately report refined distance and coarse-fallback distance. If regional refinement fails, the planner now preserves the matching sequence of global-corridor vertices rather than connecting the section endpoints with a straight chord. Calls are sequential; timing varies with warm-up, cache and
system load. Repeat several times and compare medians for timing.

## Shared data
Required: `data/mola.tif` and `data/mola_global_coarse.tif`.
Optional: `hirise_dtm.tif`, `ctx.tif`, `crism.tif`, `themis.tif`, and GeoJSON.
Optional rasters are not automatically used in route costs. No NASA data is
bundled. Keep your original files unchanged.

## Existing endpoints
All V7 endpoints remain. V8 adds `/api/route/versioned` and
`/api/route/compare`.

## Limitations
MOLA cannot resolve astronaut-scale hazards. NoData is unknown, not safe.
V5 is coarse; V6/V7 refine with MOLA only. A relaxed V7 slope does not meet the
requested slope limit. No route is crew-safety certified.


## V8.2 reliability fields

For V6/V7 hierarchical results:
- `summary.returned_route_distance_km`: distance measured along the complete returned route geometry.
- `summary.regional_refined_distance_km`: sum of regional-refinement section geometry lengths.
- `summary.coarse_fallback_distance_km`: sum of coarse-corridor geometry lengths used for failed sections.
- `summary.route_distance_km`: alias of the complete returned-route distance.
- Each section reports its own `distance_km` and point count.
- Fallback sections also report `corridor_start_index` and `corridor_end_index`, making the preserved corridor slice traceable.

The comparison metric `route_distance_km` is measured from `result.route` for V5, V6 and V7. Timing remains planner-reported compute time and does not include a separate timing benchmark.


## V8.3 — Routing quality investigation

V8.3 adds `POST /api/route/diagnose-section`. It uses the same regional MOLA grid extraction, slope calculation, NoData mask, and diagonal corner-cut rule as the current regional A* planner. It reports:
- Regional grid dimensions, downsampling factor and NoData percentage.
- Slope distribution (minimum, median, p75, p90, p95, p99 and maximum).
- Start and destination cell elevation, sampled slope and local 3x3 neighborhood statistics.
- Whether the start and destination are connected through cells permitted by the requested slope threshold under the current A* neighbor rules.

This is diagnostic evidence about the current algorithm, not a guarantee that the terrain is physically traversable.

### Diagnose the known difficult final section

Use the exact V7 section-38 coordinates from the V8.2 response:

```json
{
  "start": {
    "latitude": -5.398429217422377,
    "longitude": 137.06949184861503
  },
  "destination": {
    "latitude": -5.4,
    "longitude": 137.8
  },
  "max_slope_deg": 25
}
```

Send to `POST /api/route/diagnose-section`.

### Test finer regional subdivisions without slope relaxation

Also run `POST /api/route/versioned` with planner_version `v7`, `max_leg_km` 25, `max_slope_deg` 25, `slope_retry_steps` `[]`, and `max_retry_slope_deg` 25. This tests whether shorter legs allow the route to be refined at the original 25-degree threshold. Compare it with the V8.2 baseline; more sections do not automatically mean a better route.

## V9 — minimum-threshold adaptive routing

V9 is available through `POST /api/route/versioned` with `planner_version: "v9"`.
It runs the global coarse MOLA corridor, then attempts each regional leg using
ascending slope limits. By default it tries 25°, 26°, 27° ... up to 40° and
stops at the first successful regional route. Set `retry_step_deg` and
`max_retry_slope_deg` to configure this sequence. The requested slope is always
attempted first and is reported separately from `used_max_slope_deg`.

Example request:

```json
{
  "planner_version": "v9",
  "start": {"latitude": 18.4, "longitude": 77.5},
  "destination": {"latitude": -5.4, "longitude": 137.8},
  "max_leg_km": 100,
  "max_slope_deg": 25,
  "slope_penalty": 3,
  "retry_step_deg": 1,
  "max_retry_slope_deg": 40
}
```

Each section reports `attempted_slope_limits_deg`, `retry_count`, and
`used_max_slope_deg` when refined. If every attempt fails, V9 uses the complete
corresponding slice of the global corridor geometry and marks it
`coarse_fallback`; it does not replace that segment with a straight chord.

Compare `v5`, `v6`, `v7`, and `v9` in one request using `POST /api/route/compare`.
V9 comparison metrics include the number of sections that required retries and
the total number of regional attempts.

V9 is a routing prototype, not a crew-safety system. A successful route at a
relaxed threshold does not satisfy the original slope constraint. MOLA does not
resolve astronaut-scale hazards, and its NoData areas remain unknown terrain.
