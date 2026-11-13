from pydantic import BaseModel, Field, model_validator

class Coordinate(BaseModel):
    latitude: float = Field(ge=-90,le=90)
    longitude: float = Field(ge=-180,le=180)

class RouteRequest(BaseModel):
    start: Coordinate
    destination: Coordinate
    max_slope_deg: float = Field(default=20,gt=0,le=90)
    max_distance_km: float = Field(default=250,gt=0,le=2000)
    slope_penalty: float = Field(default=3,ge=0,le=100)

class AlternativeRoutesRequest(BaseModel):
    start: Coordinate
    destination: Coordinate
    max_slope_deg: float = Field(default=20,gt=0,le=90)
    max_distance_km: float = Field(default=250,gt=0,le=2000)
    slope_penalties: list[float] = Field(default=[0.5,3.0,10.0],min_length=2,max_length=5)

    @model_validator(mode="after")
    def validate_penalties(self):
        if any(x < 0 or x > 100 for x in self.slope_penalties):
            raise ValueError("slope penalties must be between 0 and 100")
        return self

class MissionPlanRequest(BaseModel):
    start: Coordinate
    targets: list[Coordinate] = Field(min_length=1,max_length=12)
    max_slope_deg: float = Field(default=20,gt=0,le=90)
    max_distance_km_per_leg: float = Field(default=100,gt=0,le=500)
    travel_mode: str = "astronaut"
    estimated_speed_kmh: float | None = Field(default=None,gt=0,le=100)
    optimize_order: bool = True
    return_to_start: bool = True

    @model_validator(mode="after")
    def validate_mode(self):
        if self.travel_mode not in {"astronaut","rover","custom"}:
            raise ValueError("travel_mode must be astronaut, rover, or custom")
        if self.travel_mode == "custom" and self.estimated_speed_kmh is None:
            raise ValueError("estimated_speed_kmh required for custom mode")
        return self


class GlobalRouteRequest(BaseModel):
    start: Coordinate
    destination: Coordinate
    max_explored_nodes: int | None = Field(default=None, ge=1000, le=2000000)


class HierarchicalRouteRequest(BaseModel):
    start: Coordinate
    destination: Coordinate
    max_leg_km: float = Field(default=100, gt=0, le=200)
    max_slope_deg: float = Field(default=25, gt=0, le=90)
    slope_penalty: float = Field(default=3, ge=0, le=100)
    max_retry_slope_deg: float = Field(default=40, gt=0, le=90)
    retry_step_deg: float = Field(default=1, gt=0, le=10)


class VersionedRouteRequest(BaseModel):
    planner_version: str = Field(default="v9", pattern="^(v5|v6|v7|v9)$")
    start: Coordinate
    destination: Coordinate
    max_leg_km: float = Field(default=100, gt=0, le=200)
    max_slope_deg: float = Field(default=25, gt=0, le=90)
    slope_penalty: float = Field(default=3, ge=0, le=100)
    slope_retry_steps: list[float] = Field(default=[5, 10], min_length=0, max_length=5)
    max_retry_slope_deg: float = Field(default=40, gt=0, le=90)
    retry_step_deg: float = Field(default=1, gt=0, le=10)


class RouteCompareRequest(BaseModel):
    versions: list[str] = Field(default=["v5", "v6", "v7", "v9"], min_length=1, max_length=4)
    start: Coordinate
    destination: Coordinate
    max_leg_km: float = Field(default=100, gt=0, le=200)
    max_slope_deg: float = Field(default=25, gt=0, le=90)
    slope_penalty: float = Field(default=3, ge=0, le=100)
    slope_retry_steps: list[float] = Field(default=[5, 10], min_length=0, max_length=5)
    max_retry_slope_deg: float = Field(default=40, gt=0, le=90)
    retry_step_deg: float = Field(default=1, gt=0, le=10)

    @model_validator(mode="after")
    def validate_versions(self):
        allowed = {"v5", "v6", "v7", "v9"}
        if len(set(self.versions)) != len(self.versions) or any(v not in allowed for v in self.versions):
            raise ValueError("versions must be unique values from v5, v6, v7, v9")
        return self


class SectionDiagnosticRequest(BaseModel):
    start: Coordinate
    destination: Coordinate
    max_slope_deg: float = Field(default=25, gt=0, le=90)
