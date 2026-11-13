from schemas import Coordinate,MissionPlanRequest
from services.geo import haversine_m
from services.routing_service import RoutePlanningError

class MissionService:
    def __init__(self,routing,science):self.routing=routing;self.science=science
    def _order(self,start,targets,optimize):
        if not optimize:return list(range(len(targets)))
        remaining=set(range(len(targets)));order=[];current=start
        while remaining:
            nxt=min(remaining,key=lambda i:haversine_m(current.latitude,current.longitude,
                targets[i].latitude,targets[i].longitude))
            order.append(nxt);remaining.remove(nxt);current=targets[nxt]
        return order
    def plan(self,req:MissionPlanRequest):
        speed=req.estimated_speed_kmh or (2.0 if req.travel_mode=="astronaut" else 5.0)
        order=self._order(req.start,req.targets,req.optimize_order)
        current=req.start;legs=[];distance=cost=0.0
        sequence=[(i,req.targets[i]) for i in order]
        if req.return_to_start:sequence.append((-1,req.start))
        for n,(target_index,target) in enumerate(sequence,1):
            result=self.routing.plan(current,target,max_slope_deg=req.max_slope_deg,
                max_distance_km=req.max_distance_km_per_leg)
            s=result["summary"];distance+=s["route_distance_km"];cost+=s["total_cost"]
            legs.append({"leg":n,"target_index":target_index,"return_to_base":target_index==-1,
                "start":current.model_dump(),"destination":target.model_dump(),
                "route":result["route"],"elevation_profile":result["elevation_profile"],"summary":s})
            current=target
        hours=distance/speed
        return {"status":"success","travel_mode":req.travel_mode,"estimated_speed_kmh":speed,
            "waypoint_order":[i for i in order],"legs":legs,
            "summary":{"target_count":len(req.targets),"total_legs":len(legs),
            "includes_return_to_start":req.return_to_start,"total_route_distance_km":round(distance,3),
            "slope_weighted_cost":round(cost,2),"estimated_travel_hours":round(hours,2),
            "estimated_travel_days_at_4_hours_per_day":round(hours/4,2)},
            "limitations":["Waypoint order uses nearest-neighbour straight-line distance, not a globally optimal solver.",
            "Travel speed is an illustrative assumption, not an EVA/rover performance model.",
            "No life-support, power, radiation, thermal, communications, or weather constraints are modeled.",
            "Mission plan is not certified for crew operations."]}
