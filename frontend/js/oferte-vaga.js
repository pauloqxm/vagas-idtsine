const MUNICIPIOS_CE = [
  "ABAIARA", "ACARAPE", "ACARAÚ", "ACOPIARA", "AIUABA", "ALCÂNTARAS", "ALTANEIRA",
  "ALTO SANTO", "AMONTADA", "ANTONINA DO NORTE", "APUIARÉS", "AQUIRAZ", "ARACATI",
  "ARACOIABA", "ARARENDÁ", "ARARIPE", "ARATUBA", "ARNEIROZ", "ASSARÉ", "AURORA",
  "BAIXIO", "BANABUIÚ", "BARBALHA", "BARREIRA", "BARRO", "BARROQUINHA", "BATURITÉ",
  "BEBERIBE", "BELA CRUZ", "BOA VIAGEM", "BREJO SANTO", "CAMOCIM", "CAMPOS SALES",
  "CANINDÉ", "CAPISTRANO", "CARIDADE", "CARIRÉ", "CARIRIAÇU", "CARIÚS", "CARNAUBAL",
  "CASCAVEL", "CATARINA", "CATUNDA", "CAUCAIA", "CEDRO", "CHAVAL", "CHORÓ",
  "CHOROZINHO", "COREAÚ", "CRATEÚS", "CRATO", "CROATÁ", "CRUZ",
  "DEPUTADO IRAPUAN PINHEIRO", "ERERÊ", "EUSÉBIO", "FARIAS BRITO", "FORQUILHA",
  "FORTALEZA", "FORTIM", "FRECHEIRINHA", "GENERAL SAMPAIO", "GRAÇA", "GRANJA",
  "GRANJEIRO", "GROAÍRAS", "GUAIÚBA", "GUARACIABA DO NORTE", "GUARAMIRANGA",
  "HIDROLÂNDIA", "HORIZONTE", "IBARETAMA", "IBIAPINA", "IBICUITINGA", "ICAPUÍ",
  "ICÓ", "IGUATU", "INDEPENDÊNCIA", "IPAPORANGA", "IPAUMIRIM", "IPU", "IPUEIRAS",
  "IRACEMA", "IRAUÇUBA", "ITAIÇABA", "ITAITINGA", "ITAPAGÉ", "ITAPIPOCA",
  "ITAPIÚNA", "ITAREMA", "ITATIRA", "JAGUARETAMA", "JAGUARIBARA", "JAGUARIBE",
  "JAGUARUANA", "JARDIM", "JATI", "JIJOCA DE JERICOACOARA", "JUAZEIRO DO NORTE",
  "JUCÁS", "LAVRAS DA MANGABEIRA", "LIMOEIRO DO NORTE", "MADALENA", "MARACANAÚ",
  "MARANGUAPE", "MARCO", "MARTINÓPOLE", "MASSAPÊ", "MAURITI", "MERUOCA",
  "MILAGRES", "MILHÃ", "MIRAÍMA", "MISSÃO VELHA", "MOMBAÇA", "MONSENHOR TABOSA",
  "MORADA NOVA", "MORAÚJO", "MORRINHOS", "MUCAMBO", "MULUNGU", "NOVA OLINDA",
  "NOVA RUSSAS", "NOVO ORIENTE", "OCARA", "ORÓS", "PACAJUS", "PACATUBA", "PACOTI",
  "PACUJÁ", "PALHANO", "PALMÁCIA", "PARACURU", "PARAIPABA", "PARAMBU", "PARAMOTI",
  "PEDRA BRANCA", "PENAFORTE", "PENTECOSTE", "PEREIRO", "PINDORETAMA",
  "PIQUET CARNEIRO", "PIRES FERREIRA", "PORANGA", "PORTEIRAS", "POTENGI",
  "POTIRETAMA", "QUITERIANÓPOLIS", "QUIXADÁ", "QUIXELÔ", "QUIXERAMOBIM",
  "QUIXERÉ", "REDENÇÃO", "RERIUTABA", "RUSSAS", "SABOEIRO", "SALITRE",
  "SANTA QUITÉRIA", "SANTANA DO ACARAÚ", "SANTANA DO CARIRI", "SÃO BENEDITO",
  "SÃO GONÇALO DO AMARANTE", "SÃO JOÃO DO JAGUARIBE", "SÃO LUÍS DO CURU",
  "SENADOR POMPEU", "SENADOR SÁ", "SOBRAL", "SOLONÓPOLE", "TABULEIRO DO NORTE",
  "TAMBORIL", "TARRAFAS", "TAUÁ", "TEJUÇUOCA", "TIANGUÁ", "TRAIRI", "TURURU",
  "UBAJARA", "UMARI", "UMIRIM", "URUBURETAMA", "URUOCA", "VARJOTA",
  "VÁRZEA ALEGRE", "VIÇOSA DO CEARÁ",
];

const TIPO_INSCRICAO = {
  cnpj: { max: 14, placeholder: "Informe o número do CNPJ" },
  cpf: { max: 11, placeholder: "Informe o número do CPF" },
  cei: { max: 12, placeholder: "Informe o número do CEI" },
};

function somenteDigitos(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function mascaraTelefone(valor) {
  const d = somenteDigitos(valor).slice(0, 10);
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0, 2)})${d.slice(2)}`;
  return `(${d.slice(0, 2)})${d.slice(2, 6)}.${d.slice(6)}`;
}

function mascaraCelular(valor) {
  const d = somenteDigitos(valor).slice(0, 11);
  if (d.length <= 2) return d;
  if (d.length <= 7) return `(${d.slice(0, 2)})${d.slice(2)}`;
  return `(${d.slice(0, 2)})${d.slice(2, 7)}.${d.slice(7)}`;
}

function preencherMunicipios(select) {
  select.innerHTML = ['<option value="">Selecione o município</option>']
    .concat(MUNICIPIOS_CE.map((nome) => `<option value="${nome}">${nome}</option>`))
    .join("");
}

function aplicarTipoInscricao(form) {
  const tipo = form.querySelector('input[name="tipoCadastro"]:checked')?.value || "cnpj";
  const config = TIPO_INSCRICAO[tipo] || TIPO_INSCRICAO.cnpj;
  const campo = form.querySelector("#numero");
  campo.maxLength = config.max;
  campo.placeholder = config.placeholder;
  campo.value = somenteDigitos(campo.value).slice(0, config.max);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-ofertar-vaga");
  if (!form) return;

  preencherMunicipios(form.querySelector("#municipio"));
  aplicarTipoInscricao(form);

  form.querySelectorAll('input[name="tipoCadastro"]').forEach((radio) => {
    radio.addEventListener("change", () => aplicarTipoInscricao(form));
  });

  form.querySelector("#numero").addEventListener("input", (event) => {
    const tipo = form.querySelector('input[name="tipoCadastro"]:checked')?.value || "cnpj";
    const max = (TIPO_INSCRICAO[tipo] || TIPO_INSCRICAO.cnpj).max;
    event.target.value = somenteDigitos(event.target.value).slice(0, max);
  });

  form.querySelector("#telefone").addEventListener("input", (event) => {
    event.target.value = mascaraTelefone(event.target.value);
  });

  form.querySelector("#celular").addEventListener("input", (event) => {
    event.target.value = mascaraCelular(event.target.value);
  });

  form.querySelector("#qtdeVaga").addEventListener("input", (event) => {
    event.target.value = somenteDigitos(event.target.value).slice(0, 3);
  });

  const descricao = form.querySelector("#descricaoVaga");
  const contador = form.querySelector("#descricao-contador");
  const atualizarContador = () => {
    if (contador) contador.textContent = `${descricao.value.length}/300`;
  };
  descricao.addEventListener("input", atualizarContador);
  atualizarContador();

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    await enviarOferta(form);
  });
});

function mensagemErroApi(data) {
  if (!data) return "Não foi possível enviar a solicitação. Tente novamente.";
  if (typeof data.mensagem === "string" && data.mensagem.trim()) return data.mensagem;
  if (typeof data.detail === "string" && data.detail.trim()) return data.detail;
  if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  return "Não foi possível enviar a solicitação. Tente novamente.";
}

function mostrarStatus(form, mensagem, tipo) {
  const status = form.querySelector("#offer-status");
  if (!status) return;
  status.textContent = mensagem;
  status.classList.remove("hidden", "offer-status--ok", "offer-status--erro");
  if (tipo) status.classList.add(`offer-status--${tipo}`);
}

function valorCampo(form, nome) {
  return String(form.elements.namedItem(nome)?.value || "").trim();
}

function montarPayload(form) {
  const celular = valorCampo(form, "celular");
  const telefone = valorCampo(form, "telefone") || celular;
  const empresa = {
    tipoCadastro: valorCampo(form, "tipoCadastro").toLowerCase(),
    numero: valorCampo(form, "numero"),
    nomeEmpresa: valorCampo(form, "nomeEmpresa"),
    contato: valorCampo(form, "contato"),
    email: valorCampo(form, "email"),
    telefone,
    celular,
    municipio: valorCampo(form, "municipio"),
  };
  const vaga = {
    cargo: valorCampo(form, "cargo"),
    tipoVaga: valorCampo(form, "tipoVaga"),
    descricaoVaga: valorCampo(form, "descricaoVaga"),
    qtdeVaga: Number(somenteDigitos(valorCampo(form, "qtdeVaga"))) || 0,
    pcd: Boolean(form.elements.namedItem("pcd")?.checked),
  };
  return { empresa, vaga, ...empresa, ...vaga };
}

async function enviarOferta(form) {
  const botao = form.querySelector('button[type="submit"]');
  const payload = montarPayload(form);
  mostrarStatus(form, "Enviando solicitação...", "");
  if (botao) botao.disabled = true;

  try {
    const res = await fetch("/api/oferta-vaga", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) {
      throw new Error(mensagemErroApi(data));
    }
    mostrarStatus(form, data.mensagem || "Solicitação enviada com sucesso.", "ok");
    form.reset();
    aplicarTipoInscricao(form);
    const descricao = form.querySelector("#descricaoVaga");
    const contador = form.querySelector("#descricao-contador");
    if (contador && descricao) contador.textContent = `${descricao.value.length}/300`;
  } catch (error) {
    mostrarStatus(
      form,
      error instanceof Error ? error.message : "Não foi possível enviar a solicitação.",
      "erro"
    );
  } finally {
    if (botao) botao.disabled = false;
  }
}
