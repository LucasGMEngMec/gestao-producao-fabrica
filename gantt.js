console.log("JS carregado corretamente");

/* =========================================================
   CONFIGURAÇÃO SUPABASE
========================================================= */
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At"; // anon public key

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =========================================================
   ESTADO GLOBAL
========================================================= */
let fornecedorAtual = null;
let gantt = null;
let fornecedoresContainer = null;

/* =========================================================
   INIT (DOM READY)
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  gantt = document.getElementById("gantt");
  fornecedoresContainer = document.getElementById("fornecedores");

  if (!gantt || !fornecedoresContainer) {
    console.error("Elementos #gantt ou #fornecedores não encontrados no HTML");
    return;
  }

  carregarFornecedores();
});

/* =========================================================
   CARREGAR FORNECEDORES (DINÂMICO)
========================================================= */
async function carregarFornecedores() {
  fornecedoresContainer.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("cronograma_estrutura")
    .select("fornecedor");

  if (error) {
    console.error(error);
    alert("Erro ao carregar fornecedores");
    return;
  }

  const fornecedores = [
    ...new Set(data.map(f => f.fornecedor).filter(Boolean))
  ];

  if (fornecedores.length === 0) {
    fornecedoresContainer.innerHTML =
      "<span>Nenhum fornecedor encontrado</span>";
    return;
  }

  fornecedores.forEach((nome, index) => {
    const btn = document.createElement("button");
    btn.className = "btn-filter";
    btn.textContent = nome;

    btn.addEventListener("click", () => selecionarFornecedor(nome));

    fornecedoresContainer.appendChild(btn);

    if (index === 0) {
      selecionarFornecedor(nome);
    }
  });
}

/* =========================================================
   SELECIONAR FORNECEDOR
========================================================= */
function selecionarFornecedor(nome) {
  fornecedorAtual = nome;

  document.querySelectorAll(".btn-filter").forEach(btn => {
    btn.classList.toggle("active", btn.textContent === nome);
  });

  carregarCronograma();
}

/* =========================================================
   CARREGAR CRONOGRAMA FILTRADO
========================================================= */
async function carregarCronograma() {
  gantt.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtual)
    .order("data_inicio_plan", { ascending: true });

  if (error) {
    console.error(error);
    alert("Erro ao carregar cronograma");
    return;
  }

  if (!data || data.length === 0) {
    gantt.innerHTML =
      "<p>Nenhuma atividade para este fornecedor</p>";
    return;
  }

  renderizarBarras(data);
}

/* =========================================================
   RENDERIZAR BARRAS (VERSÃO SEGURA)
========================================================= */
function renderizarBarras(atividades) {
  atividades.forEach(item => {
    if (!item.data_inicio_plan) {
      console.warn(
        "Atividade sem data_inicio_plan ignorada:",
        item
      );
      return;
    }

    const bar = document.createElement("div");
    bar.className = "bar plan";

    bar.textContent =
      `${item.situacao} - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

    gantt.appendChild(bar);
  });
}
