import sys
from pathlib import Path
import numpy as np
from affine import Affine
from rasterio.crs import CRS

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from services.routing_service import RoutingService
from schemas import Coordinate


class FakeDataset:
    def __init__(self):
        self.crs = CRS.from_epsg(4326)
        self.transform = Affine(0.01, 0, -1, 0, -0.01, 1)
        self.width = 200
        self.height = 200
        self.data = np.zeros((200, 200), dtype=np.float32)

    def window_transform(self, window):
        return self.transform * Affine.translation(window.col_off, window.row_off)

    def read(self, band, window=None, out_shape=None, resampling=None, masked=False):
        from rasterio.windows import Window
        if window is None:
            arr = self.data.copy()
        else:
            r0 = int(window.row_off); c0 = int(window.col_off)
            h = int(window.height); w = int(window.width)
            arr = self.data[r0:r0+h, c0:c0+w].copy()
        if out_shape:
            arr = np.resize(arr, out_shape)
        if masked:
            return np.ma.array(arr, mask=np.zeros(arr.shape, dtype=bool))
        return arr


def test_diagnostic_reports_connected_flat_grid():
    service = RoutingService(FakeDataset())
    service.margin = 20
    result = service.diagnose_region(
        Coordinate(latitude=0.5, longitude=-0.5),
        Coordinate(latitude=0.5, longitude=-0.4),
        max_slope_deg=25,
    )
    assert result["status"] == "diagnostic_complete"
    assert result["threshold_analysis"]["reachable_under_current_neighbor_rules"] is True
    assert result["grid"]["nodata_percent"] == 0
    assert result["start"]["is_nodata"] is False
    assert result["destination"]["is_nodata"] is False


def test_diagnostic_reports_nodata_cells():
    ds = FakeDataset()
    ds.data[40:70, 40:70] = np.nan
    # FakeDataset mask should reflect NaN as NoData.
    original_read = ds.read
    def read(*args, **kwargs):
        arr = original_read(*args, **kwargs)
        if kwargs.get("masked"):
            return np.ma.masked_invalid(arr)
        return arr
    ds.read = read
    service = RoutingService(ds)
    service.margin = 30
    result = service.diagnose_region(
        Coordinate(latitude=0.5, longitude=-0.5),
        Coordinate(latitude=0.5, longitude=-0.4),
        max_slope_deg=25,
    )
    assert result["grid"]["nodata_cells"] > 0
