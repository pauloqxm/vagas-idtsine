import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.api.routes import router as api_router
from backend.services import vagas_service

FRONTEND_DIR = ROOT / "frontend"
GEOJSON_PATH = ROOT / "ce_regioes.geojson"

app = FastAPI(title="Vagas de Emprego")

# Compressão gzip automática para respostas >= 1 KB
app.add_middleware(GZipMiddleware, minimum_size=1024)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(api_router)


@app.on_event("startup")
async def _warmup_cache():
    """Pré-aquece o cache buscando as planilhas em background thread no startup."""
    import asyncio
    await asyncio.to_thread(vagas_service.get_vagas)


@app.get("/api/geo/ce-regioes")
def ce_regioes_geojson():
    if not GEOJSON_PATH.is_file():
        raise HTTPException(
            status_code=404, detail="Arquivo ce_regioes.geojson não encontrado"
        )
    return FileResponse(GEOJSON_PATH, media_type="application/geo+json")


app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
