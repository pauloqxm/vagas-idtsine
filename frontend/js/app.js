const state = {
  vagas: [],
  filtradas: [],
  popularesTipo: "vagas",
  pagina: 1,
  porPagina: 12,
  filtros: {
    cargo: "",
    unidade: "",
    municipio: "",
    dataPeriodo: "mais-recente",
    pcd: false,
  },
  dataMaisRecente: null,
};

const SAA_URL = "https://idt.org.br/saa4/login";

const els = {};

function cacheEls() {
  els.form = document.getElementById("busca-form");
  els.cargo = document.getElementById("busca-cargo");
  els.unidade = document.getElementById("filtro-unidade");
  els.municipio = document.getElementById("filtro-municipio");
  els.data = document.getElementById("filtro-data");
  els.pcd = document.getElementById("filtro-pcd");
  els.status = document.getElementById("status-text");
  els.lista = document.getElementById("lista-vagas");
  els.paginacao = document.getElementById("paginacao");
  els.limpar = document.getElementById("btn-limpar");
  els.modal = document.getElementById("modal-vaga");
  els.modalBody = document.getElementById("modal-body");
  els.popularList = document.getElementById("popular-list");
  els.popularTabs = document.querySelectorAll("[data-popular-tab]");
  els.kpiTotal = document.getElementById("kpi-total-vagas");
  els.kpiPcd = document.getElementById("kpi-vagas-pcd");
  els.kpiNaoPcd = document.getElementById("kpi-vagas-nao-pcd");
  els.ultimaAtualizacao = document.getElementById("ultima-atualizacao");
}

function normalizar(txt) {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function contem(texto, busca) {
  const termo = normalizar(busca);
  if (!termo) return true;
  return normalizar(texto).includes(termo);
}

function qtde(vaga) {
  return Number(vaga.qtde_vagas) || 1;
}

function parseDataBR(valor) {
  const partes = String(valor || "").trim().split("/");
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes.map(Number);
  if (!dia || !mes || !ano) return null;
  const data = new Date(ano, mes - 1, dia);
  data.setHours(0, 0, 0, 0);
  return data;
}

function diffDias(a, b) {
  const msDia = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / msDia);
}

function calcularDataMaisRecente() {
  const datas = state.vagas.map((vaga) => parseDataBR(vaga.data)).filter(Boolean);
  if (datas.length === 0) return null;
  return datas.reduce((maior, data) => (data > maior ? data : maior), datas[0]);
}

function dataDentroPeriodo(dataTexto, periodo) {
  if (!periodo || periodo === "qualquer") return true;
  const data = parseDataBR(dataTexto);
  const ref = state.dataMaisRecente;
  if (!data || !ref) return false;
  const diferenca = diffDias(ref, data);
  if (diferenca < 0) return false;
  if (periodo === "mais-recente" || periodo === "hoje") return diferenca === 0;
  const dias = Number(periodo);
  return Number.isFinite(dias) ? diferenca < dias : true;
}

function contatoPrincipal(vaga) {
  const email = String(vaga.email_contato || "").trim();
  const tel =
    String(vaga.telefone_unidade || "").trim() ||
    String(vaga.celular_responsavel || "").trim() ||
    String(vaga.telefone || "").trim();

  if (tel) {
    return {
      tipo: "telefone",
      texto: tel,
      href: SAA_URL,
      acao: "Escolher a vaga",
    };
  }

  if (email) {
    return {
      tipo: "email",
      texto: email,
      href: SAA_URL,
      acao: "Escolher a vaga",
    };
  }

  return null;
}

function dadosDoPosto(posto) {
  return DetalhesVaga.dadosDoPosto(posto);
}

function enriquecerVagaComPosto(vaga) {
  return DetalhesVaga.enriquecerVagaComPosto(vaga);
}

function buscarVagaPorId(id) {
  const alvo = Number(id);
  return (
    state.filtradas.find((item) => Number(item.id) === alvo) ||
    state.vagas.find((item) => Number(item.id) === alvo)
  );
}

async function carregarVagas() {
  const res = await fetch("/api/vagas");
  if (!res.ok) throw new Error("Não foi possível carregar as vagas.");
  const data = await res.json();
  state.vagas = Array.isArray(data.vagas) ? data.vagas : [];
  state.dataMaisRecente = calcularDataMaisRecente();
  // dias_ofertadas já vem calculado e deduplicado pelo backend
  atualizarUltimaAtualizacao(data.ultima_atualizacao || "");
  state.filtradas = [...state.vagas];
}

function atualizarUltimaAtualizacao(valor) {
  if (!els.ultimaAtualizacao) return;
  const texto = String(valor || "").trim();
  els.ultimaAtualizacao.textContent = texto
    ? `Última atualização: ${texto}`
    : "";
}


function unicoOrdenado(campo) {
  return [
    ...new Set(
      state.vagas
        .map((vaga) => String(vaga[campo] || "").trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function preencherSelect(select, valores, textoInicial) {
  select.innerHTML = [
    `<option value="">${escapeHtml(textoInicial)}</option>`,
    ...valores.map(
      (valor) => `<option value="${escapeAttr(valor)}">${escapeHtml(valor)}</option>`
    ),
  ].join("");
}

function popularFiltrosSuspensos() {
  preencherSelect(els.unidade, unicoOrdenado("unidade"), "Todas");
  preencherSelect(els.municipio, unicoOrdenado("municipio"), "Todos");

  const datalist = document.getElementById("lista-ocupacoes");
  if (datalist) {
    datalist.innerHTML = unicoOrdenado("ocupacao")
      .map((v) => `<option value="${escapeAttr(v)}">`)
      .join("");
  }
}

function aplicarFiltros() {
  const { cargo, unidade, municipio, dataPeriodo, pcd } = state.filtros;

  state.filtradas = state.vagas.filter((vaga) => {
    if (cargo && !contem(vaga.ocupacao, cargo)) return false;
    if (unidade && normalizar(vaga.unidade) !== normalizar(unidade)) return false;
    if (municipio && normalizar(vaga.municipio) !== normalizar(municipio)) return false;
    if (!dataDentroPeriodo(vaga.data, dataPeriodo)) return false;
    if (pcd && !vaga.pcd) return false;
    return true;
  });

  state.pagina = 1;
  render();
}

function totalVagasQuantidades() {
  return state.filtradas.reduce((acc, vaga) => acc + qtde(vaga), 0);
}

function calcularKPIs() {
  let total = 0;
  let pcd = 0;
  let naoPcd = 0;

  state.filtradas.forEach((vaga) => {
    const q = qtde(vaga);
    total += q;
    if (vaga.pcd) pcd += q;
    else naoPcd += q;
  });

  return { total, pcd, naoPcd };
}

function atualizarKPIs() {
  const { total, pcd, naoPcd } = calcularKPIs();
  if (els.kpiTotal) els.kpiTotal.textContent = String(total);
  if (els.kpiPcd) els.kpiPcd.textContent = String(pcd);
  if (els.kpiNaoPcd) els.kpiNaoPcd.textContent = String(naoPcd);
}

function atualizarStatus() {
  const totalOfertas = state.filtradas.length;
  const totalQtd = totalVagasQuantidades();
  const temBusca =
    state.filtros.cargo ||
    state.filtros.unidade ||
    state.filtros.municipio ||
    state.filtros.dataPeriodo !== "mais-recente" ||
    state.filtros.pcd;

  els.status.textContent =
    totalOfertas === 0
      ? "Nenhuma vaga encontrada. Tente outra palavra, unidade ou município."
      : `${totalQtd} vaga(s) encontrada(s) em ${totalOfertas} oferta(s).`;

  els.limpar.classList.toggle("hidden", !temBusca);
}

function render() {
  atualizarStatus();
  atualizarKPIs();
  renderLista();
  renderPaginacao();
}

function textoRankingVaga(vaga) {
  return String(vaga.ocupacao || "").trim();
}

function textoRankingPorTipo(vaga, tipo) {
  if (tipo === "cidades") return String(vaga.municipio || "").trim();
  if (tipo === "unidades") return String(vaga.unidade || "").trim();
  return textoRankingVaga(vaga);
}

function obterRanking(tipo) {
  const mapa = new Map();

  state.vagas.forEach((vaga) => {
    const texto = textoRankingPorTipo(vaga, tipo);
    if (!texto) return;

    const chave = normalizar(texto);
    const atual = mapa.get(chave) || {
      texto,
      identificacoes: new Set(),
      ofertas: 0,
      total: 0,
    };
    const identificacao = String(vaga.identificacao_vagas || vaga.id || "").trim();
    if (identificacao) atual.identificacoes.add(identificacao);
    atual.ofertas = atual.identificacoes.size || atual.ofertas + 1;
    atual.total += qtde(vaga);
    mapa.set(chave, atual);
  });

  return [...mapa.values()]
    .sort((a, b) => b.ofertas - a.ofertas || b.total - a.total || a.texto.localeCompare(b.texto, "pt-BR"))
    .slice(0, 12);
}

function valorPopularSelecionado(tipo) {
  if (tipo === "cidades") return els.municipio.value;
  if (tipo === "unidades") return els.unidade.value;
  return els.cargo.value.trim();
}

function ativarAbaPopular(tipo) {
  state.popularesTipo = tipo;
  els.popularTabs.forEach((item) => {
    const active = item.dataset.popularTab === tipo;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", active ? "true" : "false");
  });
  renderPopulares();
}

function renderPopulares() {
  if (!els.popularList) return;
  const selecionado = valorPopularSelecionado(state.popularesTipo);
  const ranking = obterRanking(state.popularesTipo);

  if (
    selecionado &&
    !ranking.some((item) => normalizar(item.texto) === normalizar(selecionado))
  ) {
    ranking.unshift({ texto: selecionado, ofertas: 0, total: 0 });
  }

  if (ranking.length === 0) {
    els.popularList.innerHTML = "<span>Nenhuma busca popular encontrada.</span>";
    return;
  }

  els.popularList.innerHTML = ranking
    .map(
      (item) => {
        const active = selecionado && normalizar(item.texto) === normalizar(selecionado);
        return `
        <button type="button" class="popular-item ${active ? "active" : ""}" data-popular-value="${escapeAttr(item.texto)}" title="${escapeAttr(item.texto)}" aria-pressed="${active ? "true" : "false"}">
          ${escapeHtml(item.texto)}
        </button>
      `;
      }
    )
    .join("");

  els.popularList.querySelectorAll("[data-popular-value]").forEach((btn) => {
    btn.addEventListener("click", () => aplicarBuscaPopular(btn.dataset.popularValue || ""));
  });
}

function aplicarBuscaPopular(valor) {
  if (!valor) return;
  if (state.popularesTipo === "cidades") {
    els.municipio.value = valor;
  } else if (state.popularesTipo === "unidades") {
    els.unidade.value = valor;
  } else {
    els.cargo.value = valor;
  }
  state.filtros.cargo = els.cargo.value.trim();
  state.filtros.unidade = els.unidade.value;
  state.filtros.municipio = els.municipio.value;
  state.filtros.dataPeriodo = els.data.value;
  state.filtros.pcd = els.pcd.checked;
  aplicarFiltros();
  renderPopulares();
  document.getElementById("resultados").scrollIntoView({ behavior: "smooth" });
}

function renderLista() {
  if (state.filtradas.length === 0) {
    els.lista.innerHTML = `
      <div class="empty-card">
        <h3>Não encontramos vagas com essa busca.</h3>
        <p>Confira se a palavra está correta ou escolha outra unidade ou município.</p>
      </div>
    `;
    return;
  }

  const inicio = (state.pagina - 1) * state.porPagina;
  const pagina = state.filtradas.slice(inicio, inicio + state.porPagina);
  els.lista.innerHTML = pagina.map(renderCard).join("");

  els.lista.querySelectorAll("[data-open-vaga]").forEach((btn) => {
    btn.addEventListener("click", () =>
      abrirDetalhes(btn.dataset.openVaga, btn.dataset.postoAtendimento || "")
    );
  });
}

function diasOfertadas(vaga) {
  const valor = Number(vaga.dias_ofertadas);
  return Number.isFinite(valor) && valor > 0 ? valor : 1;
}

function renderCard(vaga) {
  const contato = contatoPrincipal(vaga);
  const contatoHtml = contato
    ? `<a class="btn btn-call" href="${escapeAttr(contato.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(contato.acao)}</a>`
    : "";
  const pcd = vaga.pcd ? '<span class="tag tag-pcd">PCD</span>' : "";
  const mapaHref = `mapa.html?vaga=${encodeURIComponent(vaga.id)}`;

  return `
    <article class="vaga-card">
      <div class="vaga-card__top">
        <div>
          <h3 class="vaga-title">${escapeHtml(vaga.ocupacao || "Vaga sem nome")}</h3>
          <div class="vaga-info">
            <span><strong>Cidade:</strong> ${escapeHtml(vaga.municipio || "Não informado")}</span>
            <span><strong>Unidade:</strong> ${escapeHtml(vaga.unidade || "Não informado")}</span>
          </div>
        </div>
        <span class="vaga-qty">${qtde(vaga)} vaga(s)</span>
      </div>
      <div class="tag-row">
        ${pcd}
        ${vaga.data ? `<span class="tag">Publicada em ${escapeHtml(vaga.data)}</span>` : ""}
        <span class="tag tag-dias">Dias ofertadas: ${diasOfertadas(vaga)}</span>
      </div>
      <div class="vaga-actions">
        <button type="button" class="btn btn-primary" data-open-vaga="${vaga.id}" data-posto-atendimento="${escapeAttr(vaga.posto_atendimento || "")}">Ver detalhes</button>
        <a class="btn btn-map" href="${escapeAttr(mapaHref)}">Ver no mapa</a>
        ${contatoHtml}
      </div>
    </article>
  `;
}

function renderPaginacao() {
  const paginas = Math.ceil(state.filtradas.length / state.porPagina);
  if (paginas <= 1) {
    els.paginacao.classList.add("hidden");
    els.paginacao.innerHTML = "";
    return;
  }

  els.paginacao.classList.remove("hidden");
  els.paginacao.innerHTML = `
    <button type="button" id="pag-anterior" ${state.pagina <= 1 ? "disabled" : ""}>Anterior</button>
    <strong>Página ${state.pagina} de ${paginas}</strong>
    <button type="button" id="pag-proxima" ${state.pagina >= paginas ? "disabled" : ""}>Próxima</button>
  `;

  document.getElementById("pag-anterior").addEventListener("click", () => {
    if (state.pagina > 1) {
      state.pagina -= 1;
      render();
      document.getElementById("resultados").scrollIntoView({ behavior: "smooth" });
    }
  });

  document.getElementById("pag-proxima").addEventListener("click", () => {
    if (state.pagina < paginas) {
      state.pagina += 1;
      render();
      document.getElementById("resultados").scrollIntoView({ behavior: "smooth" });
    }
  });
}

function abrirDetalhes(id, postoAtendimento = "") {
  const base = buscarVagaPorId(id);
  if (!base) return;

  DetalhesVaga.abrir({
    ...base,
    posto_atendimento: String(postoAtendimento || base.posto_atendimento || "").trim(),
  });
}

function fecharModal() {
  DetalhesVaga.fechar();
}

function limparBusca() {
  state.filtros = {
    cargo: "",
    unidade: "",
    municipio: "",
    dataPeriodo: "mais-recente",
    pcd: false,
  };
  els.cargo.value = "";
  els.unidade.value = "";
  els.municipio.value = "";
  els.data.value = "mais-recente";
  els.pcd.checked = false;
  aplicarFiltros();
  renderPopulares();
  els.cargo.focus();
}

function bindEvents() {
  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    state.filtros.cargo = els.cargo.value.trim();
    state.filtros.unidade = els.unidade.value;
    state.filtros.municipio = els.municipio.value;
    state.filtros.dataPeriodo = els.data.value;
    state.filtros.pcd = els.pcd.checked;
    aplicarFiltros();
    document.getElementById("resultados").scrollIntoView({ behavior: "smooth" });
  });

  [
    { select: els.unidade, tipo: "unidades" },
    { select: els.municipio, tipo: "cidades" },
  ].forEach(({ select, tipo }) => {
    select.addEventListener("change", () => {
      state.filtros.cargo = els.cargo.value.trim();
      state.filtros.unidade = els.unidade.value;
      state.filtros.municipio = els.municipio.value;
      state.filtros.dataPeriodo = els.data.value;
      state.filtros.pcd = els.pcd.checked;
      aplicarFiltros();
      ativarAbaPopular(tipo);
    });
  });

  els.data.addEventListener("change", () => {
    state.filtros.cargo = els.cargo.value.trim();
    state.filtros.unidade = els.unidade.value;
    state.filtros.municipio = els.municipio.value;
    state.filtros.dataPeriodo = els.data.value;
    state.filtros.pcd = els.pcd.checked;
    aplicarFiltros();
    renderPopulares();
  });

  els.pcd.addEventListener("change", () => {
    state.filtros.cargo = els.cargo.value.trim();
    state.filtros.unidade = els.unidade.value;
    state.filtros.municipio = els.municipio.value;
    state.filtros.dataPeriodo = els.data.value;
    state.filtros.pcd = els.pcd.checked;
    aplicarFiltros();
    renderPopulares();
  });

  els.popularTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      ativarAbaPopular(tab.dataset.popularTab || "vagas");
    });
  });

  els.limpar.addEventListener("click", limparBusca);
  document.querySelector(".modal__close").addEventListener("click", fecharModal);
  document.querySelector(".modal__backdrop").addEventListener("click", fecharModal);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") fecharModal();
  });
}

function escapeHtml(valor) {
  const div = document.createElement("div");
  div.textContent = String(valor ?? "");
  return div.innerHTML;
}

function escapeAttr(valor) {
  return String(valor ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

async function init() {
  cacheEls();
  DetalhesVaga.init();
  bindEvents();

  try {
    await carregarVagas();
    popularFiltrosSuspensos();
    renderPopulares();
    aplicarFiltros();
  } catch (error) {
    console.error(error);
    els.status.textContent =
      "Não foi possível carregar as vagas. Tente novamente mais tarde.";
    els.lista.innerHTML = "";
  }
}

document.addEventListener("DOMContentLoaded", init);
