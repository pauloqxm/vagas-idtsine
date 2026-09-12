import logging
import os
import re
from pathlib import Path
from typing import Any, Dict, Tuple

import requests
from dotenv import load_dotenv

from backend.services.vagas_service import FETCH_TIMEOUT

logger = logging.getLogger(__name__)

load_dotenv(Path(__file__).resolve().parents[2] / ".env")

OFERTA_URL_PADRAO = "https://sistemas2.idt.org.br/api_vagasimo/api/oferta-vaga"
TIPOS_CADASTRO = {"cpf", "cnpj", "cei"}
TAMANHO_INSCRICAO = {"cnpj": 14, "cpf": 11, "cei": 12}


def _api_key() -> str:
    return str(os.getenv("VAGAS_IMO_API_KEY") or "").strip()


def _oferta_url() -> str:
    return str(os.getenv("VAGAS_IMO_OFERTA_URL") or OFERTA_URL_PADRAO).strip()


def _texto(val: Any, limite: int = 200) -> str:
    return str(val or "").strip()[:limite]


def _somente_digitos(val: Any) -> str:
    return re.sub(r"\D", "", str(val or ""))


def _bloco(body: Dict[str, Any], *chaves: str) -> Dict[str, Any]:
    for chave in chaves:
        bloco = body.get(chave)
        if isinstance(bloco, dict) and bloco:
            return bloco
    return body if isinstance(body, dict) else {}


def montar_payload(body: Dict[str, Any]) -> Dict[str, Any]:
    origem = body if isinstance(body, dict) else {}
    empresa_in = _bloco(origem, "empresa", "Empresa")
    vaga_in = _bloco(origem, "vaga", "Vaga")

    def _emp(*chaves: str) -> Any:
        for chave in chaves:
            if empresa_in.get(chave) not in (None, ""):
                return empresa_in.get(chave)
            if origem.get(chave) not in (None, ""):
                return origem.get(chave)
        return ""

    def _vg(*chaves: str) -> Any:
        for chave in chaves:
            if vaga_in.get(chave) not in (None, ""):
                return vaga_in.get(chave)
            if origem.get(chave) not in (None, ""):
                return origem.get(chave)
        return ""

    tipo = _texto(_emp("tipoCadastro", "TipoCadastro")).lower()
    if tipo not in TIPOS_CADASTRO:
        raise ValueError("Informe o tipo de cadastro: CPF, CNPJ ou CEI.")

    numero = _somente_digitos(_emp("numero", "Numero"))
    tamanho = TAMANHO_INSCRICAO[tipo]
    if len(numero) != tamanho:
        raise ValueError(f"O número de inscrição do {tipo.upper()} deve ter {tamanho} dígitos.")

    nome = _texto(_emp("nomeEmpresa", "NomeEmpresa"), 150)
    contato = _texto(_emp("contato", "Contato"), 120)
    email = _texto(_emp("email", "Email"), 100)
    municipio = _texto(_emp("municipio", "Municipio"), 80)
    celular = _texto(_emp("celular", "Celular"), 20)
    telefone = _texto(_emp("telefone", "Telefone") or celular, 20)
    cargo = _texto(_vg("cargo", "Cargo"), 120)
    descricao = _texto(_vg("descricaoVaga", "DescricaoVaga"), 300)
    tipo_vaga = _texto(_vg("tipoVaga", "TipoVaga"), 40)

    if not nome:
        raise ValueError("Informe o nome da empresa.")
    if not municipio:
        raise ValueError("Selecione o município.")
    if not contato:
        raise ValueError("Informe o nome do contato.")
    if not email or "@" not in email:
        raise ValueError("Informe um e-mail válido.")
    if len(_somente_digitos(celular)) < 10:
        raise ValueError("Informe o celular com DDD.")
    if len(_somente_digitos(telefone)) < 10:
        raise ValueError("Informe o telefone com DDD.")
    if not cargo:
        raise ValueError("Informe o cargo.")
    if not tipo_vaga:
        raise ValueError("Informe o tipo da vaga.")
    if not descricao:
        raise ValueError("Informe a descrição da vaga.")

    try:
        qtde = int(_vg("qtdeVaga", "QtdeVaga") or 0)
    except (TypeError, ValueError):
        qtde = 0
    if qtde < 1:
        raise ValueError("Informe a quantidade de vagas.")

    pcd = _vg("pcd", "Pcd")
    if pcd in (None, ""):
        pcd = vaga_in.get("pcd")
    if isinstance(pcd, str):
        pcd = pcd.strip().lower() in {"1", "true", "sim", "yes"}
    else:
        pcd = bool(pcd)

    empresa = {
        "tipoCadastro": tipo,
        "numero": numero,
        "nomeEmpresa": nome,
        "contato": contato,
        "email": email,
        "telefone": telefone,
        "celular": celular,
        "municipio": municipio,
    }
    vaga = {
        "cargo": cargo,
        "tipoVaga": tipo_vaga,
        "descricaoVaga": descricao,
        "qtdeVaga": qtde,
        "pcd": pcd,
    }
    return {"empresa": empresa, "vaga": vaga}


def _mensagem_api(payload: Any, status: int) -> str:
    if isinstance(payload, dict):
        for chave in ("mensagem", "message", "detail", "erro", "error"):
            valor = payload.get(chave)
            if isinstance(valor, str) and valor.strip():
                return valor.strip()
    if isinstance(payload, str) and payload.strip():
        return payload.strip()
    if status >= 400:
        return "Não foi possível enviar a solicitação. Tente novamente."
    return "Solicitação enviada com sucesso."


def _pascal(bloco: Dict[str, Any]) -> Dict[str, Any]:
    return {chave[:1].upper() + chave[1:]: valor for chave, valor in bloco.items()}


def _formatos_envio(payload: Dict[str, Any]) -> list[Dict[str, Any]]:
    empresa = payload.get("empresa") or {}
    vaga = payload.get("vaga") or {}
    return [
        {"empresa": empresa, "vaga": vaga},
        {**empresa, "vaga": vaga},
        {**empresa, **vaga},
        {"Empresa": _pascal(empresa), "Vaga": _pascal(vaga)},
    ]


def _empresa_nao_ligada(mensagem: str) -> bool:
    texto = (mensagem or "").lower()
    return "nomeempresa" in texto or ("numero" in texto and "obrigat" in texto)


def _post_oferta(payload: Dict[str, Any]) -> Tuple[int, Any]:
    resp = requests.post(
        _oferta_url(),
        json=payload,
        headers={
            "x-api-key": _api_key(),
            "Accept": "application/json",
            "Content-Type": "application/json",
        },
        timeout=FETCH_TIMEOUT,
    )
    try:
        corpo = resp.json()
    except ValueError:
        corpo = {"mensagem": (resp.text or "").strip()[:300]}
    return resp.status_code, corpo


def enviar_oferta(payload: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
    if not _api_key():
        raise RuntimeError("VAGAS_IMO_API_KEY não configurada")

    ultimo_status = 502
    ultima_mensagem = "Não foi possível enviar a solicitação. Tente novamente."
    ultimo_corpo: Any = {}

    for formato in _formatos_envio(payload):
        status, corpo = _post_oferta(formato)
        mensagem = _mensagem_api(corpo, status)
        if 200 <= status < 300:
            return status, {"ok": True, "mensagem": mensagem, "dados": corpo}
        ultimo_status = status
        ultima_mensagem = mensagem
        ultimo_corpo = corpo
        if not _empresa_nao_ligada(mensagem):
            break
        logger.warning("API recusou formato de oferta (%s): %s", status, mensagem)

    logger.warning("Falha ao ofertar vaga na API (%s): %s", ultimo_status, ultima_mensagem)
    return ultimo_status, {"ok": False, "mensagem": ultima_mensagem, "dados": ultimo_corpo}
