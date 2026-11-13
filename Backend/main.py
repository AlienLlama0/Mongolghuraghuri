from __future__ import annotations
import logging, os
from contextlib import asynccontextmanager
from pathlib import Path

import rasterio
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware

from schemas import Coordinate, RouteRequest, MissionPlanRequest, AlternativeRoutesRequest, GlobalRouteRequest, HierarchicalRouteRequest, VersionedRouteRequest, RouteCompareRequest, SectionDiagnosticRequest
from services.terrain_service import TerrainService
from services.routing_service import RoutingService, RoutePlanningError
from services.science_service import ScienceService
from services.mission_service import MissionService
from services.global_routing_service import GlobalRoutingService, GlobalRouteError
from services.v9_hierarchical import V9HierarchicalRouteService
from services.dataset_service import DatasetRegistry
from services.version_lab import VersionLab

logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))
logger = logging.getLogger("marswalk")
BASE = Path(__file__).resolve().parent
MOLA_PATH = Path(os.getenv("MOLA_PATH", str(BASE / "data" / "mola.tif")))
CTX_PATH = Path(
    os.getenv("CTX_DEM_PATH", str(BASE / "data" / "jezero_ctx_dem.tif"))
)
GLOBAL_MOLA_PATH = Path(os.getenv("GLOBAL_MOLA_PATH", str(BASE / "data" / "mola_global_coarse.tif")))
TARGETS_PATH = Path(os.getenv("SCIENCE_TARGETS_PATH", str(BASE / "data" / "science_targets.geojson")))
HAZARDS_PATH = Path(os.getenv("HAZARDS_PATH", str(BASE / "data" / "hazards.geojson")))

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.ds_registry = DatasetRegistry(BASE)
    app.state.science = ScienceService(TARGETS_PATH, HAZARDS_PATH)
    app.state.ctx_dataset = None
    app.state.ctx_routing = None
    app.state.global_mola_dataset = None
    app.state.global_routing = None
    app.state.hierarchical_routing = None
    app.state.version_lab = None
    app.state.terrain = None
    app.state.routing = None
    app.state.mission = None
    if MOLA_PATH.exists():
        try:
            ds = rasterio.open(MOLA_PATH)
            app.state.mola_dataset = ds
            app.state.terrain = TerrainService(ds)
            app.state.routing = RoutingService(ds)
            app.state.mission = MissionService(app.state.routing, app.state.science)
            logger.info("MOLA loaded: %s (%s x %s)", MOLA_PATH, ds.width, ds.height)
        except Exception:
            logger.exception("Could not load MOLA at %s", MOLA_PATH)
    else:
        logger.warning("MOLA missing at %s; terrain routes unavailable", MOLA_PATH)
    if CTX_PATH.exists():
        try:
            ctx_ds = rasterio.open(CTX_PATH)
            app.state.ctx_dataset = ctx_ds
            app.state.ctx_routing = RoutingService(ctx_ds)

            logger.info(
                "Jezero CTX DEM loaded: %s (%s x %s)",
                CTX_PATH,
                ctx_ds.width,
                ctx_ds.height
            )
        except Exception:
            logger.exception("Could not load CTX DEM at %s", CTX_PATH)
    else:
        logger.warning("CTX DEM missing at %s; CTX refinement unavailable", CTX_PATH)
    if GLOBAL_MOLA_PATH.exists():
        try:
            global_ds = rasterio.open(GLOBAL_MOLA_PATH)
            app.state.global_mola_dataset = global_ds
            app.state.global_routing = GlobalRoutingService(global_ds)
            if app.state.routing is not None:
                app.state.hierarchical_routing = V9HierarchicalRouteService(
                    app.state.global_routing,
                    app.state.routing,
                    ctx_planner=app.state.ctx_routing
                )
                app.state.version_lab = VersionLab(
                    app.state.global_routing,
                    app.state.routing,
                    ctx_planner=app.state.ctx_routing
                )
            logger.info("Global coarse MOLA loaded: %s (%s x %s)", GLOBAL_MOLA_PATH, global_ds.width, global_ds.height)
        except Exception:
            logger.exception("Could not load global MOLA overview at %s", GLOBAL_MOLA_PATH)
    else:
        logger.warning("Global coarse MOLA missing at %s; global route endpoint unavailable", GLOBAL_MOLA_PATH)
    yield
    if app.state.mola_dataset:
        app.state.mola_dataset.close()
    if app.state.ctx_dataset:
        app.state.ctx_dataset.close()
    if app.state.global_mola_dataset:
        app.state.global_mola_dataset.close()

app = FastAPI(
    title="Marswalk Exploration Planning API",
    version="9.0.0",
    description="Modular Mars geospatial exploration prototype. Not a certified crew-safety system.",
    lifespan=lifespan,
)
origins = [x.strip() for x in os.getenv(
    "CORS_ORIGINS",
    "http://localhost:8795,http://127.0.0.1:8795,http://localhost:3000,http://127.0.0.1:3000"
).split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True,
                   allow_methods=["*"], allow_headers=["*"])

def terrain_or_503(request):
    if request.app.state.terrain is None or request.app.state.routing is None:
        raise HTTPException(503, f"MOLA not loaded. Expected: {MOLA_PATH}")
    return request.app.state.terrain, request.app.state.routing

@app.get("/")
def root():
    return {"status":"online","service":"Marswalk Exploration Planning API","version":"9.0.0", "version_lab":"v9","docs":"/docs"}

@app.get("/api/health")
def health(request: Request):
    ds = request.app.state.mola_dataset
    return {
        "status":"online", "version":"9.0.0", "version_lab":"v9", "mola_loaded": ds is not None,
        "mola_path":str(MOLA_PATH),

        # CTX DEM status
        "ctx_loaded": request.app.state.ctx_dataset is not None,
        "ctx_path": str(CTX_PATH),
        "ctx_routing_available": request.app.state.ctx_routing is not None,

        "global_mola_loaded": request.app.state.global_mola_dataset is not None,
        "global_mola_loaded":request.app.state.global_mola_dataset is not None,
        "global_mola_path":str(GLOBAL_MOLA_PATH),
        "hierarchical_routing_available":request.app.state.hierarchical_routing is not None,
        "version_lab_available":request.app.state.version_lab is not None,
        "available_planner_versions":["v5","v6","v7","v9"],
        "mola_dimensions":{"width":ds.width,"height":ds.height} if ds else None,
        "mola_crs":str(ds.crs) if ds else None,
        "datasets":request.app.state.ds_registry.status(),
        "science_targets_loaded":request.app.state.science.targets_loaded,
        "hazards_loaded":request.app.state.science.hazards_loaded,
        "safety_notice":"Prototype output only. No route is certified safe for crew operations."
    }

@app.get("/api/datasets")
def datasets(request: Request):
    return request.app.state.ds_registry.list_datasets()

@app.get("/api/datasets/{dataset_id}")
def dataset_details(dataset_id: str, request: Request):
    try: return request.app.state.ds_registry.describe(dataset_id)
    except KeyError: raise HTTPException(404, "Unknown dataset identifier.")

@app.get("/api/datasets/{dataset_id}/sample")
def sample_dataset(
    dataset_id: str, request: Request,
    latitude: float = Query(..., ge=-90, le=90),
    longitude: float = Query(..., ge=-180, le=180),
):
    try: return request.app.state.ds_registry.sample(dataset_id, latitude, longitude)
    except KeyError: raise HTTPException(404, "Unknown dataset identifier.")
    except FileNotFoundError as e: raise HTTPException(404, str(e))
    except ValueError as e: raise HTTPException(422, str(e))




@app.post("/api/route/diagnose-section")
def diagnose_route_section(payload: SectionDiagnosticRequest, request: Request):
    if request.app.state.routing is None:
        raise HTTPException(503, f"MOLA not loaded. Expected: {MOLA_PATH}")
    try:
        return request.app.state.routing.diagnose_region(
            payload.start, payload.destination, max_slope_deg=payload.max_slope_deg
        )
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception:
        logger.exception("Regional route diagnostic failed")
        raise HTTPException(500, "Regional diagnostic failed; inspect backend logs.")

@app.post("/api/route/versioned")
def versioned_route(payload: VersionedRouteRequest, request: Request):
    lab=request.app.state.version_lab
    if lab is None: raise HTTPException(503, "Both MOLA rasters must be loaded before versioned routing.")
    try:
        return lab.run(payload.planner_version,payload.start,payload.destination,
            max_leg_km=payload.max_leg_km,max_slope_deg=payload.max_slope_deg,
            slope_penalty=payload.slope_penalty,slope_retry_steps=payload.slope_retry_steps,
            max_retry_slope_deg=payload.max_retry_slope_deg,retry_step_deg=payload.retry_step_deg)
    except ValueError as e: raise HTTPException(422,str(e))
    except Exception:
        logger.exception("Versioned route planning failed")
        raise HTTPException(500,"Versioned route planning failed; inspect backend logs.")

@app.post("/api/route/compare")
def compare_routes(payload: RouteCompareRequest, request: Request):
    lab=request.app.state.version_lab
    if lab is None: raise HTTPException(503, "Both MOLA rasters must be loaded before version comparison.")
    results=[]
    for version in payload.versions:
        try:
            result=lab.run(version,payload.start,payload.destination,
                max_leg_km=payload.max_leg_km,max_slope_deg=payload.max_slope_deg,
                slope_penalty=payload.slope_penalty,slope_retry_steps=payload.slope_retry_steps,
                max_retry_slope_deg=payload.max_retry_slope_deg,retry_step_deg=payload.retry_step_deg)
            results.append({"version":version,"metrics":lab.metrics(result),"result":result})
        except Exception as e:
            results.append({"version":version,"status":"unavailable","reason":str(e)})
    return {"comparison":"same coordinates, rasters and process","versions_tested":payload.versions,
        "results":results,"notice":"Timings vary with run order, cache and machine load. Prototype routes are not safety-certified."}

@app.post("/api/route/global")
def global_route(payload: GlobalRouteRequest, request: Request):
    planner = request.app.state.global_routing
    if planner is None:
        raise HTTPException(
            503,
            f"Global coarse MOLA grid not loaded. Generate it first: {GLOBAL_MOLA_PATH}"
        )
    try:
        return planner.plan(payload.start, payload.destination)
    except GlobalRouteError as e:
        raise HTTPException(422, str(e))
    except Exception:
        logger.exception("Global route planning failed")
        raise HTTPException(500, "Global route planning failed; inspect backend logs.")


@app.post("/api/route/hierarchical")
def hierarchical_route(payload: HierarchicalRouteRequest, request: Request):
    planner = request.app.state.hierarchical_routing
    if planner is None:
        raise HTTPException(
            503,
            "Both original MOLA and the coarse global MOLA grid must be loaded."
        )
    try:
        return planner.plan(
            payload.start,
            payload.destination,
            max_leg_km=payload.max_leg_km,
            max_slope_deg=payload.max_slope_deg,
            slope_penalty=payload.slope_penalty,
            max_retry_slope_deg=payload.max_retry_slope_deg,
            retry_step_deg=payload.retry_step_deg,
        )
    except ValueError as e:
        raise HTTPException(422, str(e))
    except Exception:
        logger.exception("Hierarchical route planning failed")
        raise HTTPException(500, "Hierarchical route planning failed; inspect backend logs.")


@app.post("/api/route")
def route(payload: RouteRequest, request: Request):
    _, planner = terrain_or_503(request)
    try:
        return planner.plan(payload.start, payload.destination,
            max_slope_deg=payload.max_slope_deg,
            max_distance_km=payload.max_distance_km,
            slope_penalty=payload.slope_penalty)
    except RoutePlanningError as e: raise HTTPException(422, str(e))
    except Exception:
        logger.exception("Route planning failed")
        raise HTTPException(500, "Route planning failed; inspect backend logs.")

@app.post("/api/routes/alternatives")
def alternatives(payload: AlternativeRoutesRequest, request: Request):
    _, planner = terrain_or_503(request)
    results = []
    for penalty in payload.slope_penalties:
        try:
            result = planner.plan(payload.start, payload.destination,
                max_slope_deg=payload.max_slope_deg,
                max_distance_km=payload.max_distance_km,
                slope_penalty=penalty)
            result["alternative_label"] = f"slope_preference_{penalty:g}"
            results.append(result)
        except RoutePlanningError as e:
            results.append({"status":"unavailable","slope_penalty":penalty,"reason":str(e)})
    return {"alternatives":results,"count":len(results),
            "notice":"These are cost-preference variants on the same MOLA grid, not independently validated safe routes."}

@app.get("/api/terrain/elevation")
def elevation(request: Request, latitude: float=Query(...,ge=-90,le=90),
              longitude: float=Query(...,ge=-180,le=180)):
    terrain, _ = terrain_or_503(request)
    try: return terrain.elevation(Coordinate(latitude=latitude,longitude=longitude))
    except ValueError as e: raise HTTPException(422,str(e))

@app.get("/api/terrain/profile")
def profile(request: Request,
    start_latitude: float=Query(...,ge=-90,le=90), start_longitude: float=Query(...,ge=-180,le=180),
    end_latitude: float=Query(...,ge=-90,le=90), end_longitude: float=Query(...,ge=-180,le=180),
    samples: int=Query(100,ge=2,le=500)):
    terrain, _ = terrain_or_503(request)
    try:
        return terrain.profile(Coordinate(latitude=start_latitude,longitude=start_longitude),
            Coordinate(latitude=end_latitude,longitude=end_longitude),samples)
    except ValueError as e: raise HTTPException(422,str(e))

@app.get("/api/science/targets")
def targets(request: Request,
    min_latitude: float=Query(-90,ge=-90,le=90), min_longitude: float=Query(-180,ge=-180,le=180),
    max_latitude: float=Query(90,ge=-90,le=90), max_longitude: float=Query(180,ge=-180,le=180)):
    if min_latitude>max_latitude or min_longitude>max_longitude: raise HTTPException(422,"Invalid bounds.")
    return request.app.state.science.targets_in_bounds(min_latitude,min_longitude,max_latitude,max_longitude)

@app.get("/api/hazards")
def hazards(request: Request,
    min_latitude: float=Query(-90,ge=-90,le=90), min_longitude: float=Query(-180,ge=-180,le=180),
    max_latitude: float=Query(90,ge=-90,le=90), max_longitude: float=Query(180,ge=-180,le=180)):
    if min_latitude>max_latitude or min_longitude>max_longitude: raise HTTPException(422,"Invalid bounds.")
    return request.app.state.science.hazards_in_bounds(min_latitude,min_longitude,max_latitude,max_longitude)

@app.post("/api/mission/plan")
def mission(payload: MissionPlanRequest, request: Request):
    _, planner = terrain_or_503(request)
    try: return MissionService(planner,request.app.state.science).plan(payload)
    except (RoutePlanningError,ValueError) as e: raise HTTPException(422,str(e))
    except Exception:
        logger.exception("Mission planning failed")
        raise HTTPException(500,"Mission planning failed; inspect backend logs.")
