import colorsys
import json
from pathlib import Path
from typing import Any, Dict, List, Optional

ROOT = Path(__file__).resolve().parent.parent.parent

_PALETA_CACHE: Optional[Dict[str, Any]] = None

REGIAO_KEYS = ("Região", "Regiao", "REGIÃO")


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


def get_regioes_paleta() -> Dict[str, Any]:
    global _PALETA_CACHE
    if _PALETA_CACHE is not None:
        return _PALETA_CACHE

    path = ROOT / "ce_regioes.geojson"
    if not path.is_file():
        _PALETA_CACHE = {"regioes": [], "cores": {}}
        return _PALETA_CACHE

    with open(path, encoding="utf-8") as f:
        gj = json.load(f)

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
    global _PALETA_CACHE
    _PALETA_CACHE = None
