const DetalhesVaga = {
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
      celular_responsavel: posto.celular_responsavel || vaga.celular_responsavel || "",
      endereco: posto.endereco || vaga.endereco || "",
      bairro: posto.bairro || vaga.bairro || "",
      municipio: posto.municipio || vaga.municipio || "",
      unidade: vaga.unidade || posto.unidade || "",
      gestao: posto.gestao || vaga.gestao || "",
    };
  },

  qtde(vaga) {
    return Number(vaga.qtde_vagas) || 1;
  },

  diasOfertadas(vaga) {
    const valor = Number(vaga.dias_ofertadas);
    return Number.isFinite(valor) && valor > 0 ? valor : 1;
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
        ${dados.data_disponibilidade ? `<div><strong>Data:</strong> ${this.escapeHtml(dados.data_disponibilidade)}</div>` : ""}
        <div><strong>Dias ofertadas:</strong> ${this.diasOfertadas(dados)}</div>
        <div><strong>Perfil:</strong> ${this.escapeHtml(this.rotuloPcd(dados))}</div>
        ${
          posto || dados.posto_atendimento
            ? `<div><strong>Responsável:</strong> ${this.escapeHtml(responsavelUnidade || "Não informado")}</div>
        ${this.detalheTelefoneOuNaoInformado("Telefone da unidade", telefoneUnidade)}`
            : ""
        }
        ${email ? `<div><strong>E-mail:</strong> <a href="mailto:${this.escapeAttr(email)}">${this.escapeHtml(email)}</a></div>` : ""}
      </div>
      <div class="modal-actions">
        ${this.htmlAgendamento(dados)}
        <button type="button" class="btn btn-light" id="modal-fechar-btn">Fechar</button>
      </div>
    `;

    this.els.modal.classList.remove("hidden");
    this.ligarAgendamento(this.els.modalBody, dados);
    document.getElementById("modal-fechar-btn")?.addEventListener("click", () => this.fechar());
  },

  fechar() {
    this.els.modal?.classList.add("hidden");
  },

  urlAgendamentoIdt: "https://idt.org.br/saa4/login",
  urlAgendamentoVaptVupt: "https://meuvaptvupt.com.br/agendamentos/solicitar-agendamento",

  avisoAgendamento: "O agendamento não assegura a vaga, vá até a unidade agendada.",

  categoriaPcd(vaga) {
    const raw = vaga && vaga.pcd;
    if (raw === true) return "exclusiva";
    if (raw === false) return "regular";
    const texto = String(raw || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (texto.includes("exclusiv") || texto === "1" || texto === "true" || texto === "sim") {
      return "exclusiva";
    }
    if (texto.includes("inclusiv")) return "inclusiva";
    return "regular";
  },

  rotuloPcd(vaga) {
    const categoria = this.categoriaPcd(vaga);
    if (categoria === "exclusiva") return "Exclusiva PCD";
    if (categoria === "inclusiva") return "Inclusiva";
    return "Vagas Regulares";
  },

  normalizarGestao(valor) {
    const texto = String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    if (texto.includes("prefeitura")) return "prefeitura";
    if (texto.includes("vapt")) return "vaptvupt";
    if (texto.includes("idt")) return "idt";
    return "";
  },

  htmlAgendamento(vaga, compact = false) {
    const sm = compact ? " btn-sm" : "";
    return `
      <span class="agendar-wrap">
        <button type="button" class="btn btn-agendar${sm}" data-agendar="${this.escapeAttr(vaga.posto_atendimento || "")}" data-gestao="${this.escapeAttr(vaga.gestao || "")}" data-telefone="${this.escapeAttr(vaga.telefone_unidade || "")}" data-celular="${this.escapeAttr(vaga.celular_responsavel || "")}">Agendamento</button>
        <button type="button" class="agendar-info" data-agendar-info aria-label="Informação sobre o agendamento" title="Informação sobre o agendamento">i</button>
      </span>
    `;
  },

  ligarAgendamento(raiz, vaga) {
    raiz?.querySelectorAll("[data-agendar]").forEach((btn) => {
      btn.addEventListener("click", () => this.executarAgendamento(btn, vaga));
    });
    raiz?.querySelectorAll("[data-agendar-info]").forEach((btn) => {
      btn.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.abrirDialogo("Agendamento", this.avisoAgendamento);
      });
    });
  },

  async executarAgendamento(botao, vaga) {
    await this.carregarPostos();
    const postoCodigo = botao?.dataset?.agendar || vaga?.posto_atendimento || "";
    const posto = this.dadosDoPosto(postoCodigo) || {};
    const gestao = this.normalizarGestao(
      posto.gestao || vaga?.gestao || botao?.dataset?.gestao || ""
    );
    const telefone = String(
      posto.telefone_unidade || vaga?.telefone_unidade || botao?.dataset?.telefone || ""
    ).trim();
    const celular = String(
      posto.celular_responsavel || vaga?.celular_responsavel || botao?.dataset?.celular || ""
    ).trim();
    const numero = telefone || celular || "não informado";

    if (gestao === "idt") {
      window.open(this.urlAgendamentoIdt, "_blank", "noopener");
      return;
    }
    if (gestao === "vaptvupt") {
      window.open(this.urlAgendamentoVaptVupt, "_blank", "noopener");
      return;
    }

    this.abrirDialogo(
      "Agendamento",
      `Esta unidade não possui agendamento entre em contato pelo numero ${numero}`
    );
  },

  abrirDialogo(titulo, mensagem) {
    document.getElementById("agendar-dialog")?.remove();
    const dialog = document.createElement("div");
    dialog.id = "agendar-dialog";
    dialog.className = "agendar-dialog";
    dialog.innerHTML = `
      <div class="agendar-dialog__backdrop" data-agendar-close></div>
      <div class="agendar-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="agendar-dialog-titulo">
        <h3 id="agendar-dialog-titulo">${this.escapeHtml(titulo)}</h3>
        <p>${this.escapeHtml(mensagem)}</p>
        <button type="button" class="btn btn-primary" data-agendar-close>Fechar</button>
      </div>
    `;
    dialog.querySelectorAll("[data-agendar-close]").forEach((el) => {
      el.addEventListener("click", () => dialog.remove());
    });
    document.body.appendChild(dialog);
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
