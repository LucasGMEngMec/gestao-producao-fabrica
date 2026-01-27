console.log("JS carregado corretamente");

const supabase = window.createSupabaseClient(
  "https://dklmejmlovtcadlicnhu.supabase.co",
  "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At"
);

let PX_POR_DIA = 30;
const DATA_BASE = new Date("2026-01-01");
const TOTAL_DIAS = 220;
const LINHA_ALTURA = 30;

const gantt = document.getElementById("gantt");
const header = document.getElementById("gantt-header");
const leftBody = document.getElementById("gantt-left-body");
const fornecedorContainer = document.getElementById("fornecedor");

let registros = [];
let fornecedorAtual = null;

/* ================= UTIL ================= */
function diasEntre(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

/* ================= HEADER ================= */
function desenharHeader() {
  gantt.innerHTML = "";
  header.innerHTML = "";

  const largura = TOTAL_DIAS * PX_POR_DIA;
  gantt.style.width = `${largura}px`;
  header.style.width = `${largura}px`;

  for (let d = 0; d <= TOTAL_DIAS; d++) {
    const x = d * PX_POR_DIA;
    const line = document.createElement("div");
    line.className = "grid-line";
    line.style.left = `${x}px`;
    gantt.appendChild(line);
  }

  const hoje = new Date();
  const offsetHoje = diasEntre(DATA_BASE, hoje);
  if (offsetHoje >= 0 && offsetHoje <= TOTAL_DIAS) {
    const hojeLine = document.createElement("div");
    hojeLine.className = "today-line";
    hojeLine.style.left = `${offsetHoje * PX_POR_DIA}px`;
    gantt.appendChild(hojeLine);
  }
}

/* ================= FORNECEDOR ================= */
async function carregarFornecedor() {
  const { data } = await supabase.from("cronograma_estrutura").select("fornecedor");
  fornecedorContainer.innerHTML = "";

  [...new Set(data.map(d => d.fornecedor))].forEach((nome, i) => {
    const btn = document.createElement("button");
    btn.textContent = nome;
    btn.onclick = () => selecionarFornecedor(nome);
    fornecedorContainer.appendChild(btn);
    if (i === 0) selecionarFornecedor(nome);
  });
}

function selecionarFornecedor(nome) {
  fornecedorAtual = nome;
  document.querySelectorAll("#fornecedor button").forEach(b =>
    b.classList.toggle("active", b.textContent === nome)
  );
  carregarCronograma();
}

/* ================= LOAD ================= */
async function carregarCronograma() {
  const { data } = await supabase
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtual);

  registros = data || [];
  desenharHeader();
  renderizar();
}

/* ================= RENDER ================= */
function renderizar() {
  gantt.innerHTML = "";
  leftBody.innerHTML = "";

  registros.forEach((item, i) => {
    const baseRow = i * 3;

    renderLinhaEsquerda(item, baseRow, "PLAN");
    renderLinhaEsquerda(item, baseRow + 1, "REAL");
    renderLinhaEsquerda(item, baseRow + 2, "FORECAST");

    renderPlan(item, baseRow);
    renderReal(item, baseRow + 1);
    renderForecast(item, baseRow + 2);
  });
}

/* ================= COLUNAS FIXAS ================= */
function renderLinhaEsquerda(item, rowIndex, tipo) {
  let inicio = "", fim = "";

  if (tipo === "PLAN") {
    inicio = item.data_inicio_plan;
    fim = item.data_fim_plan;
  }
  if (tipo === "REAL") {
    inicio = item.data_inicio_real;
    fim = item.data_fim_real;
  }
  if (tipo === "FORECAST") {
    inicio = item.data_inicio_real;
    fim = item.data_fim_forecast;
  }

  const row = document.createElement("div");
  row.style.position = "absolute";
  row.style.top = `${rowIndex * LINHA_ALTURA}px`;
  row.style.height = `${LINHA_ALTURA}px`;
  row.style.display = "grid";
  row.style.gridTemplateColumns = "repeat(8, 1fr)";
  row.style.fontSize = "12px";
  row.style.alignItems = "center";
  row.style.borderBottom = "1px solid #e5e7eb";
  row.style.padding = "0 6px";

  row.innerHTML = `
    <div>${tipo}</div>
    <div>${item.obra}</div>
    <div>${item.instalacao}</div>
    <div>${item.estrutura}</div>
    <div contenteditable="true">${inicio || ""}</div>
    <div contenteditable="true">${fim || ""}</div>
    <div>${item.predecessora || ""}</div>
    <div>${item.sucessora || ""}</div>
  `;

  leftBody.appendChild(row);
}

/* ================= BARRAS ================= */
function criarBarra(tipo, inicio, fim, top, item) {
  const bar = document.createElement("div");
  bar.className = `bar ${tipo}`;
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${top}px`;
  bar.style.width = `${diasEntre(inicio, fim) * PX_POR_DIA}px`;
  bar.textContent = `${tipo.toUpperCase()} - ${item.instalacao} - ${item.estrutura}`;
  gantt.appendChild(bar);
}

function renderPlan(item, row) {
  if (item.data_inicio_plan && item.data_fim_plan)
    criarBarra("plan", new Date(item.data_inicio_plan), new Date(item.data_fim_plan), row * LINHA_ALTURA + 2, item);
}

function renderReal(item, row) {
  if (item.data_inicio_real && item.data_fim_real)
    criarBarra("real", new Date(item.data_inicio_real), new Date(item.data_fim_real), row * LINHA_ALTURA + 2, item);
}

function renderForecast(item, row) {
  if (item.data_inicio_real && item.data_fim_forecast)
    criarBarra("forecast", new Date(item.data_inicio_real), new Date(item.data_fim_forecast), row * LINHA_ALTURA + 2, item);
}

/* ================= ZOOM ================= */
document.querySelectorAll("[data-zoom]").forEach(btn => {
  btn.onclick = () => {
    PX_POR_DIA = Number(btn.dataset.zoom);
    document.querySelectorAll("[data-zoom]").forEach(b =>
      b.classList.toggle("active", b === btn)
    );
    desenharHeader();
    renderizar();
  };
});

/* ================= INIT ================= */
carregarFornecedor();
