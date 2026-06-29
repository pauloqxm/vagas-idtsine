from fastapi import APIRouter

from backend.services import regioes_service, unidades_service, vagas_service

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


@router.get("/vagas/refresh")
def refresh_cache():
    vagas_service.invalidate_cache()
    regioes_service.invalidate_paleta_cache()
    vagas_service.get_vagas(use_cache=False)
    return {"ok": True}
