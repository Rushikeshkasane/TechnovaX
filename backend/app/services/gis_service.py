import math
from typing import List, Dict, Any, Optional

EARTH_RADIUS_KM = 6371.0

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two GPS coordinates using Haversine formula."""
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return (EARTH_RADIUS_KM * c) * 1000.0

def estimate_eta_minutes(distance_meters: float, average_speed_kmh: float = 35.0) -> float:
    """Estimate emergency responder arrival time in minutes."""
    if distance_meters <= 0:
        return 0.5
    distance_km = distance_meters / 1000.0
    hours = distance_km / average_speed_kmh
    minutes = hours * 60.0
    return round(max(minutes, 1.0), 1)

def point_in_polygon(point: List[float], polygon_coords: List[List[float]]) -> bool:
    """Ray casting point-in-polygon algorithm for GeoJSON coordinates [lon, lat]."""
    x, y = point[0], point[1]
    inside = False
    n = len(polygon_coords)
    if n < 3:
        return False
    
    p1x, p1y = polygon_coords[0]
    for i in range(n + 1):
        p2x, p2y = polygon_coords[i % n]
        if y > min(p1y, p2y):
            if y <= max(p1y, p2y):
                if x <= max(p1x, p2x):
                    if p1y != p2y:
                        xinters = (y - p1y) * (p2x - p1x) / (p2y - p1y) + p1x
                    if p1x == p2x or x <= xinters:
                        inside = not inside
        p1x, p1y = p2x, p2y
    return inside

def sort_units_by_proximity(incident_lat: float, incident_lon: float, units: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Sort a list of emergency fleet units by distance to incident with calculated ETA."""
    augmented = []
    for u in units:
        u_copy = dict(u)
        dist = haversine_distance_meters(incident_lat, incident_lon, u["current_lat"], u["current_lon"])
        u_copy["distance_meters"] = round(dist, 1)
        u_copy["eta_minutes"] = estimate_eta_minutes(dist)
        augmented.append(u_copy)
        
    augmented.sort(key=lambda x: x["distance_meters"])
    return augmented
