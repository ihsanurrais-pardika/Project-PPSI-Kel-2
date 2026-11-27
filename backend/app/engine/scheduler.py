"""
Service Koordinator Solver CP-SAT Penjadwalan Perkuliahan.
Mengintegrasikan Pre-Flight Diagnostics, Pembangunan Model CP-SAT,
Konfigurasi Solver (task.md Bagian 8), dan Ekstraksi Solusi.
"""

import time
from typing import List, Optional
from ortools.sat.python import cp_model

from app.models.domain import (
    CourseClass,
    Room,
    TimeSlot,
    Lecturer,
    StudentGroup,
    ObjectiveWeights,
    SolverConfig,
)
from app.engine.cpsat_model import CPSATSchedulerModel
from app.engine.diagnostics import ScheduleDiagnostics
from app.schemas.schedule_dto import (
    SolverResultOutput,
    PenaltyBreakdown,
    DiagnosticsOutput,
)


class CPSATSchedulerService:
    def __init__(
        self,
        config: Optional[SolverConfig] = None,
        weights: Optional[ObjectiveWeights] = None,
    ):
        self.config = config or SolverConfig()
        self.weights = weights or ObjectiveWeights()

    def solve(
        self,
        courses: List[CourseClass],
        rooms: List[Room],
        slots: List[TimeSlot],
        lecturers: List[Lecturer],
        groups: List[StudentGroup],
    ) -> SolverResultOutput:
        start_wall_time = time.time()

        # 1. Jalankan Analisis Diagnostik Pra-Jadwal (Pre-Flight Diagnostics)
        diagnostics = ScheduleDiagnostics.run_preflight_checks(
            courses=courses,
            rooms=rooms,
            slots=slots,
            lecturers=lecturers,
            groups=groups,
        )

        # 2. Inisialisasi dan Bangun Model CP-SAT
        model_wrapper = CPSATSchedulerModel(
            courses=courses,
            rooms=rooms,
            slots=slots,
            lecturers=lecturers,
            groups=groups,
            weights=self.weights,
        )
        model_wrapper.build()

        # 3. Konfigurasi Solver Parameter (task.md Bagian 8)
        solver = cp_model.CpSolver()
        solver.parameters.max_time_in_seconds = float(self.config.max_time_in_seconds)
        solver.parameters.num_search_workers = int(self.config.num_search_workers)
        solver.parameters.linearization_level = int(self.config.linearization_level)
        solver.parameters.log_search_progress = bool(self.config.log_search_progress)
        solver.parameters.random_seed = int(self.config.random_seed)

        if self.config.search_branching == "PORTFOLIO_SEARCH":
            solver.parameters.search_branching = cp_model.PORTFOLIO_SEARCH

        # 4. Eksekusi Solver
        solver_status_code = solver.Solve(model_wrapper.model)

        # Pemetaan Status Solver
        status_map = {
            cp_model.OPTIMAL: "OPTIMAL",
            cp_model.FEASIBLE: "FEASIBLE",
            cp_model.INFEASIBLE: "INFEASIBLE",
            cp_model.MODEL_INVALID: "MODEL_INVALID",
            cp_model.UNKNOWN: "UNKNOWN",
        }
        status_str = status_map.get(solver_status_code, "UNKNOWN")

        elapsed_seconds = round(time.time() - start_wall_time, 4)

        # 5. Ekstraksi Hasil
        if status_str in ("OPTIMAL", "FEASIBLE"):
            scheduled_classes, penalties = model_wrapper.extract_solution(solver)
            return SolverResultOutput(
                status=status_str,
                wall_time_seconds=elapsed_seconds,
                total_classes=len(courses),
                scheduled_classes=len(scheduled_classes),
                penalty_breakdown=penalties,
                schedule=scheduled_classes,
                diagnostics=diagnostics,
            )
        else:
            # Solusi Infeasible atau Gagal
            return SolverResultOutput(
                status=status_str,
                wall_time_seconds=elapsed_seconds,
                total_classes=len(courses),
                scheduled_classes=0,
                penalty_breakdown=PenaltyBreakdown(),
                schedule=[],
                diagnostics=diagnostics,
            )
