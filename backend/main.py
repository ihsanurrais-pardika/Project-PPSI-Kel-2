"""
FastAPI Backend Application - SIPRAMA FTI UNAND
Autentikasi Login Berbasis Role & Penjadwalan
"""

try:
    from fastapi import FastAPI, HTTPException, status
    from fastapi.middleware.cors import CORSMiddleware
    from pydantic import BaseModel
    FASTAPI_AVAILABLE = True
except ImportError:
    FASTAPI_AVAILABLE = False

from database import authenticate_from_database, count_users_in_db

if FASTAPI_AVAILABLE:
    class LoginRequest(BaseModel):
        identifier: str  # email atau NIP/NIM
        password: str

    app = FastAPI(
        title="SIPRAMA FTI UNAND API",
        version="1.0.0",
        description="API Autentikasi dan Engine Penjadwalan Perkuliahan FTI UNAND",
    )

    # Aktifkan CORS untuk akses dari frontend React/Vite
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root():
        total_in_db = 0
        try:
            total_in_db = count_users_in_db()
        except Exception:
            pass
        return {
            "system": "SIPRAMA FTI UNAND API",
            "version": "1.0.0",
            "status": "online",
            "framework": "FastAPI",
            "database_users_count": total_in_db,
        }

    @app.get("/health")
    @app.get("/api/health")
    def health():
        return {"status": "ok", "message": "SIPRAMA Backend Engine is running smoothly"}

    @app.post("/api/auth/login")
    @app.post("/api/login")
    def login(req: LoginRequest):
        auth_res = authenticate_from_database(req.identifier, req.password)
        if not auth_res["success"]:
            raise HTTPException(
                status_code=auth_res.get("status_code", status.HTTP_401_UNAUTHORIZED),
                detail=auth_res.get("detail", "Sandi atau NIP/NIM/Email Anda salah."),
            )

        return auth_res
else:
    app = None
