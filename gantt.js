console.log("JS carregado corretamente");

/* =========================================================
   CONFIGURAÇÃO SUPABASE
========================================================= */
const SUPABASE_URL = "https://dkmejmlovtcadlichhu.supabase.co";
const SUPABASE_KEY = "SUA_CHAVE_PUBLICA_AQUI"; // anon public key

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* =========================================================
   ESTADO GLOBAL
========================================================= */
let fornecedorAtual = null;

/* =========================================================
   ELEMENTOS
========================================================= */
const gantt = document.getElementById("gantt");
const fornecedoresContainer = document.getElementById("fornecedores");

/* =========================================================
   CARREGAR FORNECEDORES (DINÂMICO)
========================================================= */
async function carregarFornecedores() {
  fornecedoresContainer.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("cronograma")
    .select("fornecedor");

  if (error) {
    console.error(error);
    alert("Erro ao carregar fornecedores");
    return;
  }

  const fornecedores = [...new Set(data.map(f => f.fornecedor))];

  if (fornecedores.length === 0) {
    fornecedoresContainer.innerHTML = "<span>Nenhum fornecedor encontrado</span>";
    return;
  }

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
   CARREGAR CRONOGRAMA FILTRADO
========================================================= */
async function carregarCronograma() {
  gantt.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("cronograma")
    .select("*")
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
   RENDERIZAR BARRAS (SIMPLIFICADO)
========================================================= */
function renderizarBarras(atividades) {
  atividades.forEach(item => {
    const bar = document.createElement("div");
    bar.className = "bar plan";

    bar.innerText =
      `${item.situacao} - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

    gantt.appendChild(bar);
  });
}

/* =========================================================
   INIT
========================================================= */
document.addEventListener("DOMContentLoaded", () => {
  carregarFornecedores();
});
