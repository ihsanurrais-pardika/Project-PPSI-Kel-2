"""
Runner Server Backend SIPRAMA FTI UNAND
Menjalankan API Server di port 8000.
Mendukung FastAPI + Uvicorn serta Fallback Otomatis Standard Library Python
sehingga dapat berjalan langsung tanpa dependensi tambahan!
"""

import sys
import os
import json
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler

# Pastikan folder backend ada di sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from database import authenticate_from_database, count_users_in_db


class FallbackAuthHandler(BaseHTTPRequestHandler):
    """
    HTTP Request Handler berbasis Standard Library Python (Zero External Dependencies).
    Mendukung CORS penuh dan endpoint autentikasi SIPRAMA.
    """

    def _set_cors_headers(self, status_code=200):
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, DELETE")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")
        self.end_headers()

    def do_OPTIONS(self):
        # Handle Preflight Request CORS
        self._set_cors_headers(204)

    def do_GET(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if clean_path == "" or clean_path == "/":
            self._set_cors_headers(200)
            response = {
                "system": "SIPRAMA FTI UNAND API",
                "version": "1.0.0",
                "status": "online",
                "mode": "Python Core HTTP Engine",
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))
        elif clean_path in ["/health", "/api/health"]:
            self._set_cors_headers(200)
            self.wfile.write(json.dumps({"status": "ok", "message": "Backend login aktif"}).encode("utf-8"))
        elif clean_path == "/api/auth/users":
            self._set_cors_headers(200)
            public_users = [
                {
                    "email": u["email"],
                    "name": u["name"],
                    "role": u["role"],
                    "roleLabel": u["roleLabel"],
                    "department": u["department"],
                    "nipOrNim": u["nipOrNim"],
                }
                for u in USERS_DB
            ]
            self.wfile.write(json.dumps(public_users).encode("utf-8"))
        else:
            self._set_cors_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint tidak ditemukan"}).encode("utf-8"))

    def do_POST(self):
        clean_path = self.path.split("?")[0].rstrip("/")
        if clean_path in ["/api/auth/login", "/api/login"]:
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length)

            try:
                data = json.loads(post_body.decode("utf-8")) if post_body else {}
            except Exception:
                self._set_cors_headers(400)
                self.wfile.write(json.dumps({"detail": "Format JSON tidak valid"}).encode("utf-8"))
                return

            identifier = data.get("identifier") or data.get("username") or data.get("email") or ""
            password = data.get("password") or ""

            # Autentikasi membaca langsung dari tabel database MySQL
            auth_res = authenticate_from_database(identifier, password)
            if not auth_res["success"]:
                self._set_cors_headers(auth_res.get("status_code", 401))
                self.wfile.write(json.dumps(auth_res).encode("utf-8"))
                return

            self._set_cors_headers(200)
            self.wfile.write(json.dumps(auth_res).encode("utf-8"))
        else:
            self._set_cors_headers(404)
            self.wfile.write(json.dumps({"error": "Endpoint tidak ditemukan"}).encode("utf-8"))

    def log_message(self, format, *args):
        # Custom logging format
        print(f"[SIPRAMA-BACKEND] {self.address_string()} - {format % args}")


def run():
    port = int(os.environ.get("PORT", 8000))
    host = "0.0.0.0"

    # Cek apakah fastapi dan uvicorn terinstall
    try:
        import uvicorn
        from app.main import app as fastapi_app
        if fastapi_app is not None:
            print("=" * 60)
            print("🚀 Menjalankan SIPRAMA Backend Terpadu (MySQL + CP-SAT + Auth)")
            print(f"📡 Server URL: http://localhost:{port}")
            print(f"📖 Dokumentasi API Swagger: http://localhost:{port}/docs")
            print("=" * 60)
            uvicorn.run("app.main:app", host="127.0.0.1", port=port, reload=True, app_dir=BASE_DIR)
            return
    except ImportError:
        pass

    # Jalankan fallback HTTP server jika fastapi/uvicorn belum terinstall
    print("=" * 60)
    print("🚀 Menjalankan SIPRAMA Backend Engine (Python HTTP Server)")
    print(f"📡 Server URL: http://localhost:{port}")
    print(f"🔒 Endpoint Login: POST http://localhost:{port}/api/auth/login")
    print("=" * 60)
    server_address = (host, port)
    httpd = ThreadingHTTPServer(server_address, FallbackAuthHandler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server dihentikan oleh pengguna.")
        httpd.server_close()


if __name__ == "__main__":
    run()
