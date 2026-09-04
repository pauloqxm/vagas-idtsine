const SalvarVagas = {
  escapeHtml(valor) {
    const div = document.createElement("div");
    div.textContent = String(valor ?? "");
    return div.innerHTML;
  },

  qtde(vaga) {
    return Number(vaga.qtde_vagas) || 1;
  },

  diasOfertadas(vaga) {
    const valor = Number(vaga.dias_ofertadas);
    return Number.isFinite(valor) && valor > 0 ? valor : 1;
  },

  dataHojeBR() {
    return new Date().toLocaleDateString("pt-BR");
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

      const telefone =
        String(dados.telefone_unidade || "").trim() ||
        String(dados.celular_responsavel || "").trim() ||
        String(dados.telefone || "").trim();
      const email = String(dados.email_contato || "").trim();
      const contato = telefone || email || "Não informado";

      mapa.set(chave, {
        unidade,
        responsavel: String(dados.responsavel_unidade || "").trim() || "Não informado",
        contato,
      });
    });
    return [...mapa.values()];
  },

  renderCard(vaga, index) {
    const pcd = vaga.pcd === true || vaga.pcd === "true";
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
            <span><strong>Cidade:</strong> ${this.escapeHtml(vaga.municipio || "Não informado")}</span>
            <span><strong>Unidade:</strong> ${this.escapeHtml(vaga.unidade || "Não informado")}</span>
          </div>
          <div class="print-card__tags">
            ${pcd ? '<span class="print-tag print-tag--pcd">PCD</span>' : ""}
            ${
              vaga.data_disponibilidade
                ? `<span class="print-tag print-tag--data">Publicada em ${this.escapeHtml(vaga.data_disponibilidade)}</span>`
                : ""
            }
            <span class="print-tag print-tag--dias">Dias ofertadas: ${this.diasOfertadas(vaga)}</span>
          </div>
        </div>
      </article>
    `;
  },

  renderUnidades(unidades) {
    if (!unidades.length) {
      return `
        <div class="print-unit">
          <div><strong>Unidade:</strong> Não informado</div>
          <div><strong>Responsável:</strong> Não informado</div>
          <div><strong>Contato:</strong> Não informado</div>
        </div>
      `;
    }

    return unidades
      .map(
        (item) => `
      <div class="print-unit">
        <div><strong>Unidade:</strong> ${this.escapeHtml(item.unidade)}</div>
        <div><strong>Responsável:</strong> ${this.escapeHtml(item.responsavel)}</div>
        <div><strong>Contato:</strong> ${this.escapeHtml(item.contato)}</div>
      </div>
    `
      )
      .join("");
  },

  estilos() {
    return `
      @page {
        size: A4;
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

      .print-header__brand img {
        height: 42px;
        width: auto;
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
        grid-template-columns: repeat(3, minmax(0, 1fr));
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

      .print-summary {
        display: flex;
        flex-wrap: wrap;
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

      .print-summary__item--orange {
        background: #fff4ef;
        color: #d95415;
      }

      .print-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
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

      @media print {
        body { background: #fff; }
        .print-card { box-shadow: none; }
      }
    `;
  },

  montarDocumento({ municipio, vagas, totalVagas, totalPcd, unidades }) {
    const data = this.dataHojeBR();
    const cards =
      vagas.length > 0
        ? `<div class="print-grid">${vagas.map((vaga, i) => this.renderCard(vaga, i)).join("")}</div>`
        : `<div class="print-empty">Nenhuma vaga encontrada para este município.</div>`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Vagas - ${this.escapeHtml(municipio)} - ${data}</title>
  <style>${this.estilos()}</style>
</head>
<body>
  <div class="print-page">
    <header class="print-header">
      <div class="print-header__top">
        <div class="print-header__brand">
          <img src="https://www.idt.org.br/assets/img/logos/logo_grande.png" alt="IDT" />
          <h1 class="print-header__title">
            Vagas de Emprego
            <span>${this.escapeHtml(municipio)}</span>
          </h1>
        </div>
        <div class="print-header__meta">
          <div>Instituto de Desenvolvimento do Trabalho</div>
          <div>Gerado em ${data}</div>
        </div>
      </div>
      <div class="print-units">
        ${this.renderUnidades(unidades || [])}
      </div>
    </header>

    <div class="print-summary">
      <span class="print-summary__item">${vagas.length} oferta(s)</span>
      <span class="print-summary__item print-summary__item--green">${totalVagas} vaga(s)</span>
      ${
        totalPcd > 0
          ? `<span class="print-summary__item print-summary__item--orange">${totalPcd} vaga(s) PCD</span>`
          : ""
      }
    </div>

    ${cards}

    <footer class="print-footer">
      Documento gerado pelo portal de Vagas de Emprego do IDT — página formatada em A4.
    </footer>
  </div>
</body>
</html>`;
  },

  montarTextoResumo({ municipio, vagas, totalVagas, unidades }) {
    const linhas = [
      `Vagas de Emprego — ${municipio}`,
      `${vagas.length} oferta(s) | ${totalVagas} vaga(s)`,
      `Gerado em ${this.dataHojeBR()}`,
      "",
    ];

    (unidades || []).forEach((u) => {
      linhas.push(`Unidade: ${u.unidade}`);
      linhas.push(`Responsável: ${u.responsavel}`);
      linhas.push(`Contato: ${u.contato}`);
      linhas.push("");
    });

    vagas.slice(0, 20).forEach((vaga) => {
      linhas.push(
        `• ${vaga.ocupacao || "Vaga"} — ${this.qtde(vaga)} vaga(s) (${vaga.unidade || "sem unidade"})`
      );
    });

    if (vagas.length > 20) {
      linhas.push(`… e mais ${vagas.length - 20} oferta(s).`);
    }

    return linhas.join("\n");
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

  carregarHtml2Pdf() {
    if (typeof window.html2pdf === "function") return Promise.resolve();
    if (this._html2pdfPromise) return this._html2pdfPromise;

    this._html2pdfPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js";
      script.async = true;
      script.onload = () => {
        if (typeof window.html2pdf === "function") resolve();
        else reject(new Error("Biblioteca html2pdf indisponível."));
      };
      script.onerror = () => reject(new Error("Não foi possível carregar a biblioteca de PDF."));
      document.head.appendChild(script);
    }).catch((error) => {
      this._html2pdfPromise = null;
      throw error;
    });

    return this._html2pdfPromise;
  },

  async aguardarImagens(raiz) {
    const imagens = [...raiz.querySelectorAll("img")];
    await Promise.all(
      imagens.map(
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
  },

  async gerarPdfBlob(html, nomeArquivo) {
    await this.carregarHtml2Pdf();

    const doc = new DOMParser().parseFromString(html, "text/html");
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    host.style.cssText =
      "position:fixed;left:-10000px;top:0;width:190mm;background:#ffffff;pointer-events:none;z-index:-1;";

    const style = document.createElement("style");
    style.textContent = doc.querySelector("style")?.textContent || "";
    host.appendChild(style);

    const page = doc.querySelector(".print-page");
    if (page) host.appendChild(page.cloneNode(true));
    else host.appendChild(doc.body.cloneNode(true));

    document.body.appendChild(host);
    await this.aguardarImagens(host);

    try {
      return await window
        .html2pdf()
        .set({
          margin: [8, 8, 8, 8],
          filename: nomeArquivo,
          image: { type: "jpeg", quality: 0.96 },
          html2canvas: {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: "#ffffff",
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(host)
        .outputPdf("blob");
    } finally {
      host.remove();
    }
  },

  async prepararPacote({ municipio, vagas }) {
    const municipioSel = String(municipio || "").trim();
    const lista = Array.isArray(vagas) ? vagas : [];
    let totalVagas = 0;
    let totalPcd = 0;
    lista.forEach((vaga) => {
      const q = this.qtde(vaga);
      totalVagas += q;
      if (vaga.pcd === true || vaga.pcd === "true") totalPcd += q;
    });

    const unidades = this.obterUnidades(lista);
    const html = this.montarDocumento({
      municipio: municipioSel,
      vagas: lista,
      totalVagas,
      totalPcd,
      unidades,
    });
    const texto = this.montarTextoResumo({
      municipio: municipioSel,
      vagas: lista,
      totalVagas,
      unidades,
    });
    const nomeArquivo = `vagas-${this.slugMunicipio(municipioSel)}.pdf`;
    const blob = await this.gerarPdfBlob(html, nomeArquivo);
    const file = new File([blob], nomeArquivo, { type: "application/pdf" });

    return {
      municipio: municipioSel,
      html,
      texto,
      titulo: `Vagas de Emprego — ${municipioSel}`,
      file,
      blob,
      nomeArquivo,
    };
  },

  async compartilharNativo(pacote) {
    if (!navigator.share || !pacote.file) return false;

    const payloadArquivo = {
      title: pacote.titulo,
      text: pacote.texto,
      files: [pacote.file],
    };

    try {
      if (navigator.canShare && !navigator.canShare(payloadArquivo)) return false;
      await navigator.share(payloadArquivo);
      return true;
    } catch (error) {
      if (error && error.name === "AbortError") return true;
      return false;
    }
  },

  abrirMenuFallback(pacote) {
    const existente = document.getElementById("share-sheet");
    if (existente) existente.remove();

    const sheet = document.createElement("div");
    sheet.id = "share-sheet";
    sheet.className = "share-sheet";
    sheet.innerHTML = `
      <div class="share-sheet__backdrop" data-share-close></div>
      <div class="share-sheet__panel" role="dialog" aria-modal="true" aria-labelledby="share-sheet-title">
        <h3 id="share-sheet-title">Compartilhar vagas</h3>
        <p>Escolha como deseja compartilhar o PDF de <strong>${this.escapeHtml(pacote.municipio)}</strong>.</p>
        <div class="share-sheet__actions">
          <button type="button" class="share-sheet__btn share-sheet__btn--whatsapp" data-share="whatsapp">WhatsApp</button>
          <button type="button" class="share-sheet__btn share-sheet__btn--email" data-share="email">E-mail</button>
          <button type="button" class="share-sheet__btn share-sheet__btn--print" data-share="print">Imprimir</button>
          <button type="button" class="share-sheet__btn share-sheet__btn--download" data-share="download">Baixar PDF</button>
        </div>
        <button type="button" class="share-sheet__close" data-share-close>Fechar</button>
      </div>
    `;

    const fechar = () => sheet.remove();
    sheet.querySelectorAll("[data-share-close]").forEach((el) => {
      el.addEventListener("click", fechar);
    });

    sheet.querySelector('[data-share="whatsapp"]').addEventListener("click", async () => {
      fechar();
      const compartilhou = await this.compartilharNativo(pacote);
      if (!compartilhou) {
        const link = document.createElement("a");
        link.href = URL.createObjectURL(pacote.blob);
        link.download = pacote.nomeArquivo;
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 1000);
        window.open(`https://wa.me/?text=${encodeURIComponent(pacote.texto)}`, "_blank", "noopener,noreferrer");
      }
    });

    sheet.querySelector('[data-share="email"]').addEventListener("click", () => {
      const url = `mailto:?subject=${encodeURIComponent(pacote.titulo)}&body=${encodeURIComponent(
        `${pacote.texto}\n\n(O PDF também pode ser baixado pelo botão Baixar PDF.)`
      )}`;
      window.location.href = url;
      fechar();
    });

    sheet.querySelector('[data-share="print"]').addEventListener("click", () => {
      this.abrirImpressao(pacote.html);
      fechar();
    });

    sheet.querySelector('[data-share="download"]').addEventListener("click", () => {
      const link = document.createElement("a");
      link.href = URL.createObjectURL(pacote.blob);
      link.download = pacote.nomeArquivo;
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
      fechar();
    });

    document.body.appendChild(sheet);
  },

  definirEstadoBotao(carregando) {
    const botao = document.getElementById("btn-compartilhar");
    if (!botao) return;
    if (carregando) {
      botao.dataset.labelOriginal = botao.textContent;
      botao.textContent = "Gerando PDF...";
      botao.disabled = true;
      return;
    }
    botao.textContent = botao.dataset.labelOriginal || "Compartilhar";
    const municipio = document.getElementById("filtro-municipio")?.value || "";
    botao.disabled = !String(municipio).trim();
  },

  async compartilhar({ municipio, vagas }) {
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
    try {
      const pacote = await this.prepararPacote({ municipio: municipioSel, vagas });
      const compartilhou = await this.compartilharNativo(pacote);
      if (!compartilhou) this.abrirMenuFallback(pacote);
    } catch (error) {
      console.error(error);
      alert("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      this.definirEstadoBotao(false);
    }
  },
};
