const DetalhesVaga = {
  SAA_URL: "https://idt.org.br/saa4/login",
  postosPorCodigo: new Map(),
  _postosPromise: null,
  els: {},

  init() {
    this.els.modal = document.getElementById("modal-vaga");
    this.els.modalBody = document.getElementById("modal-body");
    if (!this.els.modal) return;

    const fechar = () => this.fechar();
    document.querySelector(".modal__close")?.addEventListener("click", fechar);
    document.querySelector(".modal__backdrop")?.addEventListener("click", fechar);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") fechar();
    });
  },

  async carregarPostos() {
    // Lazy: busca /api/postos-atendimento apenas uma vez, na primeira abertura de modal.
    if (this._postosPromise) return this._postosPromise;
    this._postosPromise = fetch("/api/postos-atendimento")
      .then((res) => {
        if (!res.ok) throw new Error("Não foi possível carregar os postos de atendimento.");
        return res.json();
      })
      .then((data) => {
        this.postosPorCodigo = new Map(
          Object.entries(data.postos || {}).map(([codigo, info]) => [String(codigo).trim(), info])
        );
      })
      .catch(() => {
        // falha silenciosa — os dados já estão embutidos em cada vaga
      });
    return this._postosPromise;
  },

  dadosDoPosto(posto) {
    const codigo = String(posto || "").trim();
    if (!codigo) return null;
    return this.postosPorCodigo.get(codigo) || null;
  },

  enriquecerVagaComPosto(vaga) {
    const posto = this.dadosDoPosto(vaga.posto_atendimento);
    if (!posto) return vaga;
    return {
      ...vaga,
      responsavel_unidade: posto.responsavel || vaga.responsavel_unidade || "",
      telefone_unidade: posto.telefone_unidade || vaga.telefone_unidade || "",
      endereco: posto.endereco || vaga.endereco || "",
      bairro: posto.bairro || vaga.bairro || "",
      municipio: posto.municipio || vaga.municipio || "",
      unidade: vaga.unidade || posto.unidade || "",
    };
  },

  qtde(vaga) {
    return Number(vaga.qtde_vagas) || 1;
  },

  diasOfertadas(vaga) {
    const valor = Number(vaga.dias_ofertadas);
    return Number.isFinite(valor) && valor > 0 ? valor : 1;
  },

  contatoPrincipal(vaga) {
    const email = String(vaga.email_contato || "").trim();
    const tel =
      String(vaga.telefone_unidade || "").trim() ||
      String(vaga.celular_responsavel || "").trim() ||
      String(vaga.telefone || "").trim();

    if (tel) {
      return {
        tipo: "telefone",
        texto: tel,
        href: this.SAA_URL,
        acao: "Escolher a vaga",
      };
    }

    if (email) {
      return {
        tipo: "email",
        texto: email,
        href: this.SAA_URL,
        acao: "Escolher a vaga",
      };
    }

    return null;
  },

  async abrir(vaga) {
    if (!vaga || !this.els.modal || !this.els.modalBody) return;

    // Garante que os dados dos postos estejam disponíveis (lazy load)
    await this.carregarPostos();

    const dados = this.enriquecerVagaComPosto({
      ...vaga,
      posto_atendimento: String(vaga.posto_atendimento || "").trim(),
    });
    const posto = this.dadosDoPosto(dados.posto_atendimento);
    const contato = this.contatoPrincipal(dados);
    const email = String(dados.email_contato || "").trim();
    const responsavelUnidade = String(dados.responsavel_unidade || "").trim();
    const telefoneUnidade = String(dados.telefone_unidade || "").trim();

    this.els.modalBody.innerHTML = `
      <h2 id="modal-titulo">${this.escapeHtml(dados.ocupacao || "Detalhes da vaga")}</h2>
      <div class="detail-list">
        <div><strong>Quantidade:</strong> ${this.qtde(dados)} vaga(s)</div>
        <div><strong>Cidade:</strong> ${this.escapeHtml(dados.municipio || "Não informado")}</div>
        <div><strong>Unidade:</strong> ${this.escapeHtml(dados.unidade || "Não informado")}</div>
        ${dados.endereco ? `<div><strong>Endereço:</strong> ${this.escapeHtml(dados.endereco)}</div>` : ""}
        ${dados.data ? `<div><strong>Data:</strong> ${this.escapeHtml(dados.data)}</div>` : ""}
        <div><strong>Dias ofertadas:</strong> ${this.diasOfertadas(dados)}</div>
        ${dados.pcd === true || dados.pcd === "true" ? "<div><strong>Perfil:</strong> vaga para PCD</div>" : ""}
        ${
          posto || dados.posto_atendimento
            ? `<div><strong>Responsável:</strong> ${this.escapeHtml(responsavelUnidade || "Não informado")}</div>
        ${this.detalheTelefoneOuNaoInformado("Telefone da unidade", telefoneUnidade)}`
            : ""
        }
        ${email ? `<div><strong>E-mail:</strong> <a href="mailto:${this.escapeAttr(email)}">${this.escapeHtml(email)}</a></div>` : ""}
      </div>
      <div class="modal-actions">
        ${contato ? `<a class="btn btn-call" href="${this.escapeAttr(contato.href)}" target="_blank" rel="noopener noreferrer">${this.escapeHtml(contato.acao)}</a>` : ""}
        <button type="button" class="btn btn-light" id="modal-fechar-btn">Fechar</button>
      </div>
    `;

    this.els.modal.classList.remove("hidden");
    document.getElementById("modal-fechar-btn")?.addEventListener("click", () => this.fechar());
  },

  fechar() {
    this.els.modal?.classList.add("hidden");
  },

  detalheTelefone(rotulo, valor) {
    const href = `tel:${valor.replace(/[^\d+]/g, "")}`;
    return `<div><strong>${this.escapeHtml(rotulo)}:</strong> <a href="${this.escapeAttr(href)}">${this.escapeHtml(valor)}</a></div>`;
  },

  detalheTelefoneOuNaoInformado(rotulo, valor) {
    const texto = String(valor || "").trim();
    if (!texto) {
      return `<div><strong>${this.escapeHtml(rotulo)}:</strong> Não informado</div>`;
    }
    return this.detalheTelefone(rotulo, texto);
  },

  escapeHtml(valor) {
    const div = document.createElement("div");
    div.textContent = String(valor ?? "");
    return div.innerHTML;
  },

  escapeAttr(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;");
  },
};
