import math
import numpy as np
from rasterio.transform import rowcol
from pyproj import Transformer
from schemas import Coordinate
from services.geo import haversine_m,normalize_lon

class TerrainService:
    def __init__(self,dataset):
        self.ds=dataset
        if dataset.crs is None: raise ValueError("MOLA raster has no CRS.")
        self.to_projected=Transformer.from_crs(dataset.crs.geodetic_crs,dataset.crs,always_xy=True)
    def pixel(self,p):
        x,y=self.to_projected.transform(p.longitude,p.latitude)
        r,c=rowcol(self.ds.transform,x,y)
        if r<0 or c<0 or r>=self.ds.height or c>=self.ds.width:
            raise ValueError("Coordinate outside MOLA coverage.")
        return int(r),int(c)
    def elevation(self,p):
        r,c=self.pixel(p)
        v=self.ds.read(1,window=((r,r+1),(c,c+1)),masked=True)[0,0]
        if np.ma.is_masked(v) or not np.isfinite(float(v)): raise ValueError("NoData at coordinate.")
        return {"latitude":p.latitude,"longitude":p.longitude,"elevation_m":float(v),
                "raster_row":r,"raster_col":c,"source":"MOLA",
                "nominal_resolution_m":round((abs(self.ds.transform.a)+abs(self.ds.transform.e))/2,2)}
    def profile(self,start,end,samples=100):
        dist=haversine_m(start.latitude,start.longitude,end.latitude,end.longitude); out=[]
        for i in range(samples):
            t=i/(samples-1); lat=start.latitude+(end.latitude-start.latitude)*t
            lon=normalize_lon(start.longitude+(end.longitude-start.longitude)*t)
            try: z=self.elevation(Coordinate(latitude=lat,longitude=lon))["elevation_m"]
            except ValueError: z=None
            out.append({"distance_km":round(dist*t/1000,3),"latitude":lat,"longitude":lon,"elevation_m":z})
        return {"profile":out,"sample_count":samples,"straight_line_distance_km":round(dist/1000,3),
                "missing_samples":sum(x["elevation_m"] is None for x in out),"source":"MOLA"}
