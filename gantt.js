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
const LINHA_ALTURA = 60; // 🔹 aumentado para evitar sobreposição

/* ================= DOM ================= */
const gantt = document.getElementById("gantt");
const header = document.getElementById("gantt-header");
const fornecedorContainer = document.getElementById("fornecedor");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");

/* ================= STATE ================= */
let registros = [];
let apontamentos = [];
let fornecedorAtual = null;

/* ================= UTIL ================= */
function diasEntre(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

function dataPorOffset(offset) {
  const d = new Date(DATA_BASE);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

/* ================= HEADER / GRADE ================= */
function desenharHeader() {
  gantt.innerHTML = "";
  header.innerHTML = "";

  const largura = TOTAL_DIAS * PX_POR_DIA;
  gantt.style.width = `${largura}px`;
  header.style.width = `${largura}px`;

  const pesoPorDia = {};

  // 🔹 distribuir peso planejado por dia
  registros.forEach(r => {
    if (!r.data_inicio_plan || !r.data_fim_plan || !r.peso_total) return;

    const ini = new Date(r.data_inicio_plan);
    const fim = new Date(r.data_fim_plan);
    const dur = Math.max(1, diasEntre(ini, fim));
    const pesoDia = r.peso_total / dur;

    for (let i = 0; i < dur; i++) {
      const d = new Date(ini);
      d.setDate(d.getDate() + i);
      const key = d.toISOString().slice(0, 10);
      pesoPorDia[key] = (pesoPorDia[key] || 0) + pesoDia;
    }
  });

  let mesAtual = null;
  let pesoMes = 0;
  let inicioMesX = 0;

  for (let d = 0; d <= TOTAL_DIAS; d++) {
    const x = d * PX_POR_DIA;
    const data = new Date(DATA_BASE);
    data.setDate(data.getDate() + d);
    const dataISO = data.toISOString().slice(0, 10);

    const line = document.createElement("div");
    line.className = "grid-line";
    line.style.left = `${x}px`;
    gantt.appendChild(line);

    const day = document.createElement("div");
    day.className = "day-label";
    day.style.left = `${x}px`;
    day.textContent = data.getDate();

    const diaSemana = data.getDay();
    if (diaSemana === 6) day.style.color = "#eab308";
    if (diaSemana === 0) day.style.color = "#dc2626";

    // 🔹 peso diário (t)
    if (pesoPorDia[dataISO]) {
      const peso = document.createElement("div");
      peso.style.fontSize = "10px";
      peso.style.color = "#374151";
      peso.textContent = (pesoPorDia[dataISO] / 1000).toFixed(2) + " t";
      day.appendChild(document.createElement("br"));
      day.appendChild(peso);
    }

    header.appendChild(day);

    // 🔹 controle de mês
    const chaveMes = data.getFullYear() + "-" + data.getMonth();
    if (chaveMes !== mesAtual) {
      if (mesAtual !== null) {
        const month = document.createElement("div");
        month.className = "month-label";
        month.style.left = `${inicioMesX}px`;
        month.style.width = `${(x - inicioMesX)}px`;
        month.textContent =
          data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" }) +
          ` | ${(pesoMes / 1000).toFixed(1)} t`;
        header.appendChild(month);
      }
      mesAtual = chaveMes;
      inicioMesX = x;
      pesoMes = 0;
    }

    if (pesoPorDia[dataISO]) pesoMes += pesoPorDia[dataISO];
  }
}

/* ================= FORNECEDOR / LOAD ================= */
async function carregarFornecedor() {
  fornecedorContainer.innerHTML = "";

  const { data } = await supabase
    .from("cronograma_estrutura")
    .select("fornecedor");

  [...new Set(data.map(d => d.fornecedor).filter(Boolean))].forEach((nome, i) => {
    const btn = document.createElement("button");
    btn.className = "btn-filter";
    btn.textContent = nome;
    btn.onclick = () => selecionarFornecedor(nome);
    fornecedorContainer.appendChild(btn);
    if (i === 0) selecionarFornecedor(nome);
  });
}

function selecionarFornecedor(nome) {
  fornecedorAtual = nome;
  document.querySelectorAll(".btn-filter").forEach(b =>
    b.classList.toggle("active", b.textContent === nome)
  );
  carregarCronograma();
}

async function carregarCronograma() {
  const resPlan = await supabase
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtual);

  const resApont = await supabase
    .from("apontamentos")
    .select("*")
    .eq("fornecedor", fornecedorAtual);

  registros = resPlan.data || [];
  apontamentos = resApont.data || [];

  desenharHeader();
  renderizar();
}

/* ================= RENDER ================= */
function renderizar() {
  registros.forEach((item, i) => {
    renderPlan(item, i);
    renderReal(item, i);
    renderForecast(item, i);
  });
}

/* ================= BARRAS ================= */
function renderPlan(item, index) {
  if (!item.data_inicio_plan || !item.data_fim_plan) return;

  const inicio = new Date(item.data_inicio_plan);
  const fim = new Date(item.data_fim_plan);
  const dur = diasEntre(inicio, fim);

  const bar = document.createElement("div");
  bar.className = "bar plan";
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${index * LINHA_ALTURA + 6}px`;
  bar.style.width = `${dur * PX_POR_DIA}px`;
  bar.textContent = `PLAN - ${item.instalacao} - ${item.estrutura}`;

  bar.ondblclick = () => abrirModal(item, "PLAN");
  gantt.appendChild(bar);
}

function renderReal(item, index) {
  const ap = apontamentos.filter(a =>
    a.obra === item.obra &&
    a.instalacao === item.instalacao &&
    a.estrutura === item.estrutura
  );
  if (ap.length === 0) return;

  const datas = ap.map(a => new Date(a.data));
  const inicio = new Date(Math.min(...datas));
  const fim = new Date(Math.max(...datas));

  const bar = document.createElement("div");
  bar.className = "bar real";
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${index * LINHA_ALTURA + 26}px`;
  bar.style.width = `${Math.max(1, diasEntre(inicio, fim)) * PX_POR_DIA}px`;
  bar.textContent = `REAL - ${item.instalacao} - ${item.estrutura}`;

  bar.ondblclick = () => abrirModal(item, "REAL", { inicio, fim });
  gantt.appendChild(bar);
}

function renderForecast(item, index) {
  const ap = apontamentos.filter(a =>
    a.obra === item.obra &&
    a.instalacao === item.instalacao &&
    a.estrutura
