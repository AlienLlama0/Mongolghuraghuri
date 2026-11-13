import json
from pathlib import Path
class ScienceService:
    def __init__(self,targets_path,hazards_path):
        self.targets=self._load(targets_path);self.hazards=self._load(hazards_path)
    @staticmethod
    def _load(path):
        if not Path(path).exists(): return {"type":"FeatureCollection","features":[]}
        data=json.loads(Path(path).read_text(encoding="utf-8"))
        if data.get("type")!="FeatureCollection" or not isinstance(data.get("features"),list):
            raise ValueError(f"{path} must be a GeoJSON FeatureCollection")
        return data
    @property
    def targets_loaded(self): return bool(self.targets["features"])
    @property
    def hazards_loaded(self): return bool(self.hazards["features"])
    @staticmethod
    def _filter(fc,a,b,c,d):
        found=[]
        for f in fc["features"]:
            g=f.get("geometry") or {};xy=g.get("coordinates")
            if g.get("type")=="Point" and xy and b<=xy[0]<=d and a<=xy[1]<=c:found.append(f)
        return {"type":"FeatureCollection","count":len(found),"features":found}
    def targets_in_bounds(self,a,b,c,d):return self._filter(self.targets,a,b,c,d)
    def hazards_in_bounds(self,a,b,c,d):return self._filter(self.hazards,a,b,c,d)
