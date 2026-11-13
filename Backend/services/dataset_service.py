"""Optional raster registry for local NASA-derived products. No products are bundled."""
from pathlib import Path
import os
import rasterio
from pyproj import Transformer

DATASETS = {
    "mola": ("MOLA", "data/mola.tif", "regional elevation baseline"),
    "hirise_dtm": ("HiRISE DTM", "data/hirise_dtm.tif", "high-resolution local elevation, if supplied"),
    "ctx": ("CTX", "data/ctx.tif", "CTX image/product raster, if supplied"),
    "crism": ("CRISM", "data/crism.tif", "CRISM derived spectral/mineral index raster, if supplied"),
    "themis": ("THEMIS", "data/themis.tif", "THEMIS thermal product raster, if supplied"),
}

class DatasetRegistry:
    def __init__(self, base: Path):
        self.base=base
        self.paths={}
        for key,(_,default,_) in DATASETS.items():
            env=os.getenv(f"DATASET_{key.upper()}_PATH")
            self.paths[key]=Path(env) if env else base/default
    def status(self):
        out={}
        for key,(name,_,purpose) in DATASETS.items():
            p=self.paths[key]
            out[key]={"name":name,"available":p.exists(),"path":str(p),
                      "purpose":purpose,"integration":"local raster sampling only" if p.exists() else "not installed"}
        return out
    def list_datasets(self):
        return {"datasets":[{"id":k,**v} for k,v in self.status().items()],
                "note":"Files are not included. Add correctly georeferenced products and preserve their source metadata."}
    def describe(self,key):
        if key not in DATASETS: raise KeyError(key)
        p=self.paths[key]
        result={"id":key,"name":DATASETS[key][0],"available":p.exists(),"path":str(p),"purpose":DATASETS[key][2]}
        if not p.exists(): return result
        with rasterio.open(p) as ds:
            result.update({"width":ds.width,"height":ds.height,"bands":ds.count,
                           "crs":str(ds.crs),"bounds":list(ds.bounds),
                           "resolution":list(ds.res),"nodata":ds.nodata,
                           "driver":ds.driver,"dtype":list(ds.dtypes)})
        return result
    def sample(self,key,latitude,longitude):
        if key not in DATASETS: raise KeyError(key)
        p=self.paths[key]
        if not p.exists(): raise FileNotFoundError(f"{key} raster is not installed at {p}")
        with rasterio.open(p) as ds:
            if ds.crs is None: raise ValueError("Raster has no CRS; cannot sample by latitude/longitude.")
            transformer=Transformer.from_crs(ds.crs.geodetic_crs,ds.crs,always_xy=True)
            x,y=transformer.transform(longitude,latitude)
            r,c=ds.index(x,y)
            if r<0 or c<0 or r>=ds.height or c>=ds.width: raise ValueError("Coordinate outside this product's raster extent.")
            vals=ds.read(window=((r,r+1),(c,c+1)),masked=True)[:,0,0]
            return {"dataset_id":key,"name":DATASETS[key][0],"latitude":latitude,"longitude":longitude,
                    "pixel":{"row":r,"column":c},
                    "band_values":[None if v is __import__("numpy").ma.masked or __import__("numpy").ma.is_masked(v) else float(v) for v in vals],
                    "crs":str(ds.crs),"nodata":ds.nodata,
                    "warning":"Single-pixel sample only; interpretation depends on the product's band definitions and calibration."}
