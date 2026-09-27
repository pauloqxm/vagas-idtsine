import colorsys
import json
import re
import unicodedata
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parent.parent.parent

_PALETA_CACHE: Optional[Dict[str, Any]] = None
_MUNICIPIO_REGIAO_CACHE: Optional[Dict[str, str]] = None

REGIAO_KEYS = ("Região", "Regiao", "REGIÃO")
MUNICIPIO_KEYS = ("Municipio", "MUNICIPIO", "municipio", "NM_MUN", "NOME")


def _hex_from_hls(hue_01: float, lightness: float, saturation: float) -> str:
    r, g, b = colorsys.hls_to_rgb(hue_01, lightness, saturation)
    return "#{:02x}{:02x}{:02x}".format(
        int(max(0, min(255, round(r * 255)))),
        int(max(0, min(255, round(g * 255)))),
        int(max(0, min(255, round(b * 255)))),
    )


def _cores_uma_por_regiao(n: int) -> List[str]:
    if n <= 0:
        return []
    golden_deg = 137.508
    out: List[str] = []
    for i in range(n):
        h = ((i * golden_deg) % 360) / 360.0
        s = 0.50 + (i % 4) * 0.05
        l = 0.48 + (i % 5) * 0.028
        out.append(_hex_from_hls(h, l, s))
    return out


def _regiao_prop(props: Dict[str, Any]) -> Optional[str]:
    for k in REGIAO_KEYS:
        v = props.get(k)
        if v:
            return str(v).strip()
    return None


def _municipio_prop(props: Dict[str, Any]) -> Optional[str]:
    for k in MUNICIPIO_KEYS:
        v = props.get(k)
        if v:
            return str(v).strip()
    return None


def _normalizar_municipio(val: Any) -> str:
    s = unicodedata.normalize("NFD", str(val or ""))
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    s = re.sub(r"\s+", " ", s.lower().replace("_", " ")).strip()
    if s.startswith("ce-"):
        s = s[3:].strip()
    s = re.sub(r"\s*[\-/]\s*ce$", "", s).strip()
    s = re.sub(r"\s*\(ce\)$", "", s).strip()
    return s


def _chaves_municipio(nome: str) -> List[str]:
    chave = _normalizar_municipio(nome)
    if not chave:
        return []
    chaves = [chave]
    if chave.startswith("dep. "):
        resto = chave[5:]
        chaves.extend((f"deputado {resto}", f"dep {resto}"))
    elif chave.startswith("deputado "):
        resto = chave[9:]
        chaves.extend((f"dep. {resto}", f"dep {resto}"))
    if chave == "itapaje":
        chaves.append("itapage")
    return chaves


def _carregar_geojson() -> Dict[str, Any]:
    path = ROOT / "ce_regioes.geojson"
    if not path.is_file():
        return {"type": "FeatureCollection", "features": []}
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def get_municipio_para_regiao() -> Dict[str, str]:
    global _MUNICIPIO_REGIAO_CACHE
    if _MUNICIPIO_REGIAO_CACHE is not None:
        return _MUNICIPIO_REGIAO_CACHE

    mapa: Dict[str, str] = {}
    for ft in (_carregar_geojson().get("features") or []):
        props = ft.get("properties") or {}
        municipio = _municipio_prop(props)
        regiao = _regiao_prop(props)
        if not municipio or not regiao:
            continue
        for chave in _chaves_municipio(municipio):
            mapa[chave] = regiao
    _MUNICIPIO_REGIAO_CACHE = mapa
    return mapa


def regiao_do_municipio(municipio: str) -> str:
    chave = _normalizar_municipio(municipio)
    if not chave:
        return ""
    mapa = get_municipio_para_regiao()
    if chave in mapa:
        return mapa[chave]
    for alternativa in _chaves_municipio(municipio):
        if alternativa in mapa:
            return mapa[alternativa]
    return ""


def get_regioes_paleta() -> Dict[str, Any]:
    global _PALETA_CACHE
    if _PALETA_CACHE is not None:
        return _PALETA_CACHE

    gj = _carregar_geojson()
    if not gj.get("features"):
        _PALETA_CACHE = {"regioes": [], "cores": {}}
        return _PALETA_CACHE

    regioes = sorted(
        {
            reg
            for ft in gj.get("features") or []
            for reg in [_regiao_prop(ft.get("properties") or {})]
            if reg
        }
    )
    cores = {reg: cor for reg, cor in zip(regioes, _cores_uma_por_regiao(len(regioes)))}
    _PALETA_CACHE = {"regioes": regioes, "cores": cores}
    return _PALETA_CACHE


def invalidate_paleta_cache() -> None:
    global _PALETA_CACHE, _MUNICIPIO_REGIAO_CACHE
    _PALETA_CACHE = None
    _MUNICIPIO_REGIAO_CACHE = None
