from fastapi import APIRouter, Body, HTTPException
from fastapi.responses import JSONResponse

from backend.services import oferta_service, regioes_service, unidades_service, vagas_service

router = APIRouter(prefix="/api")


@router.get("/vagas")
def listar_vagas():
    return vagas_service.get_payload_vagas()


@router.get("/vagas/municipios")
def listar_municipios():
    return {"municipios": vagas_service.get_municipios()}


@router.get("/vagas/geojson")
def vagas_geojson():
    vagas = vagas_service.get_vagas()
    features = []
    for vaga in vagas:
        lat, lng = vaga.get("latitude"), vaga.get("longitude")
        if lat is None or lng is None:
            continue
        props = {k: v for k, v in vaga.items() if k not in ("latitude", "longitude")}
        features.append(
            {
                "type": "Feature",
                "id": vaga.get("id"),
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": props,
            }
        )
    return {
        "type": "FeatureCollection",
        "features": features,
        "ultima_atualizacao": vagas_service.get_ultima_atualizacao(),
    }


@router.get("/postos-atendimento")
def postos_atendimento():
    return {"postos": vagas_service.get_postos_atendimento()}


@router.get("/unidades")
def listar_unidades():
    return {"unidades": unidades_service.get_unidades()}


@router.get("/unidades/geojson")
def unidades_geojson():
    return unidades_service.get_unidades_geojson()


@router.get("/geo/regioes-paleta")
def regioes_paleta():
    return regioes_service.get_regioes_paleta()


@router.post("/oferta-vaga")
def criar_oferta_vaga(body: dict = Body(...)):
    try:
        payload = oferta_service.montar_payload(body or {})
        status, resposta = oferta_service.enviar_oferta(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail="Não foi possível enviar a solicitação. Tente novamente.",
        ) from exc
    return JSONResponse(status_code=status if 200 <= status < 600 else 502, content=resposta)


@router.get("/vagas/refresh")
def refresh_cache():
    vagas_service.invalidate_cache()
    regioes_service.invalidate_paleta_cache()
    vagas_service.get_vagas(use_cache=False)
    return {"ok": True}
