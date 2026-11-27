"""
Model Domain Inti Penjadwalan CP-SAT (Sets, Entitas, ObjectiveWeights, SolverConfig).
"""

from app.models.domain import (
    Day,
    RoomType,
    TimeSlot,
    Room,
    Lecturer,
    StudentGroup,
    CourseClass,
    ObjectiveWeights,
    SolverConfig,
)

__all__ = [
    "Day",
    "RoomType",
    "TimeSlot",
    "Room",
    "Lecturer",
    "StudentGroup",
    "CourseClass",
    "ObjectiveWeights",
    "SolverConfig",
]
