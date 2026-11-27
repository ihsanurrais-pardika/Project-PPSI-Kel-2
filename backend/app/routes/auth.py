"""
Routes Autentikasi Multi-Role Berbasis Database MySQL.
"""

from fastapi import APIRouter, HTTPException, status

from app.auth.service import authenticate_from_database
from app.schemas.requests import LoginRequest

router = APIRouter(tags=["Auth"])


@router.post("/api/auth/login")
@router.post("/api/login")
def login(req: LoginRequest):
    auth_res = authenticate_from_database(req.identifier, req.password)
    if not auth_res["success"]:
        raise HTTPException(
            status_code=auth_res.get("status_code", status.HTTP_401_UNAUTHORIZED),
            detail=auth_res.get("detail", "Sandi atau NIP/NIM/Email Anda salah."),
        )
    return auth_res
