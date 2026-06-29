from collections import defaultdict
from datetime import date
from typing import Any, Dict, List, Optional

from backend.services import vagas_service


def _parse_data_br(s: str) -> Optional[date]:
    p = str(s or "").strip().split("/")
    if len(p) != 3:
        return None
    try:
        d, m, y = int(p[0]), int(p[1]), int(p[2])
        return date(y, m, d)
    except (ValueError, TypeError, IndexError):
        return None


def _data_listagem(v: Dict[str, Any]) -> str:
    return str(v.get("data_disponibilidade") or v.get("data") or "").strip()


def _data_mais_recente_vagas(vagas: List[Dict[str, Any]]) -> Optional[date]:
    best: Optional[date] = None
    for v in vagas:
        d = _parse_data_br(_data_listagem(v))
        if d and (best is None or d > best):
            best = d
    return best


def _totais_por_posto(vagas: List[Dict[str, Any]]) -> Dict[str, int]:
    tot: Dict[str, int] = defaultdict(int)
    for v in vagas:
        posto = str(v.get("posto_atendimento") or "").strip()
        if posto:
            tot[posto] += int(v.get("qtde_vagas") or 1)
    return dict(tot)


def _recentes_por_posto(
    vagas: List[Dict[str, Any]], data_ref: Optional[date]
) -> Dict[str, int]:
    if not data_ref:
        return {}
    tot: Dict[str, int] = defaultdict(int)
    for v in vagas:
        if _parse_data_br(_data_listagem(v)) != data_ref:
            continue
        posto = str(v.get("posto_atendimento") or "").strip()
        if posto:
            tot[posto] += int(v.get("qtde_vagas") or 1)
    return dict(tot)


def get_unidades() -> List[Dict[str, Any]]:
    """Lê unidades do cache compartilhado com vagas_service (Google Sheets)."""
    coords = vagas_service.get_unidades_coords()
    rows: List[Dict[str, Any]] = []
    for i, (codigo, info) in enumerate(coords.items()):
        lat = info.get("latitude")
        lng = info.get("longitude")
        unidade_nome = str(info.get("unidade") or "").strip()
        if not codigo or not unidade_nome or lat is None or lng is None:
            continue
        rows.append({
            "id": i,
            "codigo": codigo,
            "municipio": info.get("municipio", ""),
            "unidade": unidade_nome,
            "responsavel": info.get("responsavel", ""),
            "telefone_unidade": info.get("telefone_unidade", ""),
            "celular_responsavel": info.get("celular_responsavel", ""),
            "email_responsavel": info.get("email_responsavel", ""),
            "tipo_posto": info.get("tipo_posto", ""),
            "bairro": info.get("bairro", ""),
            "endereco": info.get("endereco", ""),
            "latitude": lat,
            "longitude": lng,
        })

    vagas = vagas_service.get_vagas()
    totais = _totais_por_posto(vagas)
    data_ref = _data_mais_recente_vagas(vagas)
    recentes = _recentes_por_posto(vagas, data_ref)
    data_ref_str = data_ref.strftime("%d/%m/%Y") if data_ref else ""

    out: List[Dict[str, Any]] = []
    for row in rows:
        codigo = str(row.get("codigo") or "").strip()
        item = dict(row)
        item["total_vagas_abertas"] = totais.get(codigo, 0)
        item["ofertas_data_recente"] = recentes.get(codigo, 0)
        item["data_referencia_vagas"] = data_ref_str
        item["tem_vagas"] = item["total_vagas_abertas"] > 0
        out.append(item)
    return out


def get_unidades_geojson() -> Dict[str, Any]:
    features = []
    for unidade in get_unidades():
        lat, lng = unidade.get("latitude"), unidade.get("longitude")
        if lat is None or lng is None:
            continue
        props = {
            k: ("" if v is None else v)
            for k, v in unidade.items()
            if k not in ("latitude", "longitude")
        }
        features.append(
            {
                "type": "Feature",
                "id": unidade.get("id"),
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": props,
            }
        )
    return {"type": "FeatureCollection", "features": features}
