import heapq,math,os,time
import numpy as np
from rasterio.enums import Resampling
from rasterio.windows import Window
from rasterio.transform import rowcol,Affine
from pyproj import Transformer
from schemas import Coordinate
from services.geo import haversine_m,normalize_lon

class RoutePlanningError(ValueError): pass

class RoutingService:
    def __init__(self,ds):
        self.ds=ds
        self.to_projected=Transformer.from_crs(ds.crs.geodetic_crs,ds.crs,always_xy=True)
        self.to_geographic=Transformer.from_crs(ds.crs,ds.crs.geodetic_crs,always_xy=True)
        self.max_cells=int(os.getenv("MAX_GRID_CELLS","400000"))
        self.margin=int(os.getenv("ROUTE_MARGIN_PIXELS","80"))
    def _grid(self,a,b):
        sx,sy=self.to_projected.transform(a.longitude,a.latitude)
        ex,ey=self.to_projected.transform(b.longitude,b.latitude)
        sr,sc=rowcol(self.ds.transform,sx,sy); er,ec=rowcol(self.ds.transform,ex,ey)
        for label,r,c in (("start",sr,sc),("destination",er,ec)):
            if r<0 or c<0 or r>=self.ds.height or c>=self.ds.width:
                raise RoutePlanningError(f"{label} outside MOLA raster coverage.")
        r0=max(0,min(sr,er)-self.margin); c0=max(0,min(sc,ec)-self.margin)
        r1=min(self.ds.height,max(sr,er)+self.margin+1); c1=min(self.ds.width,max(sc,ec)+self.margin+1)
        win=Window(c0,r0,c1-c0,r1-r0); area=int(win.width*win.height)
        factor=max(1,int(math.ceil(math.sqrt(area/self.max_cells))))
        h=max(2,int(math.ceil(win.height/factor))); w=max(2,int(math.ceil(win.width/factor)))
        masked=self.ds.read(1,window=win,out_shape=(h,w),resampling=Resampling.average,masked=True)
        z=masked.astype(np.float32).filled(np.nan)
        trans=self.ds.window_transform(win)*Affine.scale(win.width/w,win.height/h)
        return z,trans,tuple(map(int,rowcol(trans,sx,sy))),tuple(map(int,rowcol(trans,ex,ey))),factor
    @staticmethod
    def _neighbors(r,c,h,w):
        for dr,dc in ((-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)):
            rr,cc=r+dr,c+dc
            if 0<=rr<h and 0<=cc<w: yield rr,cc,dr,dc
    def _astar(self,z,tr,start,end,max_slope,penalty):
        h,w=z.shape; sr,sc=start; er,ec=end
        if not(0<=sr<h and 0<=sc<w and 0<=er<h and 0<=ec<w): raise RoutePlanningError("Endpoint outside extracted grid.")
        valid=np.isfinite(z)
        if not valid[sr,sc] or not valid[er,ec]: raise RoutePlanningError("Endpoint lies on MOLA NoData.")
        x,y=tr*(sc+.5,sr+.5); _,lat=self.to_geographic.transform(x,y)
        dx=abs(tr.a)*max(.05,abs(math.cos(math.radians(lat)))); dy=abs(tr.e)
        filled=np.where(valid,z,np.nan_to_num(z,nan=0.0))
        gy,gx=np.gradient(filled,dy,dx)
        slope=np.degrees(np.arctan(np.hypot(gx,gy)))
        allowed=valid & np.isfinite(slope) & (slope<=max_slope)
        allowed[sr,sc]=allowed[er,ec]=True
        def heuristic(r,c): return math.hypot((er-r)*dy,(ec-c)*dx)
        g={(sr,sc):0.0}; parent={}; q=[(heuristic(sr,sc),0.0,sr,sc)]; closed=set(); explored=0
        while q:
            _,cost,r,c=heapq.heappop(q); node=(r,c)
            if node in closed: continue
            if node==(er,ec):
                path=[node]
                while path[-1] in parent:path.append(parent[path[-1]])
                path.reverse(); return path,explored,slope,cost
            closed.add(node); explored+=1
            for rr,cc,dr,dc in self._neighbors(r,c,h,w):
                nxt=(rr,cc)
                if nxt in closed or not allowed[rr,cc]: continue
                if dr and dc and (not allowed[r,cc] or not allowed[rr,c]): continue
                step=math.hypot(dx if dc else 0,dy if dr else 0)
                local=max(float(slope[r,c]),float(slope[rr,cc]))
                mult=1+penalty*(local/max(max_slope,.1))**2
                ng=cost+step*mult
                if ng<g.get(nxt,float("inf")):
                    g[nxt]=ng;parent[nxt]=node;heapq.heappush(q,(ng+heuristic(rr,cc),ng,rr,cc))
        raise RoutePlanningError(f"No route found below {max_slope}° maximum slope.")
    def plan(self,start,destination,max_slope_deg=20,max_distance_km=250,slope_penalty=3):
        t0=time.perf_counter()
        straight=haversine_m(start.latitude,start.longitude,destination.latitude,destination.longitude)
        if straight>max_distance_km*1000: raise RoutePlanningError(f"Straight distance {straight/1000:.2f} km exceeds {max_distance_km} km limit.")
        z,tr,sr,er,factor=self._grid(start,destination)
        path,explored,slope,cost=self._astar(z,tr,sr,er,max_slope_deg,slope_penalty)
        coords=[];zs=[];slopes=[]
        for r,c in path:
            x,y=tr*(c+.5,r+.5);lon,lat=self.to_geographic.transform(x,y)
            coords.append({"latitude":float(lat),"longitude":normalize_lon(float(lon))})
            zs.append(float(z[r,c]));slopes.append(float(slope[r,c]))
        coords[0]={"latitude":start.latitude,"longitude":start.longitude}
        coords[-1]={"latitude":destination.latitude,"longitude":destination.longitude}
        profile=[];dist=0
        for i,p in enumerate(coords):
            if i: dist+=haversine_m(coords[i-1]["latitude"],coords[i-1]["longitude"],p["latitude"],p["longitude"])
            profile.append({"distance_km":round(dist/1000,3),"elevation":round(zs[i],2),
                            "latitude":p["latitude"],"longitude":p["longitude"],"slope_deg":round(slopes[i],2)})
        gain=sum(max(0,zs[i]-zs[i-1]) for i in range(1,len(zs)))
        loss=sum(max(0,zs[i-1]-zs[i]) for i in range(1,len(zs)))
        route_km=dist/1000
        return {"status":"success","route":coords,"elevation_profile":profile,
          "summary":{"total_points":len(coords),"straight_line_distance_km":round(straight/1000,3),
          "route_distance_km":round(route_km,3),"route_efficiency_percent":round(straight/dist*100,2) if dist else 100,
          "total_cost":round(cost,2),"total_cost_unit":"slope-weighted metres (prototype)",
          "explored_nodes":explored,"grid_dimensions":{"width":z.shape[1],"height":z.shape[0]},
          "downsample_factor_approx":factor,"max_slope_deg":max_slope_deg,
          "maximum_route_slope_deg":round(max(slopes),2),"mean_route_slope_deg":round(float(np.mean(slopes)),2),
          "elevation_gain_m":round(gain,2),"elevation_loss_m":round(loss,2),
          "calculation_seconds":round(time.perf_counter()-t0,3)},
          "data_quality":{"elevation_source":"MOLA","nominal_resolution_m_per_pixel":round((abs(self.ds.transform.a)+abs(self.ds.transform.e))/2,2),
          "hazard_detection":"not resolved by global MOLA","safety_status":"prototype route; not crew-safety certified",
          "warnings":["MOLA global elevation is about 463 m/pixel; astronaut-scale obstacles are unresolved.",
          "Slope is computed on the sampled grid and can miss small terrain features.",
          "NoData is impassable and must not be interpreted as safe terrain.",
          "Slope-weighted cost is not a validated mobility or energy model."]}}


    def diagnose_region(self, start, destination, max_slope_deg=25.0):
        """Inspect regional MOLA sampling and slope-grid connectivity without routing."""
        from collections import deque

        z, tr, start_rc, end_rc, factor = self._grid(start, destination)
        h, w = z.shape
        valid = np.isfinite(z)

        def slope_grid():
            x0, y0 = tr * (start_rc[1] + .5, start_rc[0] + .5)
            _, start_lat = self.to_geographic.transform(x0, y0)
            dx = abs(tr.a) * max(.05, abs(math.cos(math.radians(start_lat))))
            dy = abs(tr.e)
            # Match the current A* implementation exactly so this diagnoses
            # its sampled slope surface rather than a different calculation.
            filled = np.where(valid, z, np.nan_to_num(z, nan=0.0))
            gy, gx = np.gradient(filled, dy, dx)
            return np.degrees(np.arctan(np.hypot(gx, gy)))

        slope = slope_grid()
        sr, sc = start_rc
        er, ec = end_rc

        def endpoint_info(label, rc):
            r, c = rc
            r0, r1 = max(0, r - 1), min(h, r + 2)
            c0, c1 = max(0, c - 1), min(w, c + 2)
            local_valid = valid[r0:r1, c0:c1]
            local_slopes = slope[r0:r1, c0:c1][local_valid]
            return {
                "label": label,
                "grid_row": int(r),
                "grid_col": int(c),
                "is_nodata": not bool(valid[r, c]),
                "elevation_m": float(z[r, c]) if valid[r, c] else None,
                "sampled_slope_deg": float(slope[r, c]) if valid[r, c] else None,
                "local_3x3_valid_cells": int(local_valid.sum()),
                "local_3x3_nodata_cells": int(local_valid.size - local_valid.sum()),
                "local_3x3_min_slope_deg": float(np.min(local_slopes)) if local_slopes.size else None,
                "local_3x3_max_slope_deg": float(np.max(local_slopes)) if local_slopes.size else None,
            }

        allowed = valid & np.isfinite(slope) & (slope <= max_slope_deg)
        start_valid = bool(0 <= sr < h and 0 <= sc < w and valid[sr, sc])
        end_valid = bool(0 <= er < h and 0 <= ec < w and valid[er, ec])
        connected = False
        visited_count = 0
        if start_valid and end_valid:
            # A* explicitly permits its two endpoint cells even if their own
            # sampled slope exceeds the threshold. Mirror that behavior here.
            allowed[sr, sc] = True
            allowed[er, ec] = True
            queue = deque([(sr, sc)])
            seen = {(sr, sc)}
            while queue:
                r, c = queue.popleft()
                visited_count += 1
                if (r, c) == (er, ec):
                    connected = True
                    break
                for dr, dc in ((-1,0),(1,0),(0,-1),(0,1),(-1,-1),(-1,1),(1,-1),(1,1)):
                    rr, cc = r + dr, c + dc
                    if not (0 <= rr < h and 0 <= cc < w):
                        continue
                    if (rr, cc) in seen or not allowed[rr, cc]:
                        continue
                    if dr and dc and (not allowed[r, cc] or not allowed[rr, c]):
                        continue
                    seen.add((rr, cc))
                    queue.append((rr, cc))

        valid_slopes = slope[valid & np.isfinite(slope)]
        if valid_slopes.size:
            percentiles = np.percentile(valid_slopes, [50, 75, 90, 95, 99])
            slope_stats = {
                "min_deg": float(np.min(valid_slopes)),
                "median_deg": float(percentiles[0]),
                "p75_deg": float(percentiles[1]),
                "p90_deg": float(percentiles[2]),
                "p95_deg": float(percentiles[3]),
                "p99_deg": float(percentiles[4]),
                "max_deg": float(np.max(valid_slopes)),
            }
        else:
            slope_stats = None

        total_cells = int(h * w)
        valid_count = int(valid.sum())
        allowed_count = int(allowed.sum()) if start_valid and end_valid else int((valid & (slope <= max_slope_deg)).sum())
        return {
            "status": "diagnostic_complete",
            "diagnostic": "regional_mola_slope_connectivity",
            "requested_max_slope_deg": float(max_slope_deg),
            "grid": {
                "width": int(w),
                "height": int(h),
                "total_cells": total_cells,
                "valid_cells": valid_count,
                "nodata_cells": total_cells - valid_count,
                "nodata_percent": round((total_cells - valid_count) / total_cells * 100, 4) if total_cells else 0,
                "approx_downsample_factor": int(factor),
                "nominal_source_resolution_m": round((abs(self.ds.transform.a) + abs(self.ds.transform.e)) / 2, 2),
            },
            "slope_statistics_deg": slope_stats,
            "threshold_analysis": {
                "allowed_cells_including_endpoint_override": allowed_count,
                "reachable_under_current_neighbor_rules": connected,
                "connectivity_cells_visited": visited_count,
                "note": "Connectivity uses the same sampled slope grid and diagonal corner-cut rule as the current A* implementation. This is a software diagnostic, not a terrain-safety assessment."
            },
            "start": endpoint_info("start", start_rc),
            "destination": endpoint_info("destination", end_rc),
            "warnings": [
                "Slope is calculated on the regional grid sampled by the current A* implementation.",
                "NoData is unknown terrain, not safe terrain.",
                "Endpoint cells are permitted by the current A* implementation even when their own sampled slope exceeds the threshold.",
                "MOLA resolution cannot resolve astronaut-scale hazards."
            ]
        }


    def contains_valid_coordinate(self, coordinate):
        """
        Return True only when a coordinate falls on a valid pixel
        in this routing service's raster.
        """
        x, y = self.to_projected.transform(
            coordinate.longitude,
            coordinate.latitude
        )

        row, col = self.ds.index(x, y)

        if not (0 <= row < self.ds.height and 0 <= col < self.ds.width):
            return False

        sample = next(
            self.ds.sample([(x, y)], indexes=1, masked=True)
        )

        value = sample[0]

        return (
            not np.ma.is_masked(value)
            and np.isfinite(float(value))
        )

    def add_elevations(self, points):
        """
        Attach MOLA elevation to each route point.

        Uses the already-open raster dataset.
        Returns None for NoData or points outside raster coverage.
        """
        if not points:
            return []

        projected_points = []

        for point in points:
            x, y = self.to_projected.transform(
                point["longitude"],
                point["latitude"],
            )
            projected_points.append((x, y))

        enriched_points = []

        for point, sample in zip(
            points,
            self.ds.sample(projected_points, indexes=1, masked=True),
        ):
            elevation = None

            if not np.ma.is_masked(sample[0]):
                value = float(sample[0])

                if np.isfinite(value):
                    elevation = round(value, 2)

            enriched_points.append({
                **point,
                "elevation_m": elevation,
            })

        return enriched_points
