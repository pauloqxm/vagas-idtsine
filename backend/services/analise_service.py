import json
import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, List

import requests
from dotenv import load_dotenv

logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

GEMINI_URL_PADRAO = (
    "https://generativelanguage.googleapis.com/v1beta/models/"
    "{modelo}:generateContent"
)
MODELO_PADRAO = "gemini-3.5-flash"
MODELOS_SUBSTITUTOS = {
    "gemini-2.0-flash": MODELO_PADRAO,
    "gemini-2.0-flash-001": MODELO_PADRAO,
    "gemini-2.0-flash-lite": "gemini-3.5-flash-lite",
    "gemini-2.0-flash-lite-001": "gemini-3.5-flash-lite",
}


def _api_key() -> str:
    return str(os.getenv("GEMINI_API_KEY") or "").strip()


def _modelo_configurado() -> str:
    return str(os.getenv("GEMINI_MODEL") or MODELO_PADRAO).strip() or MODELO_PADRAO


def _modelo() -> str:
    return MODELOS_SUBSTITUTOS.get(_modelo_configurado(), _modelo_configurado())


def status_analise() -> Dict[str, Any]:
    return {
        "chave_configurada": bool(_api_key()),
        "modelo": _modelo(),
        "modelo_configurado": _modelo_configurado(),
    }


def _motivo_http(exc: Exception) -> str:
    resp = getattr(exc, "response", None)
    status = getattr(resp, "status_code", None)
    if status == 404:
        return "modelo_indisponivel"
    if status in (401, 403):
        return "chave_invalida"
    if status == 429:
        return "limite_gemini"
    if status:
        return f"http_{status}"
    if isinstance(exc, (requests.Timeout, requests.ConnectionError)):
        return "erro_rede"
    return "erro_gemini"


def _detalhe_erro(exc: Exception) -> str:
    resp = getattr(exc, "response", None)
    texto = ""
    if resp is not None:
        try:
            texto = str(resp.text or "")[:180]
        except Exception:
            texto = ""
    detalhe = f"{type(exc).__name__}: {exc}"
    if texto:
        detalhe = f"{detalhe} | {texto}"
    return detalhe.replace(_api_key(), "***")[:280]


def _pct(parte: int, total: int) -> str:
    if not total:
        return "0%"
    return f"{round((parte / total) * 100)}%"


def _fmt(valor: int) -> str:
    return f"{int(valor or 0):,}".replace(",", ".")


def _itens(lista: Any, limite: int = 5) -> List[Dict[str, Any]]:
    out: List[Dict[str, Any]] = []
    if not isinstance(lista, list):
        return out
    for item in lista[:limite]:
        if not isinstance(item, dict):
            continue
        texto = str(item.get("texto") or "").strip()[:80]
        try:
            total = int(item.get("total") or 0)
        except (TypeError, ValueError):
            total = 0
        if texto:
            out.append({"texto": texto, "total": max(0, total)})
    return out


def limpar_resumo(resumo: Any) -> Dict[str, Any]:
    dados = resumo if isinstance(resumo, dict) else {}

    def inteiro(chave: str) -> int:
        try:
            return max(0, int(dados.get(chave) or 0))
        except (TypeError, ValueError):
            return 0

    return {
        "total": inteiro("total"),
        "regulares": inteiro("regulares"),
        "inclusiva": inteiro("inclusiva"),
        "exclusiva": inteiro("exclusiva"),
        "ocupacoes": inteiro("ocupacoes"),
        "municipios": inteiro("municipios"),
        "regioes_qtde": inteiro("regioes_qtde"),
        "unidades": inteiro("unidades"),
        "data_fonte": str(dados.get("data_fonte") or "").strip()[:24],
        "regioes": _itens(dados.get("regioes")),
        "municipios_top": _itens(dados.get("municipios_top")),
        "ocupacoes_top": _itens(dados.get("ocupacoes_top")),
    }


def textos_regra(resumo: Dict[str, Any]) -> List[str]:
    dados = limpar_resumo(resumo)
    total = dados["total"]
    textos: List[str] = []
    if total > 0:
        textos.append(
            f"O extrato vigente registra {_fmt(total)} vagas, das quais "
            f"{_pct(dados['regulares'], total)} são regulares, "
            f"{_pct(dados['inclusiva'], total)} inclusivas e "
            f"{_pct(dados['exclusiva'], total)} exclusivas PCD."
        )
    if dados["regioes"] and total > 0:
        lider = dados["regioes"][0]
        textos.append(
            f"{lider['texto']} lidera a oferta, com {_fmt(lider['total'])} vagas "
            f"({_pct(lider['total'], total)} do estado)."
        )
    if len(dados["regioes"]) >= 2 and total > 0:
        segundo = dados["regioes"][1]
        textos.append(
            f"{segundo['texto']} aparece em segundo, com {_fmt(segundo['total'])} vagas "
            f"({_pct(segundo['total'], total)})."
        )
    if dados["municipios"] > 0:
        textos.append(
            f"A oferta está distribuída em {_fmt(dados['municipios'])} municípios com vaga aberta."
        )
    if dados["ocupacoes_top"] and total > 0:
        ocup = dados["ocupacoes_top"][0]
        textos.append(
            f"A ocupação com maior demanda é {ocup['texto']}, com {_fmt(ocup['total'])} vagas."
        )
    return textos


def _extrair_textos_modelo(texto: str) -> List[str]:
    bruto = str(texto or "").strip()
    if not bruto:
        return []
    bloco = re.search(r"\{.*\}", bruto, flags=re.S)
    if bloco:
        try:
            payload = json.loads(bloco.group(0))
            itens = payload.get("textos") if isinstance(payload, dict) else None
            if isinstance(itens, list):
                return [str(item).strip() for item in itens if str(item).strip()][:6]
        except json.JSONDecodeError:
            pass
    linhas = []
    for linha in bruto.splitlines():
        limpa = re.sub(r"^[\s\-•\d\.\)\]]+", "", linha).strip()
        if limpa:
            linhas.append(limpa)
    return linhas[:6]


def _chamar_gemini(resumo: Dict[str, Any]) -> List[str]:
    chave = _api_key()
    if not chave:
        return []
    url = GEMINI_URL_PADRAO.format(modelo=_modelo())
    prompt = (
        "Você escreve análises curtas para um relatório interno de alta gestão do IDT "
        "sobre vagas de emprego no Ceará.\n"
        "Use SOMENTE os números do JSON abaixo. Não invente dado, município, região "
        "nem percentual que não esteja no JSON.\n"
        "Escreva 4 a 6 frases em português, tom formal e objetivo.\n"
        "Responda apenas um JSON no formato {\"textos\": [\"frase 1\", \"frase 2\"]}.\n\n"
        f"{json.dumps(resumo, ensure_ascii=False)}"
    )
    resp = requests.post(
        url,
        params={"key": chave},
        json={
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.3,
                "maxOutputTokens": 700,
            },
        },
        timeout=20,
    )
    resp.raise_for_status()
    corpo = resp.json()
    partes = (
        (((corpo.get("candidates") or [{}])[0].get("content") or {}).get("parts") or [])
    )
    texto = " ".join(str(parte.get("text") or "") for parte in partes if isinstance(parte, dict))
    return _extrair_textos_modelo(texto)


def analisar_resumo(resumo: Any) -> Dict[str, Any]:
    dados = limpar_resumo(resumo)
    fallback = textos_regra(dados)
    base = {"modelo": _modelo(), "modelo_configurado": _modelo_configurado()}
    if not _api_key():
        logger.warning("Análise Gemini não usada: GEMINI_API_KEY ausente.")
        return {**base, "textos": fallback, "fonte": "regra", "motivo": "sem_chave"}
    try:
        textos = _chamar_gemini(dados)
        if textos:
            return {**base, "textos": textos, "fonte": "gemini", "motivo": "ok"}
        logger.warning("Gemini respondeu sem textos utilizáveis.")
        return {**base, "textos": fallback, "fonte": "regra", "motivo": "resposta_vazia"}
    except Exception as exc:
        motivo = _motivo_http(exc)
        logger.warning(
            "Falha na análise Gemini; usando regras. motivo=%s detalhe=%s",
            motivo,
            _detalhe_erro(exc),
        )
        return {**base, "textos": fallback, "fonte": "regra", "motivo": motivo}
