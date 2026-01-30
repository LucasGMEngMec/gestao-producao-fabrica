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
  header.style.height = "60px";
  header.style.position = "relative";

  /* ===== PESO DIÁRIO (DISTRIBUIÇÃO LINEAR - PLAN) ===== */
  let pesoPorDia = {};

  registros.forEach(r => {
    if (!r.data_inicio_plan || !r.data_fim_plan || !r.peso_total) return;

    const ini = new Date(r.data_inicio_plan);
    const fim = new Date(r.data_fim_plan);
    const duracao = diasEntre(ini, fim) + 1;
    const pesoDia = r.peso_total / duracao;

    for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      pesoPorDia[key] = (pesoPorDia[key] || 0) + pesoDia;
    }
  });

  /* ===== GRID VERTICAL ===== */
  for (let d = 0; d <= TOTAL_DIAS; d++) {
    const line = document.createElement("div");
    line.className = "grid-line";
    line.style.left = `${d * PX_POR_DIA}px`;
    gantt.appendChild(line);
  }

  /* ===== DIAS + MESES ===== */
  let mesAtual = null;
  let pesoMes = 0;
  let inicioMesX = 0;
  let diasMes = 0;
  let dataMesRef = null;

  for (let d = 0; d <= TOTAL_DIAS; d++) {
    const x = d * PX_POR_DIA;
    const data = new Date(DATA_BASE);
    data.setDate(data.getDate() + d);
    const dataKey = data.toISOString().slice(0, 10);

    /* ----- DIA ----- */
    const day = document.createElement("div");
    day.className = "day-label";
    day.style.left = `${x}px`;
    day.style.top = "28px";
    day.style.width = `${PX_POR_DIA}px`;
    day.style.textAlign = "center";
    day.innerHTML = `
      ${data.getDate()}
      <div style="font-size:10px;color:#64748b">
        ${((pesoPorDia[dataKey] || 0) / 1000).toFixed(2)} t
      </div>
    `;

    const diaSemana = data.getDay();
    if (diaSemana === 6) day.style.color = "#eab308";
    if (diaSemana === 0) day.style.color = "#dc2626";

    header.appendChild(day);

    /* ----- CONTROLE DE MÊS ----- */
    if (mesAtual !== data.getMonth()) {
      if (mesAtual !== null) {
        criarMes(header, inicioMesX, diasMes, pesoMes, dataMesRef);
      }
      mesAtual = data.getMonth();
      dataMesRef = new Date(data);
      pesoMes = 0;
      inicioMesX = x;
      diasMes = 0;
    }

    pesoMes += pesoPorDia[dataKey] || 0;
    diasMes++;
  }

  /* ----- FECHA ÚLTIMO MÊS ----- */
  criarMes(header, inicioMesX, diasMes, pesoMes, dataMesRef);

  /* ===== LINHA DO DIA ATUAL ===== */
  const hoje = new Date();
  const offsetHoje = diasEntre(DATA_BASE, hoje);
  if (offsetHoje >= 0 && offsetHoje <= TOTAL_DIAS) {
    const hojeLine = document.createElement("div");
    hojeLine.className = "today-line";
    hojeLine.style.left = `${offsetHoje * PX_POR_DIA}px`;
    gantt.appendChild(hojeLine);
  }
}

/* ===== LABEL DE MÊS ===== */
function criarMes(container, x, dias, peso, dataRef) {
  const month = document.createElement("div");
  month.className = "month-label";
  month.style.left = `${x}px`;
  month.style.top = "0";
  month.style.width = `${dias * PX_POR_DIA}px`;
  month.style.textAlign = "center";
  month.textContent =
    `${dataRef.toLocaleDateString("pt-BR", {
      month: "short",
      year: "numeric"
    })} | ${(peso / 1000).toFixed(2)} t`;

  container.appendChild(month);
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
    const base = i * 3;

    renderLinhaEsquerda(item, base, "PLAN");
    renderLinhaEsquerda(item, base + 1, "REAL");
    renderLinhaEsquerda(item, base + 2, "FORECAST");

    renderPlan(item, base);
    renderReal(item, base + 1);
    renderForecast(item, base + 2);
  });
}

/* ================= COLUNAS FIXAS ================= */
function renderLinhaEsquerda(item, row, tipo) {
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

  const rowDiv = document.createElement("div");
  rowDiv.style.position = "absolute";
  rowDiv.style.top = `${row * LINHA_ALTURA}px`;
  rowDiv.style.height = `${LINHA_ALTURA}px`;
  rowDiv.style.display = "grid";
  rowDiv.style.gridTemplateColumns = "repeat(8, 1fr)";
  rowDiv.style.fontSize = "12px";
  rowDiv.style.alignItems = "center";
  rowDiv.style.borderBottom = "1px solid #e5e7eb";
  rowDiv.style.padding = "0 6px";

  rowDiv.innerHTML = `
    <div>${tipo}</div>
    <div>${item.obra}</div>
    <div>${item.instalacao}</div>
    <div>${item.estrutura}</div>
    <div contenteditable="true">${inicio || ""}</div>
    <div contenteditable="true">${fim || ""}</div>
    <div contenteditable="true">${item.predecessora || ""}</div>
    <div contenteditable="true">${item.sucessora || ""}</div>
  `;

  leftBody.appendChild(rowDiv);
}

/* ================= BARRAS ================= */
function criarBarra(tipo, inicio, fim, row, item) {
  const bar = document.createElement("div");
  bar.className = `bar ${tipo}`;
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${row * LINHA_ALTURA + 2}px`;
  bar.style.width = `${diasEntre(inicio, fim) * PX_POR_DIA}px`;
  bar.textContent = `${tipo.toUpperCase()} - ${item.instalacao} - ${item.estrutura}`;
  gantt.appendChild(bar);
}

function renderPlan(item, row) {
  if (item.data_inicio_plan && item.data_fim_plan)
    criarBarra("plan", new Date(item.data_inicio_plan), new Date(item.data_fim_plan), row, item);
}

function renderReal(item, row) {
  if (item.data_inicio_real && item.data_fim_real)
    criarBarra("real", new Date(item.data_inicio_real), new Date(item.data_fim_real), row, item);
}

function renderForecast(item, row) {
  if (item.data_inicio_real && item.data_fim_forecast)
    criarBarra("forecast", new Date(item.data_inicio_real), new Date(item.data_fim_forecast), row, item);
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
