import math
MARS_RADIUS_M=3396190.0

def haversine_m(lat1,lon1,lat2,lon2):
    p1,p2=math.radians(lat1),math.radians(lat2)
    dp=p2-p1; dl=math.radians(lon2-lon1)
    a=math.sin(dp/2)**2+math.cos(p1)*math.cos(p2)*math.sin(dl/2)**2
    return 2*MARS_RADIUS_M*math.asin(min(1,math.sqrt(a)))

def normalize_lon(lon):
    return ((lon+180)%360)-180


def polyline_distance_km(points):
    """Return the Mars-surface great-circle length of a latitude/longitude polyline."""
    if len(points) < 2:
        return 0.0
    total_m = 0.0
    for first, second in zip(points, points[1:]):
        total_m += haversine_m(
            float(first["latitude"]), float(first["longitude"]),
            float(second["latitude"]), float(second["longitude"]),
        )
    return total_m / 1000.0
