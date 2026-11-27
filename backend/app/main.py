"""
Entry Point Tunggal FastAPI Backend SIPRAMA FTI UNAND.
Menggabungkan seluruh router modular (Auth, Courses/Classes, Rooms/Slots,
CP-SAT Schedule + Approval Wadek I, dan Validasi Konflik).
"""

import os
import sys

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Pastikan direktori backend ada dalam path bila file dieksekusi langsung
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from app.dependencies import get_store  # noqa: E402,F401
from app.routes import auth, courses, health, rooms, schedule, validation  # noqa: E402

app = FastAPI(
    title="SIPRAMA FTI UNAND - Unified API & CP-SAT Engine",
    description="Backend API Terpadu SIPRAMA FTI UNAND (MySQL + Google OR-Tools CP-SAT)",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(auth.router)
app.include_router(courses.router)
app.include_router(rooms.router)
app.include_router(schedule.router)
app.include_router(validation.router)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True, app_dir=backend_dir)
