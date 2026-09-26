const state = {
  vagas: [],
  filtradas: [],
  popularesTipo: "vagas",
  popularesPagina: 1,
  popularesPorPagina: 12,
  pagina: 1,
  porPagina: 12,
  viewMode: "cards",
  filtros: {
    cargo: "",
    unidade: "",
    municipio: "",
    escolaridade: "",
    tipoContratacao: "",
    experiencia: "",
    dataPeriodo: "mais-recente",
    inclusiva: false,
    exclusiva: false,
  },
  dataMaisRecente: null,
  assinaturaVagas: "",
  atualizandoVagas: false,
};

const els = {};

function cacheEls() {
  els.form = document.getElementById("busca-form");
  els.cargo = document.getElementById("busca-cargo");
  els.unidade = document.getElementById("filtro-unidade");
  els.municipio = document.getElementById("filtro-municipio");
  els.escolaridade = document.getElementById("filtro-escolaridade");
  els.contratacao = document.getElementById("filtro-contratacao");
  els.experiencia = document.getElementById("filtro-experiencia");
  els.data = document.getElementById("filtro-data");
  els.inclusiva = document.getElementById("filtro-inclusiva");
  els.exclusiva = document.getElementById("filtro-exclusiva");
  els.status = document.getElementById("status-text");
  els.lista = document.getElementById("lista-vagas");
  els.paginacao = document.getElementById("paginacao");
  els.limpar = document.getElementById("btn-limpar");
  els.limparFiltros = document.getElementById("btn-limpar-filtros");
  els.atualizarVagas = document.getElementById("btn-atualizar-vagas");
  els.statusRefresh = document.getElementById("status-refresh");
  els.modal = document.getElementById("modal-vaga");
  els.modalBody = document.getElementById("modal-body");
  els.popularList = document.getElementById("popular-list");
  els.popularPager = document.getElementById("popular-paginacao");
  els.popularTabs = document.querySelectorAll("[data-popular-tab]");
  els.kpiTotal = document.getElementById("kpi-vagas-total");
  els.kpiRegulares = document.getElementById("kpi-vagas-regulares");
  els.kpiInclusiva = document.getElementById("kpi-vagas-inclusiva");
  els.kpiExclusiva = document.getElementById("kpi-vagas-exclusiva");
  els.ultimaAtualizacao = document.getElementById("ultima-atualizacao");
  els.viewButtons = document.querySelectorAll("[data-view]");
  els.compartilhar = document.getElementById("btn-compartilhar");
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
  const s = String(valor || "").trim();
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) {
    const data = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    data.setHours(0, 0, 0, 0);
    return Number.isNaN(data.getTime()) ? null : data;
  }

  const partes = s.split(/[/-]/);
  if (partes.length !== 3) return null;
  const [dia, mes, ano] = partes.map(Number);
  if (!dia || !mes || !ano) return null;
  const data = new Date(ano, mes - 1, dia);
  data.setHours(0, 0, 0, 0);
  return Number.isNaN(data.getTime()) ? null : data;
}

function dataExibicao(valor) {
  return formatarDataBR(parseDataBR(valor)) || String(valor || "").trim();
}

function diffDias(a, b) {
  const msDia = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / msDia);
}

function calcularDataMaisRecente() {
  const datas = state.vagas.map((vaga) => parseDataBR(dataFiltro(vaga))).filter(Boolean);
  if (datas.length === 0) return null;
  return datas.reduce((maior, data) => (data > maior ? data : maior), datas[0]);
}

function dataFiltro(vaga) {
  return String(vaga.data_disponibilidade || vaga.data || "").trim();
}

function formatarDataBR(data) {
  if (!data) return "";
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  return `${dia}/${mes}/${data.getFullYear()}`;
}

function categoriaPcd(vaga) {
  return DetalhesVaga.categoriaPcd(vaga);
}

function rotuloPcd(vaga) {
  return DetalhesVaga.rotuloPcd(vaga);
}

function passaFiltroPcd(vaga) {
  const tipos = [];
  if (state.filtros.inclusiva) tipos.push("inclusiva");
  if (state.filtros.exclusiva) tipos.push("exclusiva");
  if (!tipos.length) return true;
  return tipos.includes(categoriaPcd(vaga));
}

function textoCampo(vaga, campo) {
  return String((vaga && vaga[campo]) || "").trim();
}

function municipioDaVaga(vaga) {
  return textoCampo(vaga, "municipio_trabalho");
}

function passaFiltroLista(vaga, filtro, campo) {
  if (!filtro) return true;
  return normalizar(textoCampo(vaga, campo)) === normalizar(filtro);
}

function lerFiltrosPcd() {
  state.filtros.inclusiva = Boolean(els.inclusiva?.checked);
  state.filtros.exclusiva = Boolean(els.exclusiva?.checked);
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

function assinaturaBase(data) {
  const vagas = Array.isArray(data?.vagas) ? data.vagas : [];
  const itens = vagas
    .map((vaga) =>
      [
        vaga.id,
        vaga.identificacao_vagas,
        qtde(vaga),
        vaga.ocupacao,
        vaga.municipio_trabalho,
        vaga.unidade,
        vaga.data_disponibilidade || vaga.data,
        vaga.edicao_postagem,
      ].join("|")
    )
    .sort()
    .join(";");
  return [
    String(data?.ultima_atualizacao || ""),
    String(data?.edicao_postagem || ""),
    vagas.length,
    itens,
  ].join("::");
}

function mostrarFeedbackRefresh(texto, atualizando = false) {
  if (!els.statusRefresh) return;
  els.statusRefresh.textContent = texto;
  els.statusRefresh.classList.toggle("is-updating", Boolean(atualizando && texto));
}

function selecionarSeExistir(select, valor) {
  if (!select) return;
  const alvo = normalizar(valor);
  const match = [...select.options].find((opt) => opt.value && normalizar(opt.value) === alvo);
  select.value = match ? match.value : "";
}

function aplicarValoresFiltroNosCampos() {
  if (els.cargo) els.cargo.value = state.filtros.cargo || "";
  selecionarSeExistir(els.unidade, state.filtros.unidade);
  selecionarSeExistir(els.municipio, state.filtros.municipio);
  selecionarSeExistir(els.escolaridade, state.filtros.escolaridade);
  selecionarSeExistir(els.contratacao, state.filtros.tipoContratacao);
  selecionarSeExistir(els.experiencia, state.filtros.experiencia);
  if (els.inclusiva) els.inclusiva.checked = Boolean(state.filtros.inclusiva);
  if (els.exclusiva) els.exclusiva.checked = Boolean(state.filtros.exclusiva);
  state.filtros.unidade = els.unidade?.value || "";
  state.filtros.municipio = els.municipio?.value || "";
  state.filtros.escolaridade = els.escolaridade?.value || "";
  state.filtros.tipoContratacao = els.contratacao?.value || "";
  state.filtros.experiencia = els.experiencia?.value || "";
}

async function carregarVagas() {
  const res = await fetch("/api/vagas", { cache: "no-store" });
  if (!res.ok) throw new Error("Não foi possível carregar as vagas.");
  const data = await res.json();
  const assinatura = assinaturaBase(data);
  const mudou = assinatura !== state.assinaturaVagas;
  state.assinaturaVagas = assinatura;
  state.vagas = Array.isArray(data.vagas) ? data.vagas : [];
  state.dataMaisRecente = calcularDataMaisRecente();
  atualizarCampoDataTravada();
  atualizarUltimaAtualizacao();
  return mudou;
}

async function atualizarVagas() {
  if (state.atualizandoVagas) return;
  state.filtros.cargo = els.cargo?.value.trim() || "";
  state.filtros.unidade = els.unidade?.value || "";
  state.filtros.municipio = els.municipio?.value || "";
  state.filtros.escolaridade = els.escolaridade?.value || "";
  state.filtros.tipoContratacao = els.contratacao?.value || "";
  state.filtros.experiencia = els.experiencia?.value || "";
  state.filtros.dataPeriodo = "mais-recente";
  lerFiltrosPcd();
  state.atualizandoVagas = true;
  if (els.atualizarVagas) els.atualizarVagas.disabled = true;
  mostrarFeedbackRefresh("Atualizando...", true);
  try {
    const mudou = await carregarVagas();
    popularFiltrosSuspensos();
    aplicarValoresFiltroNosCampos();
    if (mudou) {
      aplicarFiltros();
    } else {
      aplicarFiltros({ resetarPagina: false, limparFeedback: false });
      mostrarFeedbackRefresh("Já está na versão mais recente.");
    }
  } catch (error) {
    console.error(error);
    mostrarFeedbackRefresh("Não foi possível atualizar as vagas. Tente novamente.");
  } finally {
    state.atualizandoVagas = false;
    if (els.atualizarVagas) els.atualizarVagas.disabled = false;
  }
}

function atualizarCampoDataTravada() {
  if (!els.data) return;
  const data = formatarDataBR(state.dataMaisRecente);
  els.data.value = data || "Data mais recente";
}

function atualizarUltimaAtualizacao() {
  if (!els.ultimaAtualizacao) return;
  const data = formatarDataBR(state.dataMaisRecente);
  els.ultimaAtualizacao.textContent = data
    ? `Dados extraídos via Portal MTb em ${data}`
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
  preencherSelect(els.municipio, unicoOrdenado("municipio_trabalho"), "Todos");
  if (els.escolaridade) {
    preencherSelect(els.escolaridade, unicoOrdenado("escolaridade"), "Todas");
  }
  if (els.contratacao) {
    preencherSelect(els.contratacao, unicoOrdenado("tipo_contratacao"), "Todos");
  }
  if (els.experiencia) {
    preencherSelect(els.experiencia, unicoOrdenado("experiencia"), "Experiência");
  }

  const datalist = document.getElementById("lista-ocupacoes");
  if (datalist) {
    datalist.innerHTML = unicoOrdenado("ocupacao")
      .map((v) => `<option value="${escapeAttr(v)}">`)
      .join("");
  }
}

function aplicarFiltrosDaURL() {
  const params = new URLSearchParams(window.location.search);
  const termo = String(params.get("q") || params.get("cargo") || "").trim();
  if (termo && els.cargo) {
    els.cargo.value = termo;
    state.filtros.cargo = termo;
    state.filtros.dataPeriodo = "mais-recente";
  }

  const municipioParam = String(params.get("municipio") || "").trim();
  if (municipioParam && els.municipio) {
    const match = [...els.municipio.options].find(
      (opt) => opt.value && normalizar(opt.value) === normalizar(municipioParam)
    );
    if (match) {
      els.municipio.value = match.value;
      state.filtros.municipio = match.value;
    }
  }

  const view = String(params.get("view") || "").toLowerCase();
  if (view === "tabela" || view === "table") {
    state.viewMode = "table";
    atualizarBotoesVisualizacao();
  }
}

function aplicarFiltros(opcoes = {}) {
  const { cargo, unidade, municipio, escolaridade, tipoContratacao, experiencia, dataPeriodo } = state.filtros;
  const resetarPagina = opcoes.resetarPagina !== false;

  state.filtradas = state.vagas.filter((vaga) => {
    if (cargo && !contem(vaga.ocupacao, cargo)) return false;
    if (unidade && normalizar(vaga.unidade) !== normalizar(unidade)) return false;
    if (municipio && normalizar(municipioDaVaga(vaga)) !== normalizar(municipio)) return false;
    if (!passaFiltroLista(vaga, escolaridade, "escolaridade")) return false;
    if (!passaFiltroLista(vaga, tipoContratacao, "tipo_contratacao")) return false;
    if (!passaFiltroLista(vaga, experiencia, "experiencia")) return false;
    if (!dataDentroPeriodo(dataFiltro(vaga), dataPeriodo)) return false;
    if (!passaFiltroPcd(vaga)) return false;
    return true;
  });

  if (resetarPagina) {
    state.pagina = 1;
    state.popularesPagina = 1;
  }
  if (opcoes.limparFeedback !== false) {
    mostrarFeedbackRefresh("");
  }
  render();
  renderPopulares();
}

function totalVagasQuantidades() {
  return state.filtradas.reduce((acc, vaga) => acc + qtde(vaga), 0);
}

function totalOcupacoesUnicas() {
  const ocupacoes = new Set();
  state.filtradas.forEach((vaga) => {
    const nome = String(vaga.ocupacao || "").trim();
    if (nome) ocupacoes.add(normalizar(nome));
  });
  return ocupacoes.size;
}

function calcularKPIs() {
  let regulares = 0;
  let inclusiva = 0;
  let exclusiva = 0;

  state.filtradas.forEach((vaga) => {
    const q = qtde(vaga);
    const categoria = categoriaPcd(vaga);
    if (categoria === "exclusiva") exclusiva += q;
    else if (categoria === "inclusiva") inclusiva += q;
    else regulares += q;
  });

  return { regulares, inclusiva, exclusiva };
}

function atualizarKPIs() {
  const { regulares, inclusiva, exclusiva } = calcularKPIs();
  if (els.kpiTotal) els.kpiTotal.textContent = String(regulares + inclusiva + exclusiva);
  if (els.kpiRegulares) els.kpiRegulares.textContent = String(regulares);
  if (els.kpiInclusiva) els.kpiInclusiva.textContent = String(inclusiva);
  if (els.kpiExclusiva) els.kpiExclusiva.textContent = String(exclusiva);
}

function atualizarStatus() {
  const totalOfertas = state.filtradas.length;
  const totalQtd = totalVagasQuantidades();
  const totalOcupacoes = totalOcupacoesUnicas();
  const temBusca =
    state.filtros.cargo ||
    state.filtros.unidade ||
    state.filtros.municipio ||
    state.filtros.escolaridade ||
    state.filtros.tipoContratacao ||
    state.filtros.experiencia ||
    state.filtros.inclusiva ||
    state.filtros.exclusiva;

  els.status.textContent =
    totalOfertas === 0
      ? "Nenhuma vaga encontrada. Tente outra palavra, unidade ou município."
      : `${totalQtd} vaga(s) encontrada(s) em ${totalOcupacoes} ocupações.`;

  els.limpar.classList.toggle("hidden", !temBusca);
}

function render() {
  atualizarStatus();
  atualizarKPIs();
  atualizarBotaoCompartilhar();
  renderLista();
  renderPaginacao();
}

function atualizarBotaoCompartilhar() {
  if (!els.compartilhar) return;
  const municipio = String(els.municipio.value || state.filtros.municipio || "").trim();
  const habilitado = Boolean(municipio);
  els.compartilhar.disabled = !habilitado;
  els.compartilhar.title = habilitado
    ? `Compartilhar as vagas de ${municipio}`
    : "Selecione um município para compartilhar as vagas";
}

function vagasDoMunicipioParaCompartilhar(municipio) {
  const alvo = normalizar(municipio);
  return state.vagas
    .filter((vaga) => {
      if (normalizar(municipioDaVaga(vaga)) !== alvo) return false;
      if (!passaFiltroLista(vaga, state.filtros.escolaridade, "escolaridade")) return false;
      if (!passaFiltroLista(vaga, state.filtros.tipoContratacao, "tipo_contratacao")) return false;
      if (!passaFiltroLista(vaga, state.filtros.experiencia, "experiencia")) return false;
      if (!dataDentroPeriodo(dataFiltro(vaga), state.filtros.dataPeriodo)) return false;
      if (!passaFiltroPcd(vaga)) return false;
      return true;
    })
    .sort(
      (a, b) =>
        String(a.ocupacao || "").localeCompare(String(b.ocupacao || ""), "pt-BR") ||
        String(a.unidade || "").localeCompare(String(b.unidade || ""), "pt-BR")
    );
}

async function compartilharVagasMunicipio() {
  const municipio = String(els.municipio.value || state.filtros.municipio || "").trim();
  if (!municipio) {
    alert("Selecione um município para compartilhar as vagas.");
    els.municipio.focus();
    return;
  }

  await SalvarVagas.compartilhar({
    municipio,
    vagas: vagasDoMunicipioParaCompartilhar(municipio),
    formato: state.viewMode,
  });
}

function textoRankingVaga(vaga) {
  return String(vaga.ocupacao || "").trim();
}

function textoRankingPorTipo(vaga, tipo) {
  if (tipo === "cidades") return municipioDaVaga(vaga);
  if (tipo === "unidades") return String(vaga.unidade || "").trim();
  return textoRankingVaga(vaga);
}

function obterRanking(tipo) {
  const mapa = new Map();

  state.filtradas.forEach((vaga) => {
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

  return [...mapa.values()].sort(
    (a, b) => b.total - a.total || b.ofertas - a.ofertas || a.texto.localeCompare(b.texto, "pt-BR")
  );
}

function valorPopularSelecionado(tipo) {
  if (tipo === "cidades") return els.municipio.value;
  if (tipo === "unidades") return els.unidade.value;
  return els.cargo.value.trim();
}

function atualizarTemaPopular() {
  const card = document.querySelector(".popular-card");
  if (!card) return;
  card.classList.remove("popular-theme--vagas", "popular-theme--cidades", "popular-theme--unidades");
  const tema = ["vagas", "cidades", "unidades"].includes(state.popularesTipo)
    ? state.popularesTipo
    : "vagas";
  card.classList.add(`popular-theme--${tema}`);
}

function ativarAbaPopular(tipo) {
  state.popularesTipo = tipo;
  state.popularesPagina = 1;
  atualizarTemaPopular();
  els.popularTabs.forEach((item) => {
    const active = item.dataset.popularTab === tipo;
    item.classList.toggle("active", active);
    item.setAttribute("aria-selected", active ? "true" : "false");
  });
  renderPopulares();
}

function renderPopulares() {
  if (!els.popularList) return;
  atualizarTemaPopular();
  const selecionado = valorPopularSelecionado(state.popularesTipo);
  const ranking = obterRanking(state.popularesTipo);

  if (
    selecionado &&
    !ranking.some((item) => normalizar(item.texto) === normalizar(selecionado))
  ) {
    ranking.unshift({ texto: selecionado, ofertas: 0, total: 0 });
  }

  if (ranking.length === 0) {
    els.popularList.innerHTML = "<span>Nenhuma vaga encontrada neste recorte.</span>";
    if (els.popularPager) {
      els.popularPager.classList.add("hidden");
      els.popularPager.innerHTML = "";
    }
    return;
  }

  const porPagina = state.popularesPorPagina;
  const paginas = Math.max(1, Math.ceil(ranking.length / porPagina));
  if (state.popularesPagina > paginas) state.popularesPagina = paginas;
  if (state.popularesPagina < 1) state.popularesPagina = 1;
  const inicio = (state.popularesPagina - 1) * porPagina;
  const pagina = ranking.slice(inicio, inicio + porPagina);

  els.popularList.innerHTML = pagina
    .map((item) => {
      const active = selecionado && normalizar(item.texto) === normalizar(selecionado);
      const total = Number(item.total) || 0;
      return `
        <button type="button" class="popular-item ${active ? "active" : ""}" data-popular-value="${escapeAttr(item.texto)}" title="${escapeAttr(`${total} vaga(s) — ${item.texto}`)}" aria-pressed="${active ? "true" : "false"}">
          <span class="popular-item__tag">${total}</span>
          <span class="popular-item__name">${escapeHtml(item.texto)}</span>
        </button>
      `;
    })
    .join("");

  els.popularList.querySelectorAll("[data-popular-value]").forEach((btn) => {
    btn.addEventListener("click", () => aplicarBuscaPopular(btn.dataset.popularValue || ""));
  });

  if (!els.popularPager) return;
  if (paginas <= 1) {
    els.popularPager.classList.add("hidden");
    els.popularPager.innerHTML = "";
    return;
  }

  els.popularPager.classList.remove("hidden");
  els.popularPager.innerHTML = `
    <button type="button" id="popular-pag-anterior" ${state.popularesPagina <= 1 ? "disabled" : ""} aria-label="Página anterior">Recuar</button>
    <button type="button" id="popular-pag-proxima" ${state.popularesPagina >= paginas ? "disabled" : ""} aria-label="Próxima página">Avançar</button>
  `;
  document.getElementById("popular-pag-anterior")?.addEventListener("click", () => {
    if (state.popularesPagina > 1) {
      state.popularesPagina -= 1;
      renderPopulares();
    }
  });
  document.getElementById("popular-pag-proxima")?.addEventListener("click", () => {
    if (state.popularesPagina < paginas) {
      state.popularesPagina += 1;
      renderPopulares();
    }
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
  state.filtros.escolaridade = els.escolaridade?.value || "";
  state.filtros.tipoContratacao = els.contratacao?.value || "";
  state.filtros.experiencia = els.experiencia?.value || "";
  state.filtros.dataPeriodo = "mais-recente";
  lerFiltrosPcd();
  aplicarFiltros();
  document.getElementById("resultados").scrollIntoView({ behavior: "smooth" });
}

function renderLista() {
  atualizarBotoesVisualizacao();

  if (state.filtradas.length === 0) {
    els.lista.className = "cards";
    els.lista.setAttribute("aria-label", "Lista de vagas");
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

  if (state.viewMode === "table") {
    els.lista.className = "vagas-table-wrap";
    els.lista.setAttribute("aria-label", "Tabela de vagas");
    els.lista.innerHTML = `
      <div class="vagas-table-scroll">
        <table class="vagas-table">
          <thead>
            <tr>
              <th scope="col">Ocupação</th>
              <th scope="col">Qtde</th>
              <th scope="col">Cidade</th>
              <th scope="col">Unidade</th>
              <th scope="col">Escolaridade</th>
              <th scope="col">Contratação</th>
              <th scope="col">Experiência</th>
              <th scope="col">Município do trabalho</th>
              <th scope="col">Publicada</th>
              <th scope="col">PCD</th>
              <th scope="col">Ações</th>
            </tr>
          </thead>
          <tbody>
            ${pagina.map(renderLinhaTabela).join("")}
          </tbody>
        </table>
      </div>
    `;
  } else {
    els.lista.className = "cards";
    els.lista.setAttribute("aria-label", "Lista de vagas");
    els.lista.innerHTML = pagina.map(renderCard).join("");
  }

  els.lista.querySelectorAll("[data-open-vaga]").forEach((btn) => {
    btn.addEventListener("click", () =>
      abrirDetalhes(btn.dataset.openVaga, btn.dataset.postoAtendimento || "")
    );
  });
  DetalhesVaga.ligarAgendamento(els.lista);
}

function atualizarBotoesVisualizacao() {
  els.viewButtons.forEach((btn) => {
    const ativo = btn.dataset.view === state.viewMode;
    btn.classList.toggle("is-active", ativo);
    btn.setAttribute("aria-pressed", ativo ? "true" : "false");
  });
}

function definirVisualizacao(modo) {
  if (modo !== "cards" && modo !== "table") return;
  if (state.viewMode === modo) return;
  state.viewMode = modo;
  renderLista();
}

function renderCard(vaga) {
  const categoria = categoriaPcd(vaga);
  const pcd =
    categoria === "exclusiva"
      ? '<span class="tag tag-pcd">Exclusiva PCD</span>'
      : categoria === "inclusiva"
        ? '<span class="tag tag-inclusiva">Inclusiva</span>'
        : "";
  const mapaHref = `mapa.html?vaga=${encodeURIComponent(vaga.id)}`;

  return `
    <article class="vaga-card">
      <div class="vaga-card__top">
        <div>
          <h3 class="vaga-title">${escapeHtml(vaga.ocupacao || "Vaga sem nome")}</h3>
          <div class="vaga-info">
            <span><strong>Unidade:</strong> ${escapeHtml(vaga.unidade || "Não informado")}</span>
            <span><strong>Escolaridade:</strong> ${escapeHtml(textoCampo(vaga, "escolaridade") || "Não informado")}</span>
            <span><strong>Contratação:</strong> ${escapeHtml(textoCampo(vaga, "tipo_contratacao") || "Não informado")}</span>
            <span><strong>Experiência:</strong> ${escapeHtml(textoCampo(vaga, "experiencia") || "Não informado")}</span>
            <span><strong>Município do trabalho:</strong> ${escapeHtml(textoCampo(vaga, "municipio_trabalho") || "Não informado")}</span>
          </div>
        </div>
        <span class="vaga-qty">${qtde(vaga)} vaga(s)</span>
      </div>
      <div class="tag-row">
        ${pcd}
        ${vaga.data_disponibilidade ? `<span class="tag">Publicada em ${escapeHtml(dataExibicao(vaga.data_disponibilidade))}</span>` : ""}
      </div>
      <div class="vaga-actions">
        <button type="button" class="btn btn-primary" data-open-vaga="${vaga.id}" data-posto-atendimento="${escapeAttr(vaga.posto_atendimento || "")}">Ver detalhes</button>
        <a class="btn btn-map" href="${escapeAttr(mapaHref)}">Ver no mapa</a>
        ${DetalhesVaga.htmlAgendamento(vaga)}
      </div>
    </article>
  `;
}

function renderLinhaTabela(vaga) {
  const mapaHref = `mapa.html?vaga=${encodeURIComponent(vaga.id)}`;
  const categoria = categoriaPcd(vaga);
  const rotulo = rotuloPcd(vaga);

  return `
    <tr>
      <td data-label="Ocupação">
        <button type="button" class="vagas-table-link" data-open-vaga="${vaga.id}" data-posto-atendimento="${escapeAttr(vaga.posto_atendimento || "")}" title="Ver detalhes da vaga">
          ${escapeHtml(vaga.ocupacao || "Vaga sem nome")}
        </button>
      </td>
      <td data-label="Qtde">${qtde(vaga)}</td>
      <td data-label="Cidade">${escapeHtml(vaga.municipio || "Não informado")}</td>
      <td data-label="Unidade">${escapeHtml(vaga.unidade || "Não informado")}</td>
      <td data-label="Escolaridade">${escapeHtml(textoCampo(vaga, "escolaridade") || "Não informado")}</td>
      <td data-label="Contratação">${escapeHtml(textoCampo(vaga, "tipo_contratacao") || "Não informado")}</td>
      <td data-label="Experiência">${escapeHtml(textoCampo(vaga, "experiencia") || "Não informado")}</td>
      <td data-label="Município do trabalho">${escapeHtml(textoCampo(vaga, "municipio_trabalho") || "Não informado")}</td>
      <td data-label="Publicada">${escapeHtml(dataExibicao(vaga.data_disponibilidade) || "—")}</td>
      <td data-label="PCD"><span class="vagas-pcd ${categoria !== "regular" ? "is-pcd" : ""}">${escapeHtml(rotulo)}</span></td>
      <td data-label="Ações">
        <div class="vagas-table-actions">
          <button type="button" class="btn btn-primary btn-sm" data-open-vaga="${vaga.id}" data-posto-atendimento="${escapeAttr(vaga.posto_atendimento || "")}">Ver detalhes</button>
          <a class="btn btn-map btn-sm" href="${escapeAttr(mapaHref)}">Ver no mapa</a>
          ${DetalhesVaga.htmlAgendamento(vaga, true)}
        </div>
      </td>
    </tr>
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
    escolaridade: "",
    tipoContratacao: "",
    experiencia: "",
    dataPeriodo: "mais-recente",
    inclusiva: false,
    exclusiva: false,
  };
  els.cargo.value = "";
  els.unidade.value = "";
  els.municipio.value = "";
  if (els.escolaridade) els.escolaridade.value = "";
  if (els.contratacao) els.contratacao.value = "";
  if (els.experiencia) els.experiencia.value = "";
  atualizarCampoDataTravada();
  if (els.inclusiva) els.inclusiva.checked = false;
  if (els.exclusiva) els.exclusiva.checked = false;
  aplicarFiltros();
  els.cargo.focus();
}

function ligarDicasKpi() {
  const botoes = [...document.querySelectorAll(".kpi-info")];
  if (!botoes.length) return;

  const fecharTodas = () => {
    document.querySelectorAll(".kpi-dica").forEach((el) => el.classList.add("hidden"));
    botoes.forEach((btn) => btn.setAttribute("aria-expanded", "false"));
  };

  botoes.forEach((btn) => {
    btn.addEventListener("click", (event) => {
      event.stopPropagation();
      const dica = document.getElementById(btn.getAttribute("aria-controls"));
      const jaAberta = dica && !dica.classList.contains("hidden");
      fecharTodas();
      if (!jaAberta && dica) {
        dica.classList.remove("hidden");
        btn.setAttribute("aria-expanded", "true");
      }
    });
  });

  document.addEventListener("click", fecharTodas);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") fecharTodas();
  });
}

function bindEvents() {
  const aplicarFiltrosDaTela = () => {
    state.filtros.cargo = els.cargo.value.trim();
    state.filtros.unidade = els.unidade.value;
    state.filtros.municipio = els.municipio.value;
    state.filtros.escolaridade = els.escolaridade?.value || "";
    state.filtros.tipoContratacao = els.contratacao?.value || "";
    state.filtros.experiencia = els.experiencia?.value || "";
    state.filtros.dataPeriodo = "mais-recente";
    lerFiltrosPcd();
    aplicarFiltros();
  };

  els.form.addEventListener("submit", (event) => {
    event.preventDefault();
    aplicarFiltrosDaTela();
    document.getElementById("resultados").scrollIntoView({ behavior: "smooth" });
  });

  document.querySelector(".site-search")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = event.currentTarget.querySelector("input[type='search']");
    const termo = String(input?.value || "").trim();
    if (els.cargo) els.cargo.value = termo;
    state.filtros.cargo = termo;
    state.filtros.dataPeriodo = "mais-recente";
    aplicarFiltros();
    document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth" });
  });

  [
    { select: els.unidade, tipo: "unidades" },
    { select: els.municipio, tipo: "cidades" },
  ].forEach(({ select, tipo }) => {
    select.addEventListener("change", () => {
      aplicarFiltrosDaTela();
      ativarAbaPopular(tipo);
    });
  });

  [els.escolaridade, els.contratacao, els.experiencia].forEach((select) => {
    select?.addEventListener("change", aplicarFiltrosDaTela);
  });

  [els.inclusiva, els.exclusiva].forEach((el) => {
    el?.addEventListener("change", aplicarFiltrosDaTela);
  });

  els.popularTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      ativarAbaPopular(tab.dataset.popularTab || "vagas");
    });
  });

  els.viewButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      definirVisualizacao(btn.dataset.view || "cards");
    });
  });

  els.compartilhar?.addEventListener("click", compartilharVagasMunicipio);
  els.atualizarVagas?.addEventListener("click", () => {
    els.atualizarVagas.classList.remove("is-clicking");
    void els.atualizarVagas.offsetWidth;
    els.atualizarVagas.classList.add("is-clicking");
    atualizarVagas();
  });
  els.atualizarVagas?.addEventListener("animationend", () => {
    els.atualizarVagas.classList.remove("is-clicking");
  });

  ligarDicasKpi();
  [els.limpar, els.limparFiltros].forEach((btn) => {
    btn?.addEventListener("click", limparBusca);
  });
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
    aplicarFiltrosDaURL();
    aplicarFiltros();
    if (state.filtros.cargo) {
      document.getElementById("resultados")?.scrollIntoView();
    }
  } catch (error) {
    console.error(error);
    els.status.textContent =
      "Não foi possível carregar as vagas. Tente novamente mais tarde.";
    els.lista.innerHTML = "";
  }
}

document.addEventListener("DOMContentLoaded", init);
