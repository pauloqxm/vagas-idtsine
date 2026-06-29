import csv
import io
import logging
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests

logger = logging.getLogger(__name__)

# ── URLs das planilhas publicadas ──────────────────────────────────────────────
VAGAS_URL = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vTacve5zthkiBQF6w7FE5h6vt0Lx8OXO_h7ncFSA8-POp9cbutk2DzSwzUdugcrk-fmTbm0drugSTGg"
    "/pub?gid=187943237&single=true&output=csv"
)
UNIDADES_URL = (
    "https://docs.google.com/spreadsheets/d/e/"
    "2PACX-1vTacve5zthkiBQF6w7FE5h6vt0Lx8OXO_h7ncFSA8-POp9cbutk2DzSwzUdugcrk-fmTbm0drugSTGg"
    "/pub?gid=1623874059&single=true&output=csv"
)

FETCH_TIMEOUT = 90        # segundos para timeout do Google Sheets
CACHE_TTL = 300           # 5 min — vagas
UNIDADES_CACHE_TTL = 3600 # 1 h  — unidades mudam raramente

# ── Caches em memória ─────────────────────────────────────────────────────────
CACHE: Dict[str, Any] = {"data": None, "ultima_atualizacao": None, "timestamp": 0}
_UNIDADES_CACHE: Dict[str, Any] = {"data": None, "timestamp": 0}


# ── Utilitários de parse ──────────────────────────────────────────────────────

def _limpar_texto(val: str) -> str:
    s = str(val or "").strip()
    return "" if s in ("", "-", "—") else s


def _parse_int(val: str) -> int:
    try:
        return max(1, int(float(str(val).strip() or "1")))
    except (ValueError, TypeError):
        return 1


def _parse_float_br(val: str) -> Optional[float]:
    if not val:
        return None
    s = str(val).strip().replace(" ", "")
    if "," in s and "." in s:
        s = s.replace(".", "").replace(",", ".")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def _parse_data_iso(val: str) -> str:
    s = str(val or "").strip().split(".")[0]
    if not s:
        return ""
    try:
        dt = datetime.fromisoformat(s)
        return dt.strftime("%d/%m/%Y")
    except ValueError:
        return s[:10] if len(s) >= 10 else ""


def _parse_datetime_iso(val: str) -> Optional[datetime]:
    s = str(val or "").strip().split(".")[0]
    if not s:
        return None
    try:
        return datetime.fromisoformat(s)
    except ValueError:
        return None


def _formatar_data_hora_br(dt: datetime) -> str:
    return dt.strftime("%d/%m/%Y %H:%M")


def _email_da_coluna_tipo(tipo_raw: str) -> str:
    tipo = _limpar_texto(tipo_raw)
    if "@" in tipo and "." in tipo.split("@")[-1]:
        return tipo
    return ""


# ── Fetch do Google Sheets ────────────────────────────────────────────────────

def _fetch_csv_reader(url: str) -> csv.reader:
    """Baixa uma planilha publicada e devolve um csv.reader pronto para uso."""
    resp = requests.get(url, timeout=FETCH_TIMEOUT)
    resp.raise_for_status()
    # Google Sheets entrega UTF-8; remove BOM se presente
    content = resp.content.decode("utf-8-sig")
    return csv.reader(io.StringIO(content))


# ── Unidades ──────────────────────────────────────────────────────────────────

def _load_unidades_coords() -> Dict[str, Dict[str, Any]]:
    """Lê unidades do Google Sheets com cache de 1 h.
    Em caso de falha usa o cache anterior (mesmo que expirado).
    """
    now = time.time()
    cached = _UNIDADES_CACHE["data"]

    if cached is not None and (now - float(_UNIDADES_CACHE["timestamp"])) < UNIDADES_CACHE_TTL:
        return cached

    try:
        reader = _fetch_csv_reader(UNIDADES_URL)
        next(reader, None)  # cabeçalho

        result: Dict[str, Dict[str, Any]] = {}
        for row in reader:
            if len(row) < 11:
                continue
            codigo = str(row[0] or "").strip()
            if not codigo:
                continue
            result[codigo] = {
                "municipio": str(row[1] or "").strip(),
                "unidade": str(row[2] or "").strip(),
                "responsavel": _limpar_texto(row[3] or ""),
                "telefone_unidade": _limpar_texto(row[4] or ""),
                "celular_responsavel": _limpar_texto(row[5] or ""),
                "email_responsavel": _email_da_coluna_tipo(row[6] or ""),
                "tipo_posto": "" if _email_da_coluna_tipo(row[6] or "") else _limpar_texto(row[6] or ""),
                "bairro": _limpar_texto(row[7] or ""),
                "endereco": _limpar_texto(row[8] or ""),
                "latitude": _parse_float_br(row[9] or ""),
                "longitude": _parse_float_br(row[10] or ""),
            }

        _UNIDADES_CACHE["data"] = result
        _UNIDADES_CACHE["timestamp"] = now
        logger.info("Unidades carregadas do Sheets: %d registros.", len(result))
        return result

    except Exception as exc:
        logger.warning("Falha ao buscar unidades do Sheets (%s). Usando cache anterior.", exc)
        return cached or {}


# ── Vagas ─────────────────────────────────────────────────────────────────────

def _row_para_vaga(row: List[str]) -> Optional[Dict[str, Any]]:
    if len(row) < 21:
        return None
    try:
        id_raw = str(row[0] or "").strip()
        if not id_raw:
            return None
        vaga_id = int(id_raw)

        ocupacao = str(row[3] or "").strip()
        if not ocupacao:
            return None

        posto = str(row[10] or "").strip()
        info = _load_unidades_coords().get(posto, {})
        tel_unidade = info.get("telefone_unidade") or ""
        cel_unidade = info.get("celular_responsavel") or ""
        tel_vaga = _limpar_texto(row[8] or "")

        return {
            "id": vaga_id,
            "identificacao_vagas": str(row[1] or "").strip(),
            "data": _parse_data_iso(row[18] or ""),
            "data_disponibilidade": _parse_data_iso(row[19] or ""),
            "ocupacao": ocupacao,
            "codigo_cbo": str(row[2] or "").strip(),
            "qtde_vagas": _parse_int(row[9] or "1"),
            "pcd": str(row[11] or "").strip() == "1",
            "unidade": str(row[20] or "").strip() or info.get("unidade", ""),
            "posto_atendimento": posto,
            "municipio": info.get("municipio", ""),
            "latitude": info.get("latitude"),
            "longitude": info.get("longitude"),
            "empresa": str(row[6] or "").strip(),
            "responsavel": _limpar_texto(row[7] or "") or info.get("responsavel", ""),
            "responsavel_unidade": info.get("responsavel", ""),
            "telefone": tel_vaga or tel_unidade or cel_unidade,
            "telefone_unidade": tel_unidade,
            "celular_responsavel": cel_unidade,
            "email_contato": info.get("email_responsavel") or "",
            "endereco": info.get("endereco") or "",
            "bairro": info.get("bairro") or "",
            "tipo_contratacao": str(row[14] or "").strip(),
            "observacao": str(row[15] or "").strip() or None,
        }
    except (ValueError, IndexError):
        return None


def _ler_sheets() -> tuple[List[Dict[str, Any]], str]:
    """Baixa a planilha de vagas e devolve (lista_vagas, ultima_atualizacao)."""
    reader = _fetch_csv_reader(VAGAS_URL)
    next(reader, None)  # cabeçalho

    vagas: List[Dict[str, Any]] = []
    ultima_inclusao: Optional[datetime] = None

    for row in reader:
        if not row or not any((c or "").strip() for c in row):
            continue
        inclusao = _parse_datetime_iso(row[18] if len(row) > 18 else "")
        if inclusao and (ultima_inclusao is None or inclusao > ultima_inclusao):
            ultima_inclusao = inclusao
        vaga = _row_para_vaga(row)
        if vaga:
            vagas.append(vaga)

    ultima_atualizacao = (
        _formatar_data_hora_br(ultima_inclusao) if ultima_inclusao else ""
    )
    return vagas, ultima_atualizacao


def _enriquecer_dias_ofertadas(vagas: List[Dict[str, Any]]) -> None:
    datas_por_ident: Dict[str, set] = defaultdict(set)

    for vaga in vagas:
        ident = str(vaga.get("identificacao_vagas") or "").strip()
        if not ident:
            continue
        data_listagem = str(vaga.get("data_disponibilidade") or vaga.get("data") or "").strip()
        if data_listagem:
            datas_por_ident[ident].add(data_listagem)

    for vaga in vagas:
        ident = str(vaga.get("identificacao_vagas") or "").strip()
        if not ident:
            vaga["dias_ofertadas"] = 1
            continue
        vaga["dias_ofertadas"] = max(1, len(datas_por_ident.get(ident, set())))


def _deduplicar_vagas(vagas: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Mantém apenas a linha mais recente por identificacao_vagas (~10× menos registros)."""
    melhor: Dict[str, Dict[str, Any]] = {}
    sem_ident: List[Dict[str, Any]] = []

    for vaga in vagas:
        ident = str(vaga.get("identificacao_vagas") or "").strip()
        if not ident:
            sem_ident.append(vaga)
            continue
        atual = melhor.get(ident)
        if atual is None:
            melhor[ident] = vaga
        else:
            data_nova = str(vaga.get("data_disponibilidade") or vaga.get("data") or "")
            data_atual = str(atual.get("data_disponibilidade") or atual.get("data") or "")
            if data_nova > data_atual:
                vaga["dias_ofertadas"] = atual["dias_ofertadas"]
                melhor[ident] = vaga

    return list(melhor.values()) + sem_ident


# ── API pública ───────────────────────────────────────────────────────────────

def get_vagas(use_cache: bool = True) -> List[Dict[str, Any]]:
    now = time.time()
    if (
        use_cache
        and CACHE["data"] is not None
        and (now - float(CACHE["timestamp"])) < CACHE_TTL
    ):
        return CACHE["data"]

    try:
        vagas, ultima_atualizacao = _ler_sheets()
        _enriquecer_dias_ofertadas(vagas)
        vagas = _deduplicar_vagas(vagas)

        CACHE["data"] = vagas
        CACHE["ultima_atualizacao"] = ultima_atualizacao
        CACHE["timestamp"] = now
        logger.info("Vagas carregadas do Sheets: %d registros únicos.", len(vagas))
        return vagas

    except Exception as exc:
        logger.error("Falha ao buscar vagas do Sheets (%s). Usando cache anterior.", exc)
        if CACHE["data"] is not None:
            return CACHE["data"]
        return []


def get_payload_vagas() -> Dict[str, Any]:
    vagas = get_vagas()
    return {
        "vagas": vagas,
        "total": len(vagas),
        "ultima_atualizacao": str(CACHE.get("ultima_atualizacao") or ""),
        "atualizado_em": datetime.now(timezone.utc).isoformat(),
    }


def get_ultima_atualizacao() -> str:
    if CACHE["data"] is None:
        get_vagas()
    return str(CACHE.get("ultima_atualizacao") or "")


def get_postos_atendimento() -> Dict[str, Dict[str, Any]]:
    postos = _load_unidades_coords()
    return {
        codigo: {
            "posto_atendimento": codigo,
            "unidade": info.get("unidade", ""),
            "municipio": info.get("municipio", ""),
            "responsavel": info.get("responsavel", ""),
            "telefone_unidade": info.get("telefone_unidade", ""),
            "endereco": info.get("endereco", ""),
            "bairro": info.get("bairro", ""),
        }
        for codigo, info in postos.items()
    }


def get_unidades_coords() -> Dict[str, Dict[str, Any]]:
    """Devolve o dicionário de unidades/postos carregado do Sheets (com cache)."""
    return _load_unidades_coords()


def get_municipios() -> List[str]:
    vagas = get_vagas()
    return sorted({str(v.get("municipio") or "").strip() for v in vagas if v.get("municipio")})


def invalidate_cache() -> None:
    CACHE["timestamp"] = 0
    CACHE["data"] = None
    CACHE["ultima_atualizacao"] = None
    _UNIDADES_CACHE["timestamp"] = 0
    _UNIDADES_CACHE["data"] = None
