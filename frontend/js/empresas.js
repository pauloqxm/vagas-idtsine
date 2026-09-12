const SERVICOS_EMPRESA = {
  salas: {
    titulo: "Sala para entrevistas",
    descricao:
      "Empresas podem usar salas nas unidades do SINE/IDT para realizar processos seletivos presenciais.",
  },
  mutiroes: {
    titulo: "Mutirões e feiras de recrutamento",
    descricao:
      "Eventos que reúnem empresas e trabalhadores para processos seletivos rápidos, em Fortaleza e no interior.",
  },
  pcd: {
    titulo: "Inclusão de PCD",
    descricao:
      "Ações do INCLUIR+ para inclusão de pessoas com deficiência no mercado de trabalho, com apoio de equipe multiprofissional.",
  },
  mei: {
    titulo: "Apoio a MEI e pequenos negócios",
    descricao:
      "Orientação para formalização, emissão de DAS e declaração anual de MEI e pequenos negócios.",
  },
  autonomo: {
    titulo: "Profissional autônomo",
    descricao:
      "Solicite um profissional autônomo para a demanda da sua empresa. A Central de Vagas faz o encaminhamento.",
  },
};

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("modal-servico");
  const titulo = document.getElementById("modal-servico-titulo");
  const desc = document.getElementById("modal-servico-desc");
  if (!modal || !titulo || !desc) return;

  let origem = null;

  const abrir = (chave, origemEl) => {
    const dados = SERVICOS_EMPRESA[chave];
    if (!dados) return;
    origem = origemEl || null;
    titulo.textContent = dados.titulo;
    desc.textContent = dados.descricao;
    modal.classList.remove("hidden");
    document.body.style.overflow = "hidden";
    modal.querySelector(".modal__close")?.focus();
  };

  const fechar = () => {
    modal.classList.add("hidden");
    document.body.style.overflow = "";
    origem?.focus();
    origem = null;
  };

  document.querySelectorAll("[data-servico]").forEach((el) => {
    el.addEventListener("click", () => abrir(el.getAttribute("data-servico"), el));
  });

  modal.querySelectorAll("[data-fechar-servico]").forEach((el) => {
    el.addEventListener("click", fechar);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !modal.classList.contains("hidden")) fechar();
  });
});
