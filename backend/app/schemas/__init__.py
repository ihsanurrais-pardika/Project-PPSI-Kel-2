"""
Schemas package initialization.
"""

from app.schemas.class_dto import ClassItem
from app.schemas.schedule_dto import (
    ScheduledClassOutput,
    PenaltyBreakdown,
    DiagnosticsOutput,
    SolverResultOutput,
)
from app.schemas.requests import (
    LoginRequest,
    AdjustClassRequest,
    RoomPayload,
    GenerateScheduleRequest,
    VersionActionRequest,
    WadekDecisionRequest,
    UpdateScheduleItemRequest,
    SwapScheduleItemsRequest,
    ResolveValidationIssueRequest,
    AutoFixValidationRequest,
)

__all__ = [
    "ClassItem",
    "ScheduledClassOutput",
    "PenaltyBreakdown",
    "DiagnosticsOutput",
    "SolverResultOutput",
    "LoginRequest",
    "AdjustClassRequest",
    "RoomPayload",
    "GenerateScheduleRequest",
    "VersionActionRequest",
    "WadekDecisionRequest",
    "UpdateScheduleItemRequest",
    "SwapScheduleItemsRequest",
    "ResolveValidationIssueRequest",
    "AutoFixValidationRequest",
]
