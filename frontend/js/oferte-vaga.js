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
  CNPJ: { max: 14, placeholder: "Informe o número do CNPJ" },
  CPF: { max: 11, placeholder: "Informe o número do CPF" },
  CEI: { max: 12, placeholder: "Informe o número do CEI" },
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
  const tipo = form.querySelector('input[name="tipo-cadastro"]:checked')?.value || "CNPJ";
  const config = TIPO_INSCRICAO[tipo] || TIPO_INSCRICAO.CNPJ;
  const campo = form.querySelector("#numero-inscricao");
  campo.maxLength = config.max;
  campo.placeholder = config.placeholder;
  campo.value = somenteDigitos(campo.value).slice(0, config.max);
}

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("form-ofertar-vaga");
  if (!form) return;

  preencherMunicipios(form.querySelector("#municipio"));
  aplicarTipoInscricao(form);

  form.querySelectorAll('input[name="tipo-cadastro"]').forEach((radio) => {
    radio.addEventListener("change", () => aplicarTipoInscricao(form));
  });

  form.querySelector("#numero-inscricao").addEventListener("input", (event) => {
    const tipo = form.querySelector('input[name="tipo-cadastro"]:checked')?.value || "CNPJ";
    const max = (TIPO_INSCRICAO[tipo] || TIPO_INSCRICAO.CNPJ).max;
    event.target.value = somenteDigitos(event.target.value).slice(0, max);
  });

  form.querySelector("#telefone").addEventListener("input", (event) => {
    event.target.value = mascaraTelefone(event.target.value);
  });

  form.querySelector("#celular").addEventListener("input", (event) => {
    event.target.value = mascaraCelular(event.target.value);
  });

  form.querySelector("#quantidade").addEventListener("input", (event) => {
    event.target.value = somenteDigitos(event.target.value).slice(0, 3);
  });

  const descricao = form.querySelector("#descricao");
  const contador = form.querySelector("#descricao-contador");
  const atualizarContador = () => {
    if (contador) contador.textContent = `${descricao.value.length}/300`;
  };
  descricao.addEventListener("input", atualizarContador);
  atualizarContador();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
  });
});
