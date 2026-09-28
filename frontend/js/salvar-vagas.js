const SalvarVagas = {
  escapeHtml(valor) {
    const div = document.createElement("div");
    div.textContent = String(valor ?? "");
    return div.innerHTML;
  },

  qtde(vaga) {
    return Number(vaga.qtde_vagas) || 1;
  },

  totalOcupacoesUnicas(vagas) {
    const ocupacoes = new Set();
    (vagas || []).forEach((vaga) => {
      const nome = this.normalizar(String(vaga.ocupacao || "").trim());
      if (nome) ocupacoes.add(nome);
    });
    return ocupacoes.size;
  },

  totaisPcd(vagas) {
    let total = 0;
    let regulares = 0;
    let inclusiva = 0;
    let exclusiva = 0;
    (vagas || []).forEach((vaga) => {
      const q = this.qtde(vaga);
      total += q;
      const categoria = DetalhesVaga.categoriaPcd(vaga);
      if (categoria === "exclusiva") exclusiva += q;
      else if (categoria === "inclusiva") inclusiva += q;
      else regulares += q;
    });
    return { total, regulares, inclusiva, exclusiva };
  },

  dataHojeBR() {
    return new Date().toLocaleDateString("pt-BR");
  },

  dataHoraHojeBR() {
    const agora = new Date();
    const data = agora.toLocaleDateString("pt-BR");
    const hora = agora.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    return `${data} ${hora}`;
  },

  dataExibicao(valor) {
    if (typeof dataExibicao === "function") return dataExibicao(valor);
    const s = String(valor || "").trim();
    const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
    const partes = s.split("/");
    if (partes.length === 3) return s;
    return s;
  },

  async obterLogoSrc() {
    if (this._logoDataUrl) return this._logoDataUrl;

    const fontes = [
      "img/logo-idt.png",
      "https://www.idt.org.br/assets/img/logos/logo_grande.png",
    ];

    for (const src of fontes) {
      try {
        const res = await fetch(src);
        if (!res.ok) continue;
        const blob = await res.blob();
        const dataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result || ""));
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (dataUrl.startsWith("data:image")) {
          this._logoDataUrl = dataUrl;
          return dataUrl;
        }
      } catch (_) {
        /* tenta próxima fonte */
      }
    }

    return "img/logo-idt.png";
  },

  slugMunicipio(municipio) {
    return String(municipio || "municipio")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .toLowerCase();
  },

  normalizar(txt) {
    return String(txt || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  },

  descricaoUnidade(vaga) {
    return String((vaga && (vaga.unidade || vaga.descricaoUnidade)) || "").trim();
  },

  tituloUnidade(vagas) {
    const nomes = [
      ...new Set((vagas || []).map((vaga) => this.descricaoUnidade(vaga)).filter(Boolean)),
    ];
    return nomes.join(" · ");
  },

  obterUnidades(vagas) {
    const mapa = new Map();
    (vagas || []).forEach((vaga) => {
      const dados =
        typeof DetalhesVaga !== "undefined" && DetalhesVaga.enriquecerVagaComPosto
          ? DetalhesVaga.enriquecerVagaComPosto(vaga)
          : vaga;
      const unidade = String(dados.unidade || "").trim() || "Não informado";
      const chave = this.normalizar(unidade);
      if (mapa.has(chave)) return;

      mapa.set(chave, {
        unidade,
        responsavel: String(dados.responsavel_unidade || "").trim() || "Não informado",
        telefoneUnidade: String(dados.telefone_unidade || "").trim() || "Não informado",
        endereco: String(dados.endereco || "").trim() || "Não informado",
      });
    });
    return [...mapa.values()];
  },

  renderCard(vaga, index) {
    const categoria = DetalhesVaga.categoriaPcd(vaga);
    const tom = ["blue", "green", "orange"][index % 3];
    return `
      <article class="print-card print-card--${tom}">
        <div class="print-card__accent"></div>
        <div class="print-card__body">
          <div class="print-card__top">
            <h2 class="print-card__title">${this.escapeHtml(vaga.ocupacao || "Vaga sem nome")}</h2>
            <span class="print-card__qty">${this.qtde(vaga)} vaga(s)</span>
          </div>
          <div class="print-card__info">
            <span><strong>Unidade:</strong> ${this.escapeHtml(vaga.unidade || "Não informado")}</span>
            <span><strong>Escolaridade:</strong> ${this.escapeHtml(String(vaga.escolaridade || "").trim() || "Não informado")}</span>
            <span><strong>Contratação:</strong> ${this.escapeHtml(String(vaga.tipo_contratacao || "").trim() || "Não informado")}</span>
            <span><strong>Experiência:</strong> ${this.escapeHtml(String(vaga.experiencia || "").trim() || "Não informado")}</span>
            <span><strong>Município do trabalho:</strong> ${this.escapeHtml(String(vaga.municipio_trabalho || "").trim() || "Não informado")}</span>
          </div>
          <div class="print-card__tags">
            ${
              categoria === "exclusiva"
                ? '<span class="print-tag print-tag--pcd">Exclusiva PCD</span>'
                : categoria === "inclusiva"
                  ? '<span class="print-tag print-tag--inclusiva">Inclusiva</span>'
                  : ""
            }
            ${
              vaga.data_disponibilidade
                ? `<span class="print-tag print-tag--data">Publicada em ${this.escapeHtml(this.dataExibicao(vaga.data_disponibilidade))}</span>`
                : ""
            }
          </div>
        </div>
      </article>
    `;
  },

  renderTabela(vagas) {
    const linhas = (vagas || [])
      .map((vaga) => {
        const categoria = DetalhesVaga.categoriaPcd(vaga);
        const rotulo = DetalhesVaga.rotuloPcd(vaga);
        return `
          <tr>
            <td>${this.escapeHtml(vaga.ocupacao || "Vaga sem nome")}</td>
            <td>${this.qtde(vaga)}</td>
            <td>${this.escapeHtml(String(vaga.escolaridade || "").trim() || "Não informado")}</td>
            <td>${this.escapeHtml(String(vaga.tipo_contratacao || "").trim() || "Não informado")}</td>
            <td>${this.escapeHtml(String(vaga.experiencia || "").trim() || "Não informado")}</td>
            <td>${this.escapeHtml(String(vaga.municipio_trabalho || "").trim() || "Não informado")}</td>
            <td class="print-pcd print-pcd--${categoria}">${this.escapeHtml(rotulo)}</td>
          </tr>
        `;
      })
      .join("");

    return `
      <div class="print-vagas-table-wrap">
        <table class="print-vagas-table">
          <thead>
            <tr>
              <th>Ocupação</th>
              <th>Qtde</th>
              <th>Escolaridade</th>
              <th>Contratação</th>
              <th>Experiência</th>
              <th>Município</th>
              <th>Direcionamento</th>
            </tr>
          </thead>
          <tbody>${linhas}</tbody>
        </table>
      </div>
    `;
  },

  renderUnidades(unidades) {
    if (!unidades.length) {
      return `
        <div class="print-unit">
          <div><strong>Responsável:</strong> Não informado</div>
          <div><strong>Telefone da unidade:</strong> Não informado</div>
          <div><strong>Endereço:</strong> Não informado</div>
        </div>
      `;
    }

    return unidades
      .map(
        (item) => `
      <div class="print-unit">
        <div><strong>Responsável:</strong> ${this.escapeHtml(item.responsavel)}</div>
        <div><strong>Telefone da unidade:</strong> ${this.escapeHtml(item.telefoneUnidade)}</div>
        <div><strong>Endereço:</strong> ${this.escapeHtml(item.endereco)}</div>
      </div>
    `
      )
      .join("");
  },

  estilos(formato) {
    return `
      @page {
        size: A4 portrait;
        margin: 12mm 10mm;
      }

      * { box-sizing: border-box; }

      body {
        margin: 0;
        padding: 0;
        color: #1f2a37;
        background: #f4f8fb;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .print-page {
        width: 100%;
        max-width: 190mm;
        margin: 0 auto;
        padding: 4px;
      }

      .print-header {
        display: grid;
        gap: 12px;
        padding: 14px 16px;
        border-radius: 14px;
        background:
          linear-gradient(135deg, rgba(0, 168, 89, 0.12), rgba(0, 61, 104, 0.08) 45%, rgba(242, 101, 34, 0.1)),
          #fff;
        border: 1px solid #d5e3ef;
        margin-bottom: 12px;
      }

      .print-header__top {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 16px;
      }

      .print-header__brand {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .print-logo {
        display: block;
        height: 48px;
        width: auto;
        max-width: 160px;
        object-fit: contain;
      }

      .print-header__title {
        margin: 0;
        color: #003d68;
        font-size: 18px;
        line-height: 1.2;
      }

      .print-header__title span {
        display: block;
        margin-top: 2px;
        color: #008f4b;
        font-size: 13px;
        font-weight: 800;
      }

      .print-header__meta {
        text-align: right;
        color: #5f6b84;
        font-size: 11px;
        line-height: 1.45;
        white-space: nowrap;
      }

      .print-units {
        display: grid;
        gap: 8px;
        padding-top: 10px;
        border-top: 2px solid #003d68;
      }

      .print-unit {
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.4fr);
        gap: 8px 12px;
        padding: 8px 10px;
        border-radius: 10px;
        background: #fff;
        border: 1px solid #d7e5f0;
        color: #2f3a4e;
        font-size: 11px;
        line-height: 1.35;
      }

      .print-unit strong {
        color: #003d68;
      }

      .print-unit > div:last-child {
        overflow-wrap: break-word;
        word-break: normal;
      }

      .print-summary {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
        margin-bottom: 12px;
      }

      .print-summary__item {
        padding: 6px 10px;
        border-radius: 999px;
        background: #eaf3f8;
        color: #003d68;
        font-size: 11px;
        font-weight: 800;
      }

      .print-summary__item--green {
        background: #e8f7ef;
        color: #008f4b;
      }

      .print-summary__item--regular {
        background: #e8f7ef;
        color: #00763f;
      }

      .print-summary__item--blue {
        background: #eaf3f8;
        color: #003d68;
      }

      .print-summary__item--orange {
        background: #fff4ef;
        color: #d95415;
      }

      .print-legend {
        display: grid;
        gap: 6px;
        margin-top: 10px;
        padding: 8px 10px;
        border: 1px solid #d7e5f0;
        border-radius: 10px;
        background: #fff;
        color: #2f3a4e;
        font-size: 10px;
        line-height: 1.4;
      }

      .print-legend__item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
      }

      .print-legend__swatch {
        flex: 0 0 auto;
        padding: 1px 7px;
        border-radius: 999px;
        font-weight: 800;
        white-space: nowrap;
      }

      .print-legend__swatch--inclusiva {
        background: #eaf3f8;
        color: #003d68;
      }

      .print-legend__swatch--exclusiva {
        background: #fff4ef;
        color: #d95415;
      }

      .print-more-info {
        margin-top: 10px;
        text-align: center;
        color: #003d68;
        font-size: 11px;
        font-weight: 800;
      }

      .print-more-info a {
        color: #003d68;
        text-decoration: underline;
      }

      .print-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }

      .print-vagas-table-wrap {
        width: 100%;
        overflow: visible;
      }

      .print-vagas-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        table-layout: auto;
      }

      .print-vagas-table th,
      .print-vagas-table td {
        padding: 5px 6px;
        border: 0.4pt solid #e4eef5;
        text-align: left;
        vertical-align: top;
      }

      .print-vagas-table th:nth-child(1),
      .print-vagas-table td:nth-child(1) {
        white-space: normal;
        overflow-wrap: break-word;
        word-break: normal;
        hyphens: none;
      }

      .print-vagas-table th:nth-child(2),
      .print-vagas-table td:nth-child(2) {
        white-space: nowrap;
        text-align: center;
      }

      .print-vagas-table th:nth-child(3),
      .print-vagas-table td:nth-child(3),
      .print-vagas-table th:nth-child(4),
      .print-vagas-table td:nth-child(4),
      .print-vagas-table th:nth-child(5),
      .print-vagas-table td:nth-child(5) {
        white-space: nowrap;
      }

      .print-vagas-table th:nth-child(6),
      .print-vagas-table td:nth-child(6) {
        white-space: normal;
        overflow-wrap: break-word;
      }

      .print-vagas-table th:nth-child(7),
      .print-vagas-table td:nth-child(7) {
        width: 1%;
        white-space: nowrap;
        text-align: center;
      }

      .print-vagas-table th {
        background: #e8f7ef;
        color: #008f4b;
        font-weight: 900;
      }

      .print-vagas-table tbody tr:nth-child(even) {
        background: #f7fbf8;
      }

      .print-vagas-table tbody tr {
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .print-pcd {
        font-size: 10px;
        font-weight: 800;
        white-space: nowrap;
      }

      .print-pcd--regular {
        background: #e8f7ef;
        color: #008f4b;
      }

      .print-pcd--inclusiva {
        background: #eaf3f8;
        color: #003d68;
      }

      .print-pcd--exclusiva {
        background: #fff4ef;
        color: #d95415;
      }

      .print-card {
        position: relative;
        display: flex;
        break-inside: avoid;
        page-break-inside: avoid;
        overflow: hidden;
        border-radius: 12px;
        border: 1px solid transparent;
        box-shadow: 0 2px 8px rgba(0, 61, 104, 0.08);
      }

      .print-card__accent {
        width: 7px;
        flex: 0 0 auto;
      }

      .print-card__body {
        flex: 1;
        padding: 10px 12px;
      }

      .print-card--blue {
        background: linear-gradient(180deg, #eef6fb 0%, #ffffff 55%);
        border-color: #b7d3e8;
      }
      .print-card--blue .print-card__accent {
        background: linear-gradient(180deg, #003d68, #2f7fb8);
      }
      .print-card--blue .print-card__title { color: #003d68; }
      .print-card--blue .print-card__qty {
        background: #003d68;
        color: #fff;
      }

      .print-card--green {
        background: linear-gradient(180deg, #eaf8f0 0%, #ffffff 55%);
        border-color: #b6e0c8;
      }
      .print-card--green .print-card__accent {
        background: linear-gradient(180deg, #00a859, #008f4b);
      }
      .print-card--green .print-card__title { color: #00763f; }
      .print-card--green .print-card__qty {
        background: #00a859;
        color: #fff;
      }

      .print-card--orange {
        background: linear-gradient(180deg, #fff2ea 0%, #ffffff 55%);
        border-color: #f3c3a8;
      }
      .print-card--orange .print-card__accent {
        background: linear-gradient(180deg, #f26522, #d95415);
      }
      .print-card--orange .print-card__title { color: #d95415; }
      .print-card--orange .print-card__qty {
        background: #f26522;
        color: #fff;
      }

      .print-card__top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }

      .print-card__title {
        margin: 0;
        font-size: 13px;
        line-height: 1.25;
        font-weight: 800;
      }

      .print-card__qty {
        flex: 0 0 auto;
        padding: 4px 8px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 900;
        white-space: nowrap;
      }

      .print-card__info {
        display: grid;
        gap: 2px;
        margin: 8px 0 6px;
        color: #4b5870;
        font-size: 11px;
        line-height: 1.35;
      }

      .print-card__tags {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }

      .print-tag {
        padding: 3px 7px;
        border-radius: 999px;
        font-size: 10px;
        font-weight: 800;
      }

      .print-tag--data {
        background: #003d68;
        color: #fff;
      }

      .print-tag--dias {
        background: #e8f7ef;
        color: #008f4b;
        border: 1px solid #b6e0c8;
      }

      .print-tag--pcd {
        background: #f26522;
        color: #fff;
      }

      .print-tag--inclusiva {
        background: #003d68;
        color: #fff;
      }

      .print-empty {
        padding: 24px;
        border: 1px dashed #cdd9e3;
        border-radius: 12px;
        text-align: center;
        color: #5f6b84;
        background: #fff;
      }

      .print-footer {
        margin-top: 14px;
        padding-top: 10px;
        border-top: 1px solid #d7e0ea;
        color: #5f6b84;
        font-size: 10px;
        text-align: center;
      }

      .print-hero {
        display: grid;
        justify-items: center;
        gap: 4px;
        margin-bottom: 12px;
        padding: 16px 14px;
        border-radius: 14px;
        background: linear-gradient(135deg, #00a859 0%, #007a42 100%);
        color: #fff;
        text-align: center;
      }

      .print-hero b {
        font-size: 36px;
        line-height: 1;
        font-variant-numeric: tabular-nums;
      }

      .print-hero span {
        max-width: 28rem;
        font-size: 13px;
        font-weight: 800;
        letter-spacing: 0.02em;
        text-transform: uppercase;
      }

      .print-rank {
        margin: 8px 0 0;
        padding: 0;
        list-style: none;
        display: grid;
        gap: 6px;
      }

      .print-rank li {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        color: #334155;
        font-size: 12px;
        font-weight: 700;
      }

      .print-rank b {
        color: #003d68;
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      .print-rank--frase li {
        display: block;
        padding-left: 0.9rem;
        position: relative;
        font-weight: 600;
      }

      .print-rank--frase li::before {
        content: "▸";
        position: absolute;
        left: 0;
        color: #008f4b;
      }

      .print-card__note {
        margin: 2px 0 0;
        color: #5f6b84;
        font-size: 11px;
        font-weight: 700;
      }

      .print-board {
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 10px;
        margin-bottom: 10px;
      }

      .print-map {
        padding: 8px 10px 10px;
        border: 1px solid #d5e3ef;
        border-radius: 14px;
        background: #fff;
      }

      .print-map__title {
        margin: 0 0 6px;
        color: #003d68;
        font-size: 14px;
      }

      .print-map svg {
        display: block;
        width: 100%;
        height: auto;
      }

      .print-board__side {
        display: grid;
        gap: 10px;
        min-width: 0;
      }

      .print-analise {
        margin-bottom: 10px;
        padding: 10px 12px;
        border: 1px solid #d7e5f0;
        border-radius: 14px;
        background: #fff;
      }

      .print-analise h2 {
        margin: 0 0 8px;
        color: #003d68;
        font-size: 14px;
      }

      .print-analise ul {
        margin: 0;
        padding-left: 1.1rem;
        color: #2f3a4e;
        font-size: 12px;
        line-height: 1.45;
      }

      .print-analise li + li {
        margin-top: 4px;
      }

      @media print {
        body { background: #fff; }
        .print-card { box-shadow: none; }
      }
    `;
  },

  montarDocumento({ municipio, vagas, totalVagas, totalRegulares, totalInclusiva, totalPcd, unidades, logoSrc, formato }) {
    const data = this.dataHojeBR();
    const geradoEm = this.dataHoraHojeBR();
    const logo =
      logoSrc ||
      "https://www.idt.org.br/assets/img/logos/logo_grande.png";
    const tituloLocal = this.tituloUnidade(vagas) || municipio;
    const emTabela = formato === "table" || formato === "tabela";
    const conteudo =
      vagas.length > 0
        ? emTabela
          ? this.renderTabela(vagas)
          : `<div class="print-grid">${vagas.map((vaga, i) => this.renderCard(vaga, i)).join("")}</div>`
        : `<div class="print-empty">Nenhuma vaga encontrada para este município.</div>`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Vagas - ${this.escapeHtml(tituloLocal)} - ${data}</title>
  <style>${this.estilos(formato)}</style>
</head>
<body>
  <div class="print-page">
    <header class="print-header">
      <div class="print-header__top">
        <div class="print-header__brand">
          <img class="print-logo" src="${this.escapeHtml(logo)}" alt="IDT — Instituto de Desenvolvimento do Trabalho" />
          <h1 class="print-header__title">
            Vagas de Emprego
            <span>${this.escapeHtml(tituloLocal)}</span>
          </h1>
        </div>
        <div class="print-header__meta">
          <div>Instituto de Desenvolvimento do Trabalho</div>
          <div>Gerado em ${geradoEm}</div>
        </div>
      </div>
      <div class="print-units">
        ${this.renderUnidades(unidades || [])}
      </div>
    </header>

    <div class="print-summary">
      <span class="print-summary__item">${this.totalOcupacoesUnicas(vagas)} ocupações</span>
      <span class="print-summary__item print-summary__item--green">${Number(totalVagas) || 0} Total de vagas</span>
      <span class="print-summary__item print-summary__item--regular">${Number(totalRegulares) || 0} Vagas Regulares</span>
      <span class="print-summary__item print-summary__item--blue">${Number(totalInclusiva) || 0} Inclusiva</span>
      <span class="print-summary__item print-summary__item--orange">${Number(totalPcd) || 0} Exclusiva PCD</span>
    </div>

    ${conteudo}

    <div class="print-legend">
      <div class="print-legend__item">
        <span class="print-legend__swatch print-legend__swatch--inclusiva">Inclusiva</span>
        <span>Vaga aberta para ampla concorrência, mas acessível para candidatos(as) PCD.</span>
      </div>
      <div class="print-legend__item">
        <span class="print-legend__swatch print-legend__swatch--exclusiva">Exclusiva PCD</span>
        <span>Oportunidade reservada exclusivamente para PCD.</span>
      </div>
    </div>

    <p class="print-more-info">
      Para mais informações acesse: <a href="https://vagas.idt.org.br/">https://vagas.idt.org.br/</a>
    </p>

    <footer class="print-footer">
      Documento gerado pelo portal de Vagas de Emprego do IDT — página formatada em A4.
    </footer>
  </div>
</body>
</html>`;
  },

  montarTextoWhatsApp(municipio) {
    const nome = String(municipio || "municipio").trim().replace(/\s+/g, "_");
    return `vagas_${nome}\n${this.dataHojeBR()}`;
  },

  montarTextoEmail(municipio) {
    return `Segue em anexo o PDF com as vagas formatadas.\n\n${this.montarTextoWhatsApp(municipio)}`;
  },

  montarLinkMunicipio(municipio, formato) {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    url.searchParams.set("municipio", String(municipio || "").trim());
    if (formato === "table" || formato === "tabela") {
      url.searchParams.set("view", "tabela");
    }
    return url.toString();
  },

  nomeArquivoPdf(municipio) {
    const nome = String(municipio || "municipio").trim().replace(/\s+/g, "_");
    return `vagas_${nome}.pdf`;
  },

  abrirImpressao(html) {
    const janela = window.open("", "_blank");
    if (!janela) {
      alert("Não foi possível abrir a janela de impressão. Permita pop-ups para este site e tente novamente.");
      return;
    }

    janela.document.open();
    janela.document.write(html);
    janela.document.close();

    const imprimir = () => {
      janela.focus();
      janela.print();
    };

    if (janela.document.readyState === "complete") {
      setTimeout(imprimir, 250);
    } else {
      janela.addEventListener("load", () => setTimeout(imprimir, 250), { once: true });
    }
  },

  limparResiduos() {
    ["pdf-export-overlay", "pdf-export-host", "pdf-export-style", "share-sheet"].forEach((id) => {
      document.getElementById(id)?.remove();
    });
    document.querySelectorAll(".html2pdf__container").forEach((el) => el.remove());
  },

  recarregarPagina() {
    this.limparResiduos();
    window.setTimeout(() => {
      window.location.reload();
    }, 600);
  },

  async gerarPdfDoHtml(html, nomeArquivo) {
    await this.carregarHtml2Pdf();
    this.limparResiduos();

    const styleEl = document.createElement("style");
    styleEl.id = "pdf-export-style";
    styleEl.textContent = String(this.estilos() || "").replace(/@page\s*\{[\s\S]*?\}/g, "");
    document.head.appendChild(styleEl);

    const overlay = document.createElement("div");
    overlay.id = "pdf-export-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483646;background:rgba(255,255,255,0.94);display:flex;align-items:center;justify-content:center;";
    overlay.innerHTML =
      '<p style="margin:0;color:#003d68;font:800 1rem/1.3 Segoe UI,sans-serif;">Gerando documento...</p>';

    const host = document.createElement("div");
    host.id = "pdf-export-host";
    host.style.cssText =
      "position:fixed;left:0;top:0;width:794px;background:#ffffff;opacity:1;visibility:visible;z-index:2147483645;";

    const doc = new DOMParser().parseFromString(html, "text/html");
    const page = doc.querySelector(".print-page") || doc.body;
    host.appendChild(page.cloneNode(true));
    host.querySelectorAll("img").forEach((img) => {
      const src = String(img.getAttribute("src") || "");
      if (!src.startsWith("data:image")) img.remove();
    });

    document.body.appendChild(host);
    document.body.appendChild(overlay);

    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, 200));

    try {
      const blob = await window
        .html2pdf()
        .set({
          margin: [10, 10, 10, 10],
          filename: nomeArquivo,
          image: { type: "jpeg", quality: 0.92 },
          html2canvas: {
            scale: 1.2,
            useCORS: false,
            allowTaint: false,
            backgroundColor: "#ffffff",
            scrollX: 0,
            scrollY: 0,
            windowWidth: 794,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(host)
        .outputPdf("blob");

      if (!(blob instanceof Blob) || blob.size < 1500) {
        throw new Error("PDF gerado está vazio.");
      }
      return blob;
    } finally {
      this.limparResiduos();
    }
  },

  carregarHtml2Pdf() {
    if (typeof window.html2pdf === "function") return Promise.resolve();
    if (this._html2pdfPromise) return this._html2pdfPromise;

    const fontes = [
      "js/vendor/html2pdf.bundle.min.js",
      "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js",
      "https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js",
    ];

    this._html2pdfPromise = (async () => {
      let ultimoErro = null;
      for (const src of fontes) {
        try {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = src;
            script.async = true;
            script.onload = () => {
              if (typeof window.html2pdf === "function") resolve();
              else reject(new Error("html2pdf não disponível após carregar o script."));
            };
            script.onerror = () => reject(new Error(`Falha ao carregar ${src}`));
            document.head.appendChild(script);
          });
          return;
        } catch (error) {
          ultimoErro = error;
        }
      }
      this._html2pdfPromise = null;
      throw ultimoErro || new Error("Não foi possível carregar a biblioteca de PDF.");
    })();

    return this._html2pdfPromise;
  },

  ehMobile() {
    return (
      window.matchMedia("(max-width: 900px)").matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "")
    );
  },

  cssCaptura() {
    const css = String(this.estilos() || "")
      .replace(/@page\s*\{[\s\S]*?\}/g, "")
      .replace(/\bbody\b/g, ".pdf-page-chunk")
      .replace(/\bhtml\b/g, ".pdf-page-chunk");
    return `
      .pdf-page-chunk {
        box-sizing: border-box;
        width: 794px;
        padding: 12px;
        background: #ffffff !important;
        color: #1f2a37;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
      }
      .pdf-page-chunk, .pdf-page-chunk * {
        box-sizing: border-box;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .pdf-page-continue {
        margin: 0 0 10px;
        padding: 6px 10px;
        border-radius: 8px;
        background: #eaf3f8;
        color: #003d68;
        font-size: 11px;
        font-weight: 800;
      }
      ${css}
    `;
  },

  canvasParaJpeg(canvas, qualidade) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob && blob.size > 500) resolve(blob);
          else reject(new Error("Imagem da página ficou vazia."));
        },
        "image/jpeg",
        qualidade
      );
    });
  },

  async gerarArquivos(html, nomeArquivo) {
    await this.carregarHtml2Pdf();

    const doc = new DOMParser().parseFromString(html, "text/html");
    const mobile = this.ehMobile();
    const scale = mobile ? 1.15 : 1.5;
    const cardsPorPagina = mobile ? 6 : 10;
    const cssPagina = this.cssCaptura();

    const styleEl = document.createElement("style");
    styleEl.id = "pdf-export-style";
    styleEl.textContent = cssPagina;
    document.head.appendChild(styleEl);

    const overlay = document.createElement("div");
    overlay.id = "pdf-export-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:2147483646;background:rgba(255,255,255,0.94);display:flex;align-items:center;justify-content:center;pointer-events:none;";
    overlay.innerHTML =
      '<p style="margin:0;color:#003d68;font:800 1rem/1.3 Segoe UI,sans-serif;">Gerando arquivo...</p>';

    const host = document.createElement("div");
    host.id = "pdf-export-host";
    host.setAttribute("aria-hidden", "true");
    host.style.cssText =
      "position:fixed;left:0;top:0;width:794px;background:#ffffff;opacity:1;visibility:visible;pointer-events:none;z-index:2147483645;";

    const page = doc.querySelector(".print-page");
    const fonte = page ? page.cloneNode(true) : doc.body.cloneNode(true);
    fonte.querySelectorAll("img").forEach((img) => {
      const src = String(img.getAttribute("src") || "");
      if (!src.startsWith("data:image")) img.remove();
    });

    const header = fonte.querySelector(".print-header");
    const summary = fonte.querySelector(".print-summary");
    const legend = fonte.querySelector(".print-legend");
    const moreInfo = fonte.querySelector(".print-more-info");
    const footer = fonte.querySelector(".print-footer");
    const grid = fonte.querySelector(".print-grid");
    const cards = grid ? [...grid.children] : [];

    const montarChunk = (inicio, fim, primeira) => {
      const chunk = document.createElement("div");
      chunk.className = "pdf-page-chunk";
      const estiloLocal = document.createElement("style");
      estiloLocal.textContent = cssPagina;
      chunk.appendChild(estiloLocal);

      if (primeira) {
        if (header) chunk.appendChild(header.cloneNode(true));
        if (summary) chunk.appendChild(summary.cloneNode(true));
      } else {
        const cont = document.createElement("p");
        cont.className = "pdf-page-continue";
        cont.textContent = "Vagas de Emprego — continuação";
        chunk.appendChild(cont);
      }

      if (cards.length) {
        const g = document.createElement("div");
        g.className = "print-grid";
        cards.slice(inicio, fim).forEach((card) => g.appendChild(card.cloneNode(true)));
        chunk.appendChild(g);
      } else if (primeira) {
        const tabela = fonte.querySelector(".print-vagas-table-wrap");
        const empty = fonte.querySelector(".print-empty");
        if (tabela) chunk.appendChild(tabela.cloneNode(true));
        else if (empty) chunk.appendChild(empty.cloneNode(true));
      }

      if (fim >= cards.length) {
        if (legend) chunk.appendChild(legend.cloneNode(true));
        if (moreInfo) chunk.appendChild(moreInfo.cloneNode(true));
        if (footer) chunk.appendChild(footer.cloneNode(true));
      }
      return chunk;
    };

    const chunks = [];
    if (!cards.length) {
      chunks.push(montarChunk(0, 0, true));
    } else {
      for (let i = 0; i < cards.length; i += cardsPorPagina) {
        chunks.push(montarChunk(i, Math.min(i + cardsPorPagina, cards.length), i === 0));
      }
    }

    chunks.forEach((chunk) => host.appendChild(chunk));
    document.body.appendChild(host);
    document.body.appendChild(overlay);

    await Promise.all(
      [...host.querySelectorAll("img")].map(
        (img) =>
          new Promise((resolve) => {
            if (img.complete) {
              resolve();
              return;
            }
            img.addEventListener("load", resolve, { once: true });
            img.addEventListener("error", resolve, { once: true });
          })
      )
    );
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    await new Promise((resolve) => setTimeout(resolve, 150));

    if (!String(host.textContent || "").trim()) {
      overlay.remove();
      host.remove();
      styleEl.remove();
      throw new Error("Conteúdo do arquivo está vazio.");
    }

    const html2canvasOpts = {
      scale,
      useCORS: false,
      allowTaint: false,
      logging: false,
      backgroundColor: "#ffffff",
      scrollX: 0,
      scrollY: 0,
      windowWidth: 794,
    };

    try {
      const imagens = [];
      const baseNome = String(nomeArquivo || "vagas").replace(/\.pdf$/i, "");

      for (let i = 0; i < chunks.length; i += 1) {
        const canvas = await window
          .html2pdf()
          .set({
            margin: 0,
            html2canvas: html2canvasOpts,
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          })
          .from(chunks[i])
          .toCanvas()
          .get("canvas");

        const jpeg = await this.canvasParaJpeg(canvas, mobile ? 0.9 : 0.95);
        imagens.push(
          new File([jpeg], `${baseNome}_${i + 1}.jpg`, { type: "image/jpeg" })
        );
      }

      let worker = window
        .html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: nomeArquivo,
          image: { type: "jpeg", quality: mobile ? 0.9 : 0.96 },
          html2canvas: html2canvasOpts,
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        })
        .from(chunks[0])
        .toPdf();

      for (let i = 1; i < chunks.length; i += 1) {
        worker = worker
          .get("pdf")
          .then((pdf) => {
            pdf.addPage();
          })
          .from(chunks[i])
          .toContainer()
          .toCanvas()
          .toPdf();
      }

      const blob = await worker.outputPdf("blob");
      if (!(blob instanceof Blob) || blob.size < 1500) {
        throw new Error("PDF gerado está vazio ou inválido.");
      }

      return { blob, imagens };
    } finally {
      overlay.remove();
      host.remove();
      styleEl.remove();
    }
  },

  async prepararPacote({ municipio, vagas, formato }) {
    const municipioSel = String(municipio || "").trim();
    const lista = Array.isArray(vagas) ? vagas : [];
    const { total: totalVagas, regulares: totalRegulares, inclusiva: totalInclusiva, exclusiva: totalPcd } =
      this.totaisPcd(lista);

    const unidades = this.obterUnidades(lista);
    const logoSrc = await this.obterLogoSrc();
    const html = this.montarDocumento({
      municipio: municipioSel,
      vagas: lista,
      totalVagas,
      totalRegulares,
      totalInclusiva,
      totalPcd,
      unidades,
      logoSrc,
      formato,
    });
    const texto = this.montarTextoWhatsApp(municipioSel);
    const nomeArquivo = this.nomeArquivoPdf(municipioSel);
    const linkMunicipio = this.montarLinkMunicipio(municipioSel, formato);

    return {
      municipio: municipioSel,
      formato,
      html,
      texto,
      textoEmail: this.montarTextoEmail(municipioSel),
      titulo: this.montarTextoWhatsApp(municipioSel).split("\n")[0],
      file: null,
      blob: null,
      imagens: [],
      nomeArquivo,
      linkMunicipio,
    };
  },

  baixarArquivo(pacote) {
    const arquivo = pacote?.file;
    if (!arquivo) {
      alert("Não foi possível gerar o PDF para download. Use Imprimir e salve como PDF.");
      return;
    }

    const url = URL.createObjectURL(arquivo);
    const link = document.createElement("a");
    link.href = url;
    link.download = pacote.nomeArquivo || "vagas.pdf";
    link.rel = "noopener";
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  },

  async enviarWhatsApp(pacote) {
    const texto = pacote.texto || this.montarTextoWhatsApp(pacote.municipio);
    const arquivos =
      pacote.imagens && pacote.imagens.length
        ? pacote.imagens
        : pacote.file
          ? [pacote.file]
          : [];

    if (arquivos.length && navigator.share) {
      const payload = { title: texto, text: texto, files: arquivos };
      try {
        if (!navigator.canShare || navigator.canShare(payload)) {
          await navigator.share(payload);
          return;
        }
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
      try {
        await navigator.share({ files: arquivos });
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }

    window.location.href = this.urlWhatsApp(texto);
  },

  async enviarDownload(pacote) {
    const arquivo = pacote?.file;
    if (!arquivo) {
      alert("Não foi possível gerar o PDF para download. Use Imprimir e salve como PDF.");
      return;
    }

    if (navigator.share && navigator.canShare) {
      const payload = { files: [arquivo], title: pacote.nomeArquivo };
      try {
        if (navigator.canShare(payload)) {
          await navigator.share(payload);
          return;
        }
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }

    this.baixarArquivo(pacote);
  },

  urlWhatsApp(texto) {
    return `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
  },

  montarTextoLink(pacote) {
    const url =
      pacote.linkMunicipio ||
      this.montarLinkMunicipio(pacote.municipio, pacote.formato);
    return {
      url,
      texto: `Vagas de ${pacote.municipio} — ${this.dataHojeBR()}\n${url}`,
    };
  },

  async enviarLink(pacote) {
    const { url, texto } = this.montarTextoLink(pacote);

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Vagas de ${pacote.municipio}`,
          text: texto,
          url,
        });
        return;
      } catch (error) {
        if (error && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch (_) {
      /* segue para WhatsApp / prompt */
    }

    const janela = window.open(this.urlWhatsApp(texto), "_blank", "noopener");
    if (!janela) {
      window.prompt("Copie o link do município já filtrado:", url);
    }
  },

  abrirMenuCompartilhar(pacote) {
    const existente = document.getElementById("share-sheet");
    if (existente) existente.remove();

    const emTabela = pacote.formato === "table" || pacote.formato === "tabela";
    const sheet = document.createElement("div");
    sheet.id = "share-sheet";
    sheet.className = "share-sheet";
    sheet.innerHTML = `
      <div class="share-sheet__backdrop" data-share-close></div>
      <div class="share-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="share-sheet-title">
        <h3 id="share-sheet-title">Compartilhar vagas</h3>
        <p>Vagas de <strong>${this.escapeHtml(pacote.municipio)}</strong> prontas para envio.</p>
        <p class="share-sheet__aviso">${
          emTabela
            ? "O documento será gerado em <strong>tabela</strong>, no mesmo formato da tela."
            : "O documento será gerado em <strong>cards</strong>, no mesmo formato da tela."
        } Você também pode enviar o link do município já filtrado.</p>
        <div class="share-sheet__actions">
          <button type="button" class="share-sheet__btn share-sheet__btn--print" data-share="print">Imprimir</button>
          <button type="button" class="share-sheet__btn share-sheet__btn--link" data-share="link">Enviar link do município</button>
        </div>
        <button type="button" class="share-sheet__close" data-share-close>Fechar</button>
      </div>
    `;

    const fecharELimpar = () => {
      sheet.remove();
      this.limparResiduos();
      this.definirEstadoBotao(false);
    };

    sheet.querySelectorAll("[data-share-close]").forEach((el) => {
      el.addEventListener("click", fecharELimpar);
    });

    sheet.querySelector('[data-share="print"]').addEventListener("click", () => {
      sheet.remove();
      this.abrirImpressao(pacote.html);
      this.limparResiduos();
      this.definirEstadoBotao(false);
    });

    sheet.querySelector('[data-share="link"]').addEventListener("click", () => {
      this.enviarLink(pacote);
    });

    document.body.appendChild(sheet);
  },

  definirEstadoBotao(carregando) {
    const botao = document.getElementById("btn-compartilhar");
    if (!botao) return;
    if (carregando) {
      botao.dataset.labelOriginal = botao.textContent;
      botao.textContent = "Gerando documento...";
      botao.disabled = true;
      return;
    }
    botao.textContent = botao.dataset.labelOriginal || "Compartilhar";
    const municipio = document.getElementById("filtro-municipio")?.value || "";
    botao.disabled = !String(municipio).trim();
  },

  async compartilhar({ municipio, vagas, formato }) {
    const municipioSel = String(municipio || "").trim();
    if (!municipioSel) {
      alert("Selecione um município para compartilhar as vagas.");
      return;
    }

    if (typeof DetalhesVaga !== "undefined" && DetalhesVaga.carregarPostos) {
      try {
        await DetalhesVaga.carregarPostos();
      } catch (_) {
        /* segue sem enriquecimento de posto */
      }
    }

    this.definirEstadoBotao(true);
    this.limparResiduos();
    try {
      const pacote = await this.prepararPacote({ municipio: municipioSel, vagas, formato });
      this.abrirMenuCompartilhar(pacote);
    } catch (error) {
      console.error(error);
      // Fallback: ainda permite imprimir / salvar PDF pelo navegador.
      const unidades = this.obterUnidades(Array.isArray(vagas) ? vagas : []);
      const totais = this.totaisPcd(vagas);
      const logoSrc = await this.obterLogoSrc();
      const html = this.montarDocumento({
        municipio: municipioSel,
        vagas: Array.isArray(vagas) ? vagas : [],
        totalVagas: totais.total,
        totalRegulares: totais.regulares,
        totalInclusiva: totais.inclusiva,
        totalPcd: totais.exclusiva,
        unidades,
        logoSrc,
        formato,
      });
      this.abrirMenuCompartilhar({
        municipio: municipioSel,
        formato,
        html,
        texto: this.montarTextoWhatsApp(municipioSel),
        textoEmail: this.montarTextoEmail(municipioSel),
        titulo: this.montarTextoWhatsApp(municipioSel).split("\n")[0],
        blob: null,
        file: null,
        nomeArquivo: this.nomeArquivoPdf(municipioSel),
        linkMunicipio: this.montarLinkMunicipio(municipioSel, formato),
      });
    } finally {
      this.definirEstadoBotao(false);
    }
  },

  formatarNumero(valor) {
    return Number(valor || 0).toLocaleString("pt-BR");
  },

  rankingPor(vagas, getter, limite) {
    const mapa = new Map();
    (vagas || []).forEach((vaga) => {
      const texto = String(getter(vaga) || "").trim();
      if (!texto) return;
      const chave = this.normalizar(texto);
      const atual = mapa.get(chave) || { texto, total: 0 };
      atual.total += this.qtde(vaga);
      mapa.set(chave, atual);
    });
    return [...mapa.values()]
      .sort((a, b) => b.total - a.total || a.texto.localeCompare(b.texto, "pt-BR"))
      .slice(0, limite);
  },

  percentual(parte, total) {
    if (!total) return "0%";
    return `${Math.round((Number(parte) / Number(total)) * 100)}%`;
  },

  textosAnalise({ total, inclusiva, exclusiva, regulares, municipios, regioes, ocupacoes }) {
    const textos = [];
    if (total > 0) {
      textos.push(
        `O extrato vigente registra ${this.formatarNumero(total)} vagas, das quais ${this.percentual(regulares, total)} são regulares, ${this.percentual(inclusiva, total)} inclusivas e ${this.percentual(exclusiva, total)} exclusivas PCD.`
      );
    }
    if (regioes[0] && total > 0) {
      textos.push(
        `${regioes[0].texto} lidera a oferta, com ${this.formatarNumero(regioes[0].total)} vagas (${this.percentual(regioes[0].total, total)} do estado).`
      );
    }
    if (regioes[1] && total > 0) {
      textos.push(
        `${regioes[1].texto} aparece em segundo, com ${this.formatarNumero(regioes[1].total)} vagas (${this.percentual(regioes[1].total, total)}).`
      );
    }
    if (municipios > 0) {
      textos.push(`A oferta está distribuída em ${this.formatarNumero(municipios)} municípios com vaga aberta.`);
    }
    if (ocupacoes[0] && total > 0) {
      textos.push(
        `A ocupação com maior demanda é ${ocupacoes[0].texto}, com ${this.formatarNumero(ocupacoes[0].total)} vagas.`
      );
    }
    return textos;
  },

  simplificarAnel(ring, alvo = 28) {
    if (!Array.isArray(ring) || ring.length <= alvo + 1) return ring || [];
    const passo = Math.ceil(ring.length / alvo);
    const out = [];
    for (let i = 0; i < ring.length - 1; i += passo) out.push(ring[i]);
    out.push(ring[ring.length - 1]);
    return out;
  },

  boundsGeojson(features) {
    let minX = 180;
    let minY = 90;
    let maxX = -180;
    let maxY = -90;
    const visitar = (coords) => {
      if (!Array.isArray(coords) || !coords.length) return;
      if (typeof coords[0] === "number") {
        const [x, y] = coords;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
        return;
      }
      coords.forEach(visitar);
    };
    (features || []).forEach((feature) => visitar(feature && feature.geometry && feature.geometry.coordinates));
    if (minX >= maxX || minY >= maxY) {
      return { minX: -41.75, minY: -8.12, maxX: -36.88, maxY: -2.68 };
    }
    return { minX, minY, maxX, maxY };
  },

  projetarPonto(lng, lat, bounds, width, height, pad) {
    const dx = bounds.maxX - bounds.minX || 1;
    const dy = bounds.maxY - bounds.minY || 1;
    const x = pad + ((lng - bounds.minX) / dx) * (width - pad * 2);
    const y = pad + (1 - (lat - bounds.minY) / dy) * (height - pad * 2);
    return [x, y];
  },

  centroidAnel(ring) {
    let area = 0;
    let cx = 0;
    let cy = 0;
    for (let i = 0; i < ring.length - 1; i += 1) {
      const [x1, y1] = ring[i];
      const [x2, y2] = ring[i + 1];
      const f = x1 * y2 - x2 * y1;
      area += f;
      cx += (x1 + x2) * f;
      cy += (y1 + y2) * f;
    }
    area *= 0.5;
    if (!area) return { coord: ring[0], area: 0 };
    return { coord: [cx / (6 * area), cy / (6 * area)], area: Math.abs(area) };
  },

  centroidGeometria(geom) {
    if (!geom || !geom.coordinates) return null;
    const poligonos =
      geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
    let melhor = null;
    for (const poly of poligonos) {
      const ring = poly && poly[0];
      if (!ring || ring.length < 3) continue;
      const atual = this.centroidAnel(ring);
      if (!melhor || atual.area > melhor.area) melhor = atual;
    }
    return melhor ? melhor.coord : null;
  },

  municipioProps(props) {
    const keys = ["Municipio", "MUNICIPIO", "municipio", "NM_MUN", "NOME"];
    for (const key of keys) {
      if (props && props[key]) return String(props[key]).trim();
    }
    return "";
  },

  regiaoProps(props) {
    const keys = ["Região", "Regiao", "REGIÃO", "regiao", "REGIAO", "regional"];
    for (const key of keys) {
      if (props && props[key]) return String(props[key]).trim();
    }
    return "";
  },

  montarSvgMapa(geojson, paleta, totaisMunicipio) {
    const features = (geojson && geojson.features) || [];
    const width = 360;
    const height = 320;
    const pad = 8;
    const bounds = this.boundsGeojson(features);
    const cores = (paleta && paleta.cores) || {};
    const proj = (lng, lat) => this.projetarPonto(lng, lat, bounds, width, height, pad);
    const maxQtde = Math.max(1, ...[...totaisMunicipio.values()].map((item) => item.total));

    const polys = features
      .map((feature) => {
        const geom = feature && feature.geometry;
        if (!geom) return "";
        const poligonos =
          geom.type === "Polygon" ? [geom.coordinates] : geom.type === "MultiPolygon" ? geom.coordinates : [];
        const d = poligonos
          .map((poly) =>
            (poly || [])
              .map((ring) => {
                const pts = this.simplificarAnel(ring)
                  .filter((pt) => Array.isArray(pt) && pt.length >= 2)
                  .map(([lng, lat]) => proj(lng, lat));
                if (pts.length < 3) return "";
                return (
                  pts.map((pt, i) => `${i ? "L" : "M"}${pt[0].toFixed(1)},${pt[1].toFixed(1)}`).join("") + "Z"
                );
              })
              .join("")
          )
          .join("");
        if (!d) return "";
        const cor = cores[this.regiaoProps(feature.properties)] || "#dff5ea";
        return `<path d="${d}" fill="${cor}" fill-opacity="0.55" stroke="#008f4b" stroke-width="0.6" stroke-opacity="0.75"/>`;
      })
      .join("");

    const circulos = features
      .map((feature) => {
        const nome = this.municipioProps(feature && feature.properties);
        const item = totaisMunicipio.get(this.normalizar(nome));
        const centro = this.centroidGeometria(feature && feature.geometry);
        if (!item || !centro) return "";
        const [x, y] = proj(centro[0], centro[1]);
        const r = 2.4 + 10 * Math.sqrt(item.total / maxQtde);
        return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="#00578c" fill-opacity="0.38" stroke="#003d68" stroke-width="0.7"/>`;
      })
      .join("");

    return `<svg viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Mapa de vagas por município no Ceará">${polys}${circulos}</svg>`;
  },

  renderRank(itens) {
    if (!itens.length) {
      return `<li>Nenhum dado disponível neste recorte.</li>`;
    }
    return itens
      .map(
        (item) =>
          `<li><span>${this.escapeHtml(item.texto)}</span><b>${this.formatarNumero(item.total)}</b></li>`
      )
      .join("");
  },

  montarRelatorioCartela({ vagas, ultimaAtualizacao, logoSrc, geojson, paleta }) {
    const totais = this.totaisPcd(vagas);
    const ocupacoes = this.rankingPor(vagas, (vaga) => vaga.ocupacao, 5);
    const municipios = this.rankingPor(vagas, (vaga) => vaga.municipio_trabalho, 5);
    const regioes = this.rankingPor(vagas, (vaga) => vaga.regional, 5);
    const totaisMunicipio = new Map();
    this.rankingPor(vagas, (vaga) => vaga.municipio_trabalho).forEach((item) => {
      totaisMunicipio.set(this.normalizar(item.texto), item);
    });
    const qtdeMunicipios = new Set(
      (vagas || []).map((vaga) => String(vaga.municipio_trabalho || "").trim()).filter(Boolean)
    ).size;
    const qtdeRegioes = new Set(
      (vagas || []).map((vaga) => String(vaga.regional || "").trim()).filter(Boolean)
    ).size;
    const qtdeUnidades = new Set(
      (vagas || [])
        .map((vaga) => String(vaga.posto_atendimento || vaga.unidade || "").trim())
        .filter(Boolean)
    ).size;
    const analises = this.textosAnalise({
      total: totais.total,
      inclusiva: totais.inclusiva,
      exclusiva: totais.exclusiva,
      regulares: totais.regulares,
      municipios: qtdeMunicipios,
      regioes,
      ocupacoes,
    });
    const dataFonte =
      this.dataExibicao(ultimaAtualizacao) ||
      this.dataExibicao((vagas[0] || {}).data_disponibilidade) ||
      this.dataHojeBR();
    const geradoEm = this.dataHoraHojeBR();
    const logo = logoSrc || "https://www.idt.org.br/assets/img/logos/logo_grande.png";
    const mapaSvg = this.montarSvgMapa(geojson, paleta, totaisMunicipio);

    const card = (tom, titulo, corpo) => `
      <article class="print-card print-card--${tom}">
        <div class="print-card__accent"></div>
        <div class="print-card__body">
          <h2 class="print-card__title">${this.escapeHtml(titulo)}</h2>
          ${corpo}
        </div>
      </article>`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Relatório gerencial de vagas - ${this.escapeHtml(dataFonte)}</title>
  <style>${this.estilos("cards")}</style>
</head>
<body>
  <div class="print-page">
    <header class="print-header">
      <div class="print-header__top">
        <div class="print-header__brand">
          <img class="print-logo" src="${this.escapeHtml(logo)}" alt="IDT — Instituto de Desenvolvimento do Trabalho" />
          <h1 class="print-header__title">
            Relatório gerencial de vagas
            <span>Documento para alta gestão</span>
          </h1>
        </div>
        <div class="print-header__meta">
          <div>Instituto de Desenvolvimento do Trabalho</div>
          <div>Fonte: Portal MTb, ${this.escapeHtml(dataFonte)}</div>
          <div>Gerado em ${geradoEm}</div>
        </div>
      </div>
    </header>

    <div class="print-hero">
      <b>${this.formatarNumero(totais.total)}</b>
      <span>Vagas de emprego abertas agora no Ceará</span>
    </div>

    <div class="print-summary">
      <span class="print-summary__item">${this.formatarNumero(this.totalOcupacoesUnicas(vagas))} ocupações</span>
      <span class="print-summary__item">${this.formatarNumero(qtdeMunicipios)} municípios</span>
      <span class="print-summary__item">${this.formatarNumero(qtdeRegioes)} regiões</span>
      <span class="print-summary__item">${this.formatarNumero(qtdeUnidades)} unidades Sine</span>
      <span class="print-summary__item print-summary__item--regular">${this.formatarNumero(totais.regulares)} regulares</span>
      <span class="print-summary__item print-summary__item--blue">${this.formatarNumero(totais.inclusiva)} inclusivas</span>
      <span class="print-summary__item print-summary__item--orange">${this.formatarNumero(totais.exclusiva)} exclusivas PCD</span>
    </div>

    <div class="print-board">
      <section class="print-map">
        <h2 class="print-map__title">Mapa de vagas por município</h2>
        ${mapaSvg}
      </section>
      <div class="print-board__side">
        ${card("blue", "Ocupações mais demandadas", `<ol class="print-rank">${this.renderRank(ocupacoes)}</ol>`)}
        ${card("orange", "Top municípios", `<ol class="print-rank">${this.renderRank(municipios)}</ol>`)}
      </div>
    </div>

    <div class="print-grid">
      ${card("green", "Top regiões", `<ol class="print-rank">${this.renderRank(regioes)}</ol>`)}
      ${card(
        "blue",
        "Distribuição PCD",
        `<ol class="print-rank">
          <li><span>Regulares</span><b>${this.formatarNumero(totais.regulares)}</b></li>
          <li><span>Inclusivas</span><b>${this.formatarNumero(totais.inclusiva)}</b></li>
          <li><span>Exclusivas PCD</span><b>${this.formatarNumero(totais.exclusiva)}</b></li>
        </ol>`
      )}
    </div>

    <section class="print-analise">
      <h2>Análises</h2>
      <ul>
        ${analises.map((texto) => `<li>${this.escapeHtml(texto)}</li>`).join("")}
      </ul>
    </section>

    <p class="print-more-info">
      Mais informações: recorte do extrato mais recente do Portal MTb, disponível em
      <a href="https://vagas.idt.org.br/">https://vagas.idt.org.br/</a>
    </p>

    <footer class="print-footer">
      Documento interno do IDT para alta gestão — página formatada em A4.
    </footer>
  </div>
</body>
</html>`;
  },

  async imprimirRelatorio(link) {
    const rotulo = link ? link.textContent : "";
    if (link) {
      link.setAttribute("aria-busy", "true");
      link.textContent = "Gerando...";
    }
    try {
      const [resVagas, geojson, paleta, logoSrc] = await Promise.all([
        fetch("/api/vagas", { cache: "no-store" }),
        fetch("/api/geo/ce-regioes").then((res) => (res.ok ? res.json() : { type: "FeatureCollection", features: [] })),
        fetch("/api/geo/regioes-paleta").then((res) => (res.ok ? res.json() : { regioes: [], cores: {} })),
        this.obterLogoSrc(),
      ]);
      if (!resVagas.ok) throw new Error(String(resVagas.status));
      const data = await resVagas.json();
      const vagas = Array.isArray(data && data.vagas) ? data.vagas : [];
      if (!vagas.length) {
        alert("Não há vagas disponíveis para montar o relatório agora.");
        return;
      }
      const html = this.montarRelatorioCartela({
        vagas,
        ultimaAtualizacao: data.ultima_atualizacao || "",
        logoSrc,
        geojson,
        paleta,
      });
      this.abrirImpressao(html);
    } catch (error) {
      console.error(error);
      alert("Não foi possível gerar o relatório. Tente novamente.");
    } finally {
      if (link) {
        link.removeAttribute("aria-busy");
        link.textContent = rotulo || "Relatório";
      }
    }
  },

  ligarMenuRelatorio() {
    document.querySelectorAll("[data-relatorio]").forEach((link) => {
      if (link.dataset.boundRelatorio === "1") return;
      link.dataset.boundRelatorio = "1";
      link.addEventListener("click", (event) => {
        event.preventDefault();
        this.imprimirRelatorio(link);
      });
    });
    const params = new URLSearchParams(window.location.search);
    if (params.get("relatorio") === "1") {
      this.imprimirRelatorio(document.querySelector("[data-relatorio]"));
    }
  },
};

document.addEventListener("DOMContentLoaded", () => {
  if (typeof SalvarVagas !== "undefined") {
    SalvarVagas.ligarMenuRelatorio();
  }
});
