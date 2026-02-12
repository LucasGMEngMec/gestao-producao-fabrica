console.log("JS carregado corretamente");

/* ================= SUPABASE ================= */
const supabase = window.createSupabaseClient(
  "https://dklmejmlovtcadlicnhu.supabase.co",
  "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At"
);

/* ================= CONFIG ================= */
let PX_POR_DIA = 30;
const DATA_BASE = new Date("2026-01-01");
const TOTAL_DIAS = 220;
const LINHA_ALTURA = 30;

/* ================= DOM ================= */
const gantt = document.getElementById("gantt");
const header = document.getElementById("gantt-header");
const leftBody = document.getElementById("gantt-left-body");
const fornecedorContainer = document.getElementById("fornecedor");

/* ================= STATE ================= */
let registros = [];
let fornecedorAtual = null;

/* ================= UTIL ================= */
function diasEntre(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

/* ================= HEADER ================= */
function desenharHeader() {

  header.innerHTML = "";
  gantt.innerHTML = "";
  gantt.style.position = "relative";

  const largura = TOTAL_DIAS * PX_POR_DIA;
  header.style.width = `${largura}px`;
  gantt.style.width = `${largura}px`;
  header.style.height = "60px";
  header.style.position = "relative";

  for (let i = 0; i <= TOTAL_DIAS; i++) {

    const data = new Date(DATA_BASE);
    data.setDate(data.getDate() + i);
    const x = i * PX_POR_DIA;

    /* Grid vertical */
    const line = document.createElement("div");
    line.className = "grid-line";
    line.style.left = `${x}px`;
    gantt.appendChild(line);

    /* Dia */
    const day = document.createElement("div");
    day.style.position = "absolute";
    day.style.left = `${x}px`;
    day.style.width = `${PX_POR_DIA}px`;
    day.style.textAlign = "center";
    day.style.fontSize = "11px";
    day.innerHTML = `<div>${data.getDate()}</div>`;

    /* Destaque sábado e domingo */
    const diaSemana = data.getDay();
    if (diaSemana === 6) day.style.background = "#fef3c7"; // sábado amarelo
    if (diaSemana === 0) day.style.background = "#fee2e2"; // domingo vermelho

    header.appendChild(day);
  }
}

/* ================= RENDER ================= */
function renderizar() {

  gantt.innerHTML = "";
  leftBody.innerHTML = "";

  registros.forEach((item, index) => {

    const base = index * 3;
    const idVisual = index + 1;

    renderLinha(item, base, "PLAN", idVisual);
    renderLinha(item, base + 1, "REAL", idVisual);
    renderLinha(item, base + 2, "FORECAST", idVisual);

    renderPlan(item, base);
    renderReal(item, base + 1);
    renderForecast(item, base + 2);
  });

  gantt.style.height = `${registros.length * 3 * LINHA_ALTURA}px`;
}

/* ================= COLUNAS FIXAS ================= */
function renderLinha(item, row, tipo, idVisual) {

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

  const duracao = (inicio && fim) ? diasEntre(inicio, fim) + 1 : "";

  const rowDiv = document.createElement("div");
  rowDiv.style.position = "absolute";
  rowDiv.style.top = `${row * LINHA_ALTURA}px`;
  rowDiv.style.height = `${LINHA_ALTURA}px`;
  rowDiv.style.display = "grid";
  rowDiv.style.gridTemplateColumns = "40px 60px repeat(7,1fr)";
  rowDiv.style.fontSize = "12px";
  rowDiv.style.alignItems = "center";
  rowDiv.style.borderBottom = "1px solid #e5e7eb";

  rowDiv.innerHTML = `
    <div>${idVisual}</div>
    <div>${tipo}</div>
    <div>${item.obra || ""}</div>
    <div>${item.instalacao || ""}</div>
    <div>${item.estrutura || ""}</div>
    <div>${inicio || ""}</div>
    <div>${fim || ""}</div>
    <div>${duracao}</div>
    <div>${item.predecessora || ""}</div>
    <div>${item.sucessora || ""}</div>
  `;

  leftBody.appendChild(rowDiv);
}

/* ================= BARRAS ================= */
function criarBarra(tipo, inicio, fim, row, item) {

  if (!inicio || !fim) return;

  const bar = document.createElement("div");
  bar.className = `bar ${tipo}`;
  bar.style.position = "absolute";
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${row * LINHA_ALTURA + 2}px`;
  bar.style.width = `${(diasEntre(inicio, fim) + 1) * PX_POR_DIA}px`;

  bar.textContent = `${tipo} - ${item.instalacao || ""} - ${item.estrutura || ""}`;

  gantt.appendChild(bar);
}

function renderPlan(item, row) {
  criarBarra("plan", item.data_inicio_plan, item.data_fim_plan, row, item);
}

function renderReal(item, row) {
  criarBarra("real", item.data_inicio_real, item.data_fim_real, row, item);
}

function renderForecast(item, row) {
  criarBarra("forecast", item.data_inicio_real, item.data_fim_forecast, row, item);
}

/* ================= FORNECEDOR ================= */
async function carregarFornecedor() {

  const { data } = await supabase
    .from("cronograma_estrutura")
    .select("fornecedor");

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
  carregarCronograma();
}

async function carregarCronograma() {

  const { data } = await supabase
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtual);

  registros = data || [];

  desenharHeader();
  renderizar();
}

/* ================= INIT ================= */
carregarFornecedor();
