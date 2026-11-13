
import rasterio
from pathlib import Path

path = Path("data/jezero_ctx_dem.tif")

if not path.exists():
    raise FileNotFoundError(f"DEM not found: {path.resolve()}")

with rasterio.open(path) as ds:
    print("\n===== JEZERO CTX DEM =====")
    print("File:", path.resolve())
    print("Dimensions:", ds.width, "x", ds.height)
    print("Bands:", ds.count)
    print("CRS:", ds.crs)
    print("Bounds:", ds.bounds)
    print("Resolution:", ds.res)
    print("Transform:", ds.transform)
    print("Data type:", ds.dtypes)
    print("NoData:", ds.nodata)

    print("\n===== DATA CHECK =====")
    sample = ds.read(1, masked=True)
    print("Valid pixels:", sample.count())
    print("Total pixels:", sample.size)
    print("Valid percentage:",
          round(sample.count() / sample.size * 100, 2), "%")

    if sample.count():
        print("Minimum elevation:", float(sample.min()))
        print("Maximum elevation:", float(sample.max()))


from pyproj import Transformer

with rasterio.open(path) as ds:
    # Convert geographic Mars coordinates into this DEM's CRS.
    to_projected = Transformer.from_crs(
        ds.crs.geodetic_crs,
        ds.crs,
        always_xy=True
    )

    to_geographic = Transformer.from_crs(
        ds.crs,
        ds.crs.geodetic_crs,
        always_xy=True
    )

    print("\n===== GEOGRAPHIC COVERAGE =====")

    corners = [
        ("top-left", ds.bounds.left, ds.bounds.top),
        ("top-right", ds.bounds.right, ds.bounds.top),
        ("bottom-left", ds.bounds.left, ds.bounds.bottom),
        ("bottom-right", ds.bounds.right, ds.bounds.bottom),
    ]

    for name, x, y in corners:
        lon, lat = to_geographic.transform(x, y)
        print(f"{name}: latitude={lat:.6f}, longitude={lon:.6f}")

    print("\n===== JEZERO TEST POINT =====")

    test_points = [
        ("Jezero test", 18.4, 77.5),
        ("Outside test", 0.0, 0.0),
    ]

    for name, lat, lon in test_points:
        x, y = to_projected.transform(lon, lat)
        row, col = ds.index(x, y)

        inside = (
            0 <= row < ds.height
            and 0 <= col < ds.width
        )

        print(
            f"{name}: row={row}, col={col}, "
            f"inside={inside}"
        )

        if inside:
            value = next(ds.sample([(x, y)], indexes=1, masked=True))[0]
            print("  Elevation:", None if value is __import__("numpy").ma.masked else float(value))


from schemas import Coordinate
from services.routing_service import RoutingService

with rasterio.open(path) as ds:
    planner = RoutingService(ds)

    points = [
        Coordinate(latitude=18.4, longitude=77.5),
        Coordinate(latitude=18.5, longitude=77.6),
        Coordinate(latitude=0.0, longitude=0.0),
    ]

    for point in points:
        print(
            point.latitude,
            point.longitude,
            "CTX coverage:",
            planner.contains_valid_coordinate(point)
        )
