const CE_ESTADO_BOUNDS = [
  [-41.75, -8.12],
  [-36.88, -2.68],
];

const CE_REGIOES_SOURCE = "source-ce-regioes";
const CE_REGIOES_FILL = "layer-ce-regioes-fill";
const CE_REGIOES_LINE = "layer-ce-regioes-line";
const UNIDADES_SOURCE = "source-unidades";
const UNIDADES_LAYER = "layer-unidades";
const PINO_UNIDADE_URL = "https://i.ibb.co/N6jfVtjN/pino-unidade.png";
const PINO_UNIDADE_IMAGE_ID = "pino-unidade-idt";
const SAA_URL = "https://idt.org.br/saa4/login";

const MAP_STYLE = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: [
        "https://a.tile.openstreetmap.org/{z}/{x}/{y}.png",
        "https://b.tile.openstreetmap.org/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    },
  },
  layers: [
    {
      id: "osm",
      type: "raster",
      source: "osm",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

let map = null;
let vagasGeojson = null;
let unidadesGeojson = null;
let popup = null;
let dataMaisRecente = null;
const filtros = {
  unidade: "",
  municipio: "",
  dataPeriodo: "mais-recente",
};
const TABELA_POR_PAGINA = 12;
let tabelaPagina = 1;
let vagasTabelaAtual = [];

function qs(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function setStatus(texto) {
  const el = document.getElementById("map-status");
  if (el) el.textContent = texto;
}

function normalizar(txt) {
  return String(txt || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function municipioDaFeature(props) {
  const keys = ["Municipio", "MUNICIPIO", "municipio", "NM_MUN", "NOME"];
  for (const key of keys) {
    if (props && props[key]) return String(props[key]).trim();
  }
  return "";
}

function qtdeFeature(feature) {
  return Number((feature.properties && feature.properties.qtde_vagas) || 1) || 1;
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
  const features = vagasGeojson && vagasGeojson.features ? vagasGeojson.features : [];
  const datas = features
    .map((feature) => parseDataBR((feature.properties || {}).data))
    .filter(Boolean);
  if (datas.length === 0) return null;
  return datas.reduce((maior, data) => (data > maior ? data : maior), datas[0]);
}

function dataDentroPeriodo(dataTexto, periodo) {
  if (!periodo || periodo === "qualquer") return true;
  const data = parseDataBR(dataTexto);
  if (!data || !dataMaisRecente) return false;
  const diferenca = diffDias(dataMaisRecente, data);
  if (diferenca < 0) return false;
  if (periodo === "mais-recente" || periodo === "hoje") return diferenca === 0;
  const dias = Number(periodo);
  return Number.isFinite(dias) ? diferenca < dias : true;
}

function vagasFiltradas() {
  const features = vagasGeojson && vagasGeojson.features ? vagasGeojson.features : [];
  return features.filter((feature) => {
    const props = feature.properties || {};
    if (filtros.unidade && normalizar(props.unidade) !== normalizar(filtros.unidade)) {
      return false;
    }
    if (
      filtros.municipio &&
      normalizar(props.municipio) !== normalizar(filtros.municipio)
    ) {
      return false;
    }
    if (!dataDentroPeriodo(props.data, filtros.dataPeriodo)) return false;
    return true;
  });
}

function fitCeara() {
  if (!map) return;
  map.fitBounds(CE_ESTADO_BOUNDS, {
    padding: { top: 18, right: 18, bottom: 34, left: 18 },
    maxZoom: 6,
    duration: 650,
  });
}

function createCearaExtentControl() {
  return {
    onAdd() {
      this._container = document.createElement("div");
      this._container.className =
        "maplibregl-ctrl maplibregl-ctrl-group map-reset-view-control";
      const btn = document.createElement("button");
      btn.className = "maplibregl-ctrl-icon";
      btn.type = "button";
      btn.title = "Ver o estado do Ceará inteiro";
      btn.setAttribute("aria-label", "Enquadrar o mapa no estado do Ceará");
      btn.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>';
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        fitCeara();
      });
      this._container.appendChild(btn);
      return this._container;
    },
    onRemove() {
      if (this._container && this._container.parentNode) {
        this._container.parentNode.removeChild(this._container);
      }
    },
  };
}

function buildRegiaoFillColorExpr(paleta) {
  const def = "#dff5ea";
  if (!paleta || !paleta.regioes || !paleta.cores) return def;
  const coalesce = [
    "coalesce",
    ["get", "Região"],
    ["get", "Regiao"],
    ["get", "REGIÃO"],
    ["get", "regiao"],
    ["get", "REGIAO"],
    "",
  ];
  const expr = ["match", coalesce];
  for (const regiao of paleta.regioes) {
    expr.push(regiao, paleta.cores[regiao] || def);
  }
  expr.push(def);
  return expr;
}

async function carregarJson(url, fallback) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${url}: ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn(error);
    return fallback;
  }
}

function valoresUnicosDasVagas(campo) {
  const features = vagasGeojson && vagasGeojson.features ? vagasGeojson.features : [];
  return [
    ...new Set(
      features
        .map((feature) => String((feature.properties || {})[campo] || "").trim())
        .filter(Boolean)
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
}

function preencherSelect(id, valores, labelInicial) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = [
    `<option value="">${escapeHtml(labelInicial)}</option>`,
    ...valores.map(
      (valor) => `<option value="${escapeAttr(valor)}">${escapeHtml(valor)}</option>`
    ),
  ].join("");
}

function labelPeriodoData() {
  const labels = {
    "mais-recente": "Data mais recente",
    qualquer: "Qualquer data",
    hoje: "Hoje",
    2: "Últimos dois dias",
    3: "Últimos três dias",
    7: "Última semana",
    15: "Últimos 15 dias",
    30: "Último mês",
  };
  return labels[filtros.dataPeriodo] || "Data";
}

function popularFiltros() {
  preencherSelect("map-filter-unidade", valoresUnicosDasVagas("unidade"), "Todas");
  preencherSelect("map-filter-municipio", valoresUnicosDasVagas("municipio"), "Todos");
}

function aplicarFiltroUnidadesNoMapa() {
  if (!map || !map.getSource(UNIDADES_SOURCE) || !unidadesGeojson) return;
  const unidadesComVagas = new Set(
    vagasFiltradas()
      .map((feature) => String((feature.properties || {}).unidade || "").trim())
      .filter(Boolean)
      .map(normalizar)
  );
  const features = unidadesGeojson.features.filter((feature) => {
    const props = feature.properties || {};
    if (filtros.unidade && normalizar(props.unidade) !== normalizar(filtros.unidade)) {
      return false;
    }
    if (
      filtros.municipio &&
      normalizar(props.municipio) !== normalizar(filtros.municipio)
    ) {
      return false;
    }
    if (!unidadesComVagas.has(normalizar(props.unidade))) return false;
    return true;
  });
  map.getSource(UNIDADES_SOURCE).setData({
    type: "FeatureCollection",
    features,
  });
}

function atualizarResumo() {
  const el = document.getElementById("map-results");
  if (!el) return;
  const vagas = vagasFiltradas();
  const total = vagas.reduce((acc, feature) => acc + qtdeFeature(feature), 0);
  const pcd = vagas.reduce(
    (acc, feature) =>
      feature.properties && (feature.properties.pcd === true || feature.properties.pcd === "true")
        ? acc + qtdeFeature(feature)
        : acc,
    0
  );
  const unidades = new Set(
    vagas.map((feature) => String((feature.properties || {}).unidade || "").trim()).filter(Boolean)
  );
  const titulo =
    filtros.unidade || filtros.municipio
      ? [filtros.unidade, filtros.municipio].filter(Boolean).join(" - ")
      : "Todas as unidades e municípios";

  el.innerHTML = `
    <strong>${escapeHtml(titulo)}</strong>
    <div class="map-results-period">${escapeHtml(labelPeriodoData())}</div>
    <div class="map-results-grid">
      <div class="map-results-stat"><span>Total de vagas</span><b>${total}</b></div>
      <div class="map-results-stat"><span>Vagas PCD</span><b>${pcd}</b></div>
      <div class="map-results-stat"><span>Unidades com vagas</span><b>${unidades.size}</b></div>
    </div>
  `;
}

function renderTabelaVagas() {
  const section = document.getElementById("map-vagas-table-section");
  const summary = document.getElementById("map-vagas-table-summary");
  const tbody = document.getElementById("map-vagas-table-body");
  const paginacao = document.getElementById("map-vagas-paginacao");
  if (!section || !summary || !tbody) return;

  const deveMostrar = Boolean(filtros.unidade || filtros.municipio);
  section.classList.toggle("hidden", !deveMostrar);
  if (!deveMostrar) {
    tbody.innerHTML = "";
    summary.textContent = "";
    vagasTabelaAtual = [];
    tabelaPagina = 1;
    if (paginacao) {
      paginacao.classList.add("hidden");
      paginacao.innerHTML = "";
    }
    return;
  }

  vagasTabelaAtual = vagasFiltradas().sort((a, b) => {
    const pa = a.properties || {};
    const pb = b.properties || {};
    return (
      String(pa.ocupacao || "").localeCompare(String(pb.ocupacao || ""), "pt-BR") ||
      String(pa.unidade || "").localeCompare(String(pb.unidade || ""), "pt-BR")
    );
  });

  const totalPaginas = Math.max(1, Math.ceil(vagasTabelaAtual.length / TABELA_POR_PAGINA));
  if (tabelaPagina > totalPaginas) tabelaPagina = totalPaginas;
  if (tabelaPagina < 1) tabelaPagina = 1;

  summary.textContent =
    vagasTabelaAtual.length === 1
      ? "1 oferta encontrada para o filtro selecionado."
      : `${vagasTabelaAtual.length} ofertas encontradas para o filtro selecionado.`;

  if (vagasTabelaAtual.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="map-vagas-empty">Nenhuma vaga encontrada para este filtro.</td>
      </tr>
    `;
    if (paginacao) {
      paginacao.classList.add("hidden");
      paginacao.innerHTML = "";
    }
    return;
  }

  const inicio = (tabelaPagina - 1) * TABELA_POR_PAGINA;
  const pagina = vagasTabelaAtual.slice(inicio, inicio + TABELA_POR_PAGINA);

  tbody.innerHTML = pagina
    .map((feature, pageIndex) => {
      const p = feature.properties || {};
      const pcd = p.pcd === true || p.pcd === "true";
      const ocupacao = p.ocupacao || "Não informado";
      const globalIndex = inicio + pageIndex;
      return `
        <tr>
          <td>
            <button type="button" class="map-table-vaga-link" data-vaga-index="${globalIndex}" title="Ver detalhes da vaga">
              ${escapeHtml(ocupacao)}
            </button>
          </td>
          <td>${Number(p.qtde_vagas) || 1}</td>
          <td><span class="map-vagas-pcd ${pcd ? "is-pcd" : ""}">${pcd ? "Sim" : "Não"}</span></td>
          <td>${escapeHtml(p.municipio || "Não informado")}</td>
          <td>${escapeHtml(p.unidade || "Não informado")}</td>
          <td>
            <a class="map-table-action" href="${escapeAttr(SAA_URL)}" target="_blank" rel="noopener noreferrer">Escolher a vaga</a>
          </td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("[data-vaga-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.vagaIndex);
      const feature = vagasTabelaAtual[index];
      if (!feature) return;
      DetalhesVaga.abrir(feature.properties || {});
    });
  });

  renderPaginacaoTabela(totalPaginas);
}

function renderPaginacaoTabela(totalPaginas) {
  const paginacao = document.getElementById("map-vagas-paginacao");
  if (!paginacao) return;

  if (totalPaginas <= 1) {
    paginacao.classList.add("hidden");
    paginacao.innerHTML = "";
    return;
  }

  paginacao.classList.remove("hidden");
  paginacao.innerHTML = `
    <button type="button" id="map-pag-anterior" ${tabelaPagina <= 1 ? "disabled" : ""}>Anterior</button>
    <strong>Página ${tabelaPagina} de ${totalPaginas}</strong>
    <button type="button" id="map-pag-proxima" ${tabelaPagina >= totalPaginas ? "disabled" : ""}>Próxima</button>
  `;

  document.getElementById("map-pag-anterior")?.addEventListener("click", () => {
    if (tabelaPagina > 1) {
      tabelaPagina -= 1;
      renderTabelaVagas();
      document.getElementById("map-vagas-table-section")?.scrollIntoView({ behavior: "smooth" });
    }
  });

  document.getElementById("map-pag-proxima")?.addEventListener("click", () => {
    if (tabelaPagina < totalPaginas) {
      tabelaPagina += 1;
      renderTabelaVagas();
      document.getElementById("map-vagas-table-section")?.scrollIntoView({ behavior: "smooth" });
    }
  });
}

function aplicarFiltrosMapa() {
  tabelaPagina = 1;
  aplicarFiltroUnidadesNoMapa();
  atualizarResumo();
  renderTabelaVagas();
}

function selecionarMunicipio(municipio) {
  filtros.municipio = municipio || "";
  const select = document.getElementById("map-filter-municipio");
  if (select) select.value = filtros.municipio;
  aplicarFiltrosMapa();
}

function selecionarUnidade(unidade) {
  filtros.unidade = unidade || "";
  const select = document.getElementById("map-filter-unidade");
  if (select) select.value = filtros.unidade;
  aplicarFiltrosMapa();
}

function limparSelecaoMapa() {
  filtros.unidade = "";
  filtros.municipio = "";
  const unidade = document.getElementById("map-filter-unidade");
  const municipio = document.getElementById("map-filter-municipio");
  if (unidade) unidade.value = "";
  if (municipio) municipio.value = "";
  if (popup) popup.remove();
  aplicarFiltrosMapa();
}

async function adicionarRegioes() {
  const [geojson, paleta] = await Promise.all([
    carregarJson("/api/geo/ce-regioes", { type: "FeatureCollection", features: [] }),
    carregarJson("/api/geo/regioes-paleta", { regioes: [], cores: {} }),
  ]);

  map.addSource(CE_REGIOES_SOURCE, {
    type: "geojson",
    data: geojson,
  });

  map.addLayer({
    id: CE_REGIOES_FILL,
    type: "fill",
    source: CE_REGIOES_SOURCE,
    paint: {
      "fill-color": buildRegiaoFillColorExpr(paleta),
      "fill-opacity": 0.42,
    },
  });

  map.addLayer({
    id: CE_REGIOES_LINE,
    type: "line",
    source: CE_REGIOES_SOURCE,
    paint: {
      "line-color": "#008f4b",
      "line-width": 1,
      "line-opacity": 0.72,
    },
  });

  map.on("click", CE_REGIOES_FILL, (event) => {
    const feature = event.features && event.features[0];
    const municipio = municipioDaFeature(feature && feature.properties);
    if (municipio) selecionarMunicipio(municipio);
  });

  map.on("mouseenter", CE_REGIOES_FILL, () => {
    map.getCanvas().style.cursor = "pointer";
  });
  map.on("mouseleave", CE_REGIOES_FILL, () => {
    map.getCanvas().style.cursor = "";
  });
}

async function carregarImagemUnidade() {
  if (map.hasImage(PINO_UNIDADE_IMAGE_ID)) return true;
  try {
    const img = await new Promise((resolve, reject) => {
      const im = new Image();
      im.crossOrigin = "anonymous";
      im.onload = () => resolve(im);
      im.onerror = reject;
      im.src = PINO_UNIDADE_URL;
    });
    map.addImage(PINO_UNIDADE_IMAGE_ID, img);
    return true;
  } catch (error) {
    console.warn("Ícone das unidades indisponível; usando círculo.", error);
    return false;
  }
}

async function adicionarUnidades() {
  unidadesGeojson = await carregarJson("/api/unidades/geojson", {
    type: "FeatureCollection",
    features: [],
  });

  map.addSource(UNIDADES_SOURCE, {
    type: "geojson",
    data: unidadesGeojson,
    promoteId: "id",
  });

  const temImagem = await carregarImagemUnidade();
  if (temImagem) {
    map.addLayer({
      id: UNIDADES_LAYER,
      type: "symbol",
      source: UNIDADES_SOURCE,
      layout: {
        "icon-image": PINO_UNIDADE_IMAGE_ID,
        "icon-size": [
          "case",
          [">", ["to-number", ["get", "ofertas_data_recente"], 0], 0],
          0.54,
          0.42,
        ],
        "icon-anchor": "bottom",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    });
  } else {
    map.addLayer({
      id: UNIDADES_LAYER,
      type: "circle",
      source: UNIDADES_SOURCE,
      paint: {
        "circle-radius": 9,
        "circle-color": "#f26522",
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
      },
    });
  }

  map.on("click", UNIDADES_LAYER, (event) => {
    const feature = event.features && event.features[0];
    if (!feature) return;
    selecionarUnidade((feature.properties && feature.properties.unidade) || "");
    popup
      .setLngLat(feature.geometry.coordinates)
      .setHTML(buildUnidadePopupHtml(feature.properties, feature.geometry.coordinates))
      .addTo(map);
  });
}

async function adicionarVagas() {
  vagasGeojson = await carregarJson("/api/vagas/geojson", {
    type: "FeatureCollection",
    features: [],
  });
  dataMaisRecente = calcularDataMaisRecente();
  atualizarUltimaAtualizacao(vagasGeojson.ultima_atualizacao || "");
}

function atualizarUltimaAtualizacao(valor) {
  const el = document.getElementById("ultima-atualizacao");
  if (!el) return;
  const texto = String(valor || "").trim();
  el.textContent = texto ? `Última atualização: ${texto}` : "";
}

function configurarCursor() {
  [UNIDADES_LAYER].forEach((layer) => {
    map.on("mouseenter", layer, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layer, () => {
      map.getCanvas().style.cursor = "";
    });
  });
}

function configurarLimpezaCliqueFora() {
  map.on("click", (event) => {
    const features = map.queryRenderedFeatures(event.point, {
      layers: [UNIDADES_LAYER, CE_REGIOES_FILL],
    });
    if (features.length === 0) {
      limparSelecaoMapa();
    }
  });
}

function focarVagaDaUrl() {
  const vagaId = qs("vaga");
  if (!vagaId || !vagasGeojson) return false;
  const feature = vagasGeojson.features.find(
    (ft) => String(ft.properties && ft.properties.id) === String(vagaId)
  );
  if (!feature) return false;
  filtros.unidade = String((feature.properties && feature.properties.unidade) || "");
  filtros.municipio = String((feature.properties && feature.properties.municipio) || "");
  const unidadeSelect = document.getElementById("map-filter-unidade");
  const municipioSelect = document.getElementById("map-filter-municipio");
  if (unidadeSelect) unidadeSelect.value = filtros.unidade;
  if (municipioSelect) municipioSelect.value = filtros.municipio;
  aplicarFiltrosMapa();
  map.flyTo({ center: feature.geometry.coordinates, zoom: 13, speed: 0.9 });
  popup
    .setLngLat(feature.geometry.coordinates)
    .setHTML(buildVagaPopupHtml(feature.properties))
    .addTo(map);
  return true;
}

function configurarFiltros() {
  const unidade = document.getElementById("map-filter-unidade");
  const municipio = document.getElementById("map-filter-municipio");
  const data = document.getElementById("map-filter-data");
  const limpar = document.getElementById("map-filter-clear");

  if (unidade) {
    unidade.addEventListener("change", () => {
      filtros.unidade = unidade.value;
      aplicarFiltrosMapa();
    });
  }

  if (municipio) {
    municipio.addEventListener("change", () => {
      filtros.municipio = municipio.value;
      aplicarFiltrosMapa();
    });
  }

  if (data) {
    data.addEventListener("change", () => {
      filtros.dataPeriodo = data.value;
      aplicarFiltrosMapa();
    });
  }

  if (limpar) {
    limpar.addEventListener("click", () => {
      filtros.dataPeriodo = "mais-recente";
      if (data) data.value = "mais-recente";
      limparSelecaoMapa();
      fitCeara();
    });
  }
}

function buildVagaPopupHtml(props) {
  const telefone =
    String(props.telefone_unidade || "").trim() ||
    String(props.celular_responsavel || "").trim() ||
    String(props.telefone || "").trim();
  const email = String(props.email_contato || "").trim();
  return `
    <div class="popup-rich popup-rich--vaga">
      <h4>${escapeHtml(props.ocupacao || "Vaga")}</h4>
      <table class="popup-kv">
        <tbody>
          <tr><td>Vagas</td><td>${Number(props.qtde_vagas) || 1}</td></tr>
          <tr><td>Município</td><td>${escapeHtml(props.municipio || "Não informado")}</td></tr>
          <tr><td>Unidade</td><td>${escapeHtml(props.unidade || "Não informado")}</td></tr>
          <tr><td>PCD</td><td>${props.pcd === true || props.pcd === "true" ? "Sim" : "Não"}</td></tr>
          <tr><td>Telefone</td><td>${escapeHtml(telefone || "Não informado")}</td></tr>
          <tr><td>E-mail</td><td>${escapeHtml(email || "Não informado")}</td></tr>
        </tbody>
      </table>
      <div class="popup-actions">
        <a class="map-popup-btn" href="${escapeAttr(SAA_URL)}" target="_blank" rel="noopener noreferrer">Escolher a vaga</a>
      </div>
    </div>
  `;
}

function buildUnidadePopupHtml(props, coords) {
  const destino = montarDestinoGoogleMaps(props, coords);
  const rota = destino
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`
    : "";
  const telefone = String(props.telefone_unidade || "").trim();
  const celular = String(props.celular_responsavel || "").trim();
  return `
    <div class="popup-rich popup-rich--unidade">
      <h4>${escapeHtml(props.unidade || "Unidade IDT")}</h4>
      <table class="popup-kv">
        <tbody>
          <tr><td>Município</td><td>${escapeHtml(props.municipio || "Não informado")}</td></tr>
          <tr><td>Vagas recentes</td><td>${Number(props.ofertas_data_recente) || 0}</td></tr>
          <tr><td>Endereço</td><td>${escapeHtml(props.endereco || "Não informado")}</td></tr>
          <tr><td>Telefone</td><td>${escapeHtml(telefone || "Não informado")}</td></tr>
          <tr><td>Celular</td><td>${escapeHtml(celular || "Não informado")}</td></tr>
        </tbody>
      </table>
      <div class="popup-actions">
        <a class="map-popup-btn" href="${escapeAttr(SAA_URL)}" target="_blank" rel="noopener noreferrer">Escolher a vaga</a>
        ${rota ? `<a class="map-popup-btn map-popup-btn-route" href="${escapeAttr(rota)}" target="_blank" rel="noopener noreferrer">Traçar rota</a>` : ""}
      </div>
    </div>
  `;
}

function montarDestinoGoogleMaps(props, coords) {
  const partes = [];
  if (props.endereco) partes.push(props.endereco);
  if (props.municipio) partes.push(props.municipio);
  if (partes.length) partes.push("CE", "Brasil");
  if (partes.length) return partes.join(", ");
  if (coords && coords.length >= 2) return `${coords[1]},${coords[0]}`;
  return "";
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

async function initMapa() {
  if (typeof maplibregl === "undefined") {
    setStatus("Não foi possível carregar o mapa.");
    return;
  }

  map = new maplibregl.Map({
    container: "map-main",
    style: MAP_STYLE,
    center: [-39.2, -5.2],
    zoom: 6,
  });

  popup = new maplibregl.Popup({ closeButton: true, maxWidth: "340px" });
  map.addControl(new maplibregl.NavigationControl(), "top-right");
  map.addControl(createCearaExtentControl(), "top-right");
  map.addControl(new maplibregl.ScaleControl({ maxWidth: 100 }), "bottom-left");
  map.addControl(
    new maplibregl.FullscreenControl({
      container: document.querySelector(".map-layout"),
    }),
    "top-right"
  );

  map.on("load", async () => {
    setStatus("Carregando camadas do mapa...");
    DetalhesVaga.init();
    try {
      await DetalhesVaga.carregarPostos();
    } catch (error) {
      console.error(error);
    }
    await adicionarRegioes();
    await adicionarUnidades();
    await adicionarVagas();
    popularFiltros();
    configurarFiltros();
    configurarCursor();
    configurarLimpezaCliqueFora();
    const focou = focarVagaDaUrl();
    if (!focou) aplicarFiltrosMapa();
    if (!focou) fitCeara();
    const total = vagasGeojson ? vagasGeojson.features.length : 0;
    setStatus(`${total} vaga(s) com localização. O mapa mostra as unidades IDT.`);
  });
}

document.addEventListener("DOMContentLoaded", initMapa);
