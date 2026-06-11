"""Spatial awareness and distance calculations for airport layout."""

import math
from typing import Dict, Tuple
from config.settings import GATE_COORDINATES, WALKING_SPEED_MS


def calculate_distance(coord1: Tuple[float, float], coord2: Tuple[float, float]) -> float:
    """
    Calculate Euclidean distance between two coordinates.
    
    Args:
        coord1: First coordinate (x, y)
        coord2: Second coordinate (x, y)
        
    Returns:
        Distance in meters
    """
    return math.sqrt((coord1[0] - coord2[0]) ** 2 + (coord1[1] - coord2[1]) ** 2)


def get_gate_coordinates(gate: str) -> Tuple[float, float]:
    """
    Get coordinates for a gate.
    
    Args:
        gate: Gate identifier (e.g., "B12")
        
    Returns:
        Tuple of (x, y) coordinates
    """
    return GATE_COORDINATES.get(gate, (0, 0))


def calculate_walking_time(distance: float) -> float:
    """
    Calculate walking time in seconds from distance.
    
    Args:
        distance: Distance in meters
        
    Returns:
        Walking time in seconds
    """
    return distance / WALKING_SPEED_MS


def score_facility_by_proximity(
    facility: Dict,
    user_gate: str,
    base_score: float = 1.0,
) -> Dict:
    """
    Adjust facility score based on proximity to user gate.
    
    Args:
        facility: Facility document
        user_gate: User's current gate
        base_score: Base relevance score from semantic search
        
    Returns:
        Modified facility document with proximity score
    """
    facility_gate = facility.get("coordinates", {}).get("gate")
    facility_offset = facility.get("coordinates", {}).get("offset", 0)

    if not facility_gate:
        return {**facility, "proximity_score": base_score, "distance_m": 0}

    # Get coordinates
    user_coord = get_gate_coordinates(user_gate)
    facility_coord = get_gate_coordinates(facility_gate)

    # Calculate base distance
    base_distance = calculate_distance(user_coord, facility_coord)

    # Add offset from gate
    total_distance = base_distance + facility_offset

    # Calculate walking time
    walking_time_sec = calculate_walking_time(total_distance)

    # Apply proximity boost: closer facilities get higher scores
    # Using inverse distance with decay: score = base_score * (1 / (1 + distance/100))
    proximity_multiplier = 1.0 / (1.0 + (total_distance / 100.0))
    proximity_score = base_score * proximity_multiplier

    return {
        **facility,
        "proximity_score": proximity_score,
        "distance_m": round(total_distance, 1),
        "walking_time_sec": round(walking_time_sec, 1),
    }


def filter_by_time_constraint(
    facility: Dict,
    user_boarding_time_seconds: int,
    current_time_seconds: int,
) -> bool:
    """
    Determine if a facility is accessible given time constraints.
    
    Args:
        facility: Facility document
        user_boarding_time_seconds: Boarding time in seconds since midnight
        current_time_seconds: Current time in seconds since midnight
        
    Returns:
        True if facility is accessible before boarding
    """
    time_remaining_sec = user_boarding_time_seconds - current_time_seconds

    # Need at least 10 minutes to visit (600 seconds) + travel time
    min_facility_time = 600  # 10 minutes

    return time_remaining_sec > min_facility_time
