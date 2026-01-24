console.log("JS carregado corretamente");

/* =========================================================
   CONFIGURAÇÃO SUPABASE
   (use sua URL e sua chave anon pública)
========================================================= */
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "SUA_CHAVE_ANON_PUBLICA_AQUI";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =========================================================
   ELEMENTOS HTML (OBRIGATÓRIOS NO gantt.html)
========================================================= */
const gantt = document.getElementById("gantt");
const fornecedoresContainer = document.getElementById("fornecedores");

if (!gantt || !fornecedoresContainer) {
  console.error("Elementos #gantt ou #fornecedores não encontrados no HTML");
}

/* =========================================================
   ESTADO GLOBAL
========================================================= */
let fornecedorAtual = null;

/* =========================================================
   CARREGAR FORNECEDORES (DINÂMICO DO BANCO)
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

  if (!data || data.length === 0) {
    fornecedoresContainer.innerHTML =
      "<span>Nenhum fornecedor encontrado</span>";
    return;
  }

  const fornecedores = [...new Set(data.map(f => f.fornecedor).filter(Boolean))];

  fornecedores.forEach((nome, index) => {
    const btn = document.createElement("button");
    btn.className = "btn-filter";
    btn.innerText = nome;

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
    btn.classList.toggle("active", btn.innerText === nome);
  });

  carregarCronograma();
}

/* =========================================================
   CARREGAR CRONOGRAMA DO FORNECEDOR
========================================================= */
async function carregarCronograma() {
  gantt.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("cronograma_estrutura")
    .select(`
      fornecedor,
      obra,
      instalacao,
      estrutura,
      data_inicio_plan,
      data_fim_plan
    `)
    .eq("fornecedor", fornecedorAtual);

  if (error) {
    console.error(error);
    alert("Erro ao carregar cronograma");
    return;
  }

  if (!data || data.length === 0) {
    gantt.innerHTML = "<p>Nenhuma atividade para este fornecedor</p>";
    return;
  }

  renderizarBarras(data);
}

/* =========================================================
   RENDERIZAÇÃO SIMPLES DAS BARRAS
   (estrutura correta para evoluir para Gantt real)
========================================================= */
function renderizarBarras(atividades) {
  atividades.forEach(item => {
    const bar = document.createElement("div");
    bar.className = "bar plan";

    bar.innerText =
      `PLAN - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

    // Placeholder visual (layout correto)
    bar.style.marginBottom = "12px";
    bar.style.padding = "8px 12px";
    bar.style.background = "#2563eb";
    bar.style.color = "#fff";
    bar.style.borderRadius = "6px";
    bar.style.fontSize = "13px";
    bar.style.width = "fit-content";

    gantt.appendChild(bar);
  });
}

/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  carregarFornecedores();
});
