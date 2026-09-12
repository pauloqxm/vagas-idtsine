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


def montar_payload(body: Dict[str, Any]) -> Dict[str, Any]:
    empresa_in = body.get("empresa") if isinstance(body.get("empresa"), dict) else {}
    vaga_in = body.get("vaga") if isinstance(body.get("vaga"), dict) else {}

    tipo = _texto(empresa_in.get("tipoCadastro")).lower()
    if tipo not in TIPOS_CADASTRO:
        raise ValueError("Informe o tipo de cadastro: CPF, CNPJ ou CEI.")

    numero = _somente_digitos(empresa_in.get("numero"))
    tamanho = TAMANHO_INSCRICAO[tipo]
    if len(numero) != tamanho:
        raise ValueError(f"O número de inscrição do {tipo.upper()} deve ter {tamanho} dígitos.")

    nome = _texto(empresa_in.get("nomeEmpresa"), 150)
    contato = _texto(empresa_in.get("contato"), 120)
    email = _texto(empresa_in.get("email"), 100)
    municipio = _texto(empresa_in.get("municipio"), 80)
    celular = _texto(empresa_in.get("celular"), 20)
    telefone = _texto(empresa_in.get("telefone"), 20)
    cargo = _texto(vaga_in.get("cargo"), 120)
    descricao = _texto(vaga_in.get("descricaoVaga"), 300)
    tipo_vaga = _texto(vaga_in.get("tipoVaga"), 40)

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
    if not cargo:
        raise ValueError("Informe o cargo.")
    if not tipo_vaga:
        raise ValueError("Informe o tipo da vaga.")
    if not descricao:
        raise ValueError("Informe a descrição da vaga.")

    try:
        qtde = int(vaga_in.get("qtdeVaga") or 0)
    except (TypeError, ValueError):
        qtde = 0
    if qtde < 1:
        raise ValueError("Informe a quantidade de vagas.")

    pcd = vaga_in.get("pcd")
    if isinstance(pcd, str):
        pcd = pcd.strip().lower() in {"1", "true", "sim", "yes"}
    else:
        pcd = bool(pcd)

    return {
        "empresa": {
            "tipoCadastro": tipo,
            "numero": numero,
            "nomeEmpresa": nome,
            "contato": contato,
            "email": email,
            "telefone": telefone,
            "celular": celular,
            "municipio": municipio,
        },
        "vaga": {
            "cargo": cargo,
            "tipoVaga": tipo_vaga,
            "descricaoVaga": descricao,
            "qtdeVaga": qtde,
            "pcd": pcd,
        },
    }


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


def enviar_oferta(payload: Dict[str, Any]) -> Tuple[int, Dict[str, Any]]:
    if not _api_key():
        raise RuntimeError("VAGAS_IMO_API_KEY não configurada")

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
    corpo: Any
    try:
        corpo = resp.json()
    except ValueError:
        corpo = {"mensagem": (resp.text or "").strip()[:300]}

    mensagem = _mensagem_api(corpo, resp.status_code)
    if not resp.ok:
        logger.warning("Falha ao ofertar vaga na API (%s): %s", resp.status_code, mensagem)
        return resp.status_code, {"ok": False, "mensagem": mensagem}

    return resp.status_code, {"ok": True, "mensagem": mensagem, "dados": corpo}
