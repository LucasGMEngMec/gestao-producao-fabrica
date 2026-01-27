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
const LINHA_ALTURA = 60;

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

  let pesoPorDia = {};

  registros.forEach(r => {
    if (!r.data_inicio_plan || !r.data_fim_plan || !r.peso_total) return;

    const ini = new Date(r.data_inicio_plan);
    const fim = new Date(r.data_fim_plan);

    for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) {
      const key = d.toISOString().slice(0, 10);
      pesoPorDia[key] = (pesoPorDia[key] || 0) + r.peso_total;
    }
  });

  let mesAtual = null;
  let pesoMes = 0;
  let inicioMesX = 0;
  let diasNoMes = 0;

  for (let d = 0; d <= TOTAL_DIAS; d++) {
    const x = d * PX_POR_DIA;
    const data = new Date(DATA_BASE);
    data.setDate(data.getDate() + d);
    const dataKey = data.toISOString().slice(0, 10);

    const line = document.createElement("div");
    line.className = "grid-line";
    line.style.left = `${x}px`;
    gantt.appendChild(line);

    const day = document.createElement("div");
    day.className = "day-label";
    day.style.left = `${x}px`;
    day.innerHTML = `
      ${data.getDate()}
      <div style="font-size:10px;color:#64748b">
        ${((pesoPorDia[dataKey] || 0) / 1000).toFixed(1)} t
      </div>
    `;

    const diaSemana = data.getDay();
    if (diaSemana === 6) day.style.color = "#eab308";
    if (diaSemana === 0) day.style.color = "#dc2626";

    header.appendChild(day);

    if (mesAtual !== data.getMonth()) {
      if (mesAtual !== null) {
        const month = document.createElement("div");
        month.className = "month-label";
        month.style.left = `${inicioMesX}px`;
        month.style.width = `${diasNoMes * PX_POR_DIA}px`;
        month.textContent = `${new Date(data.getFullYear(), mesAtual).toLocaleDateString("pt-BR", {
          month: "short",
          year: "numeric"
        })} | ${(pesoMes / 1000).toFixed(1)} t`;
        header.appendChild(month);
      }

      mesAtual = data.getMonth();
      pesoMes = 0;
      inicioMesX = x;
      diasNoMes = 0;
    }

    pesoMes += pesoPorDia[dataKey] || 0;
    diasNoMes++;
  }
}

/* ================= FORNECEDOR ================= */
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

/* ================= LOAD DATA ================= */
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

/* ================= PLAN ================= */
function renderPlan(item, index) {
  if (!item.data_inicio_plan || !item.data_fim_plan) return;

  const inicio = new Date(item.data_inicio_plan);
  const fim = new Date(item.data_fim_plan);
  const dur = diasEntre(inicio, fim);

  const bar = document.createElement("div");
  bar.className = "bar plan";
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${index * LINHA_ALTURA + 4}px`;
  bar.style.width = `${dur * PX_POR_DIA}px`;
  bar.textContent = `PLAN - ${item.instalacao} - ${item.estrutura}`;

  bar.onmousedown = e => dragPlan(bar, item, e);
  bar.ondblclick = () => abrirModal(item, "PLAN");

  gantt.appendChild(bar);
}

/* ================= REAL ================= */
function renderReal(item, index) {
  const ap = apontamentos.filter(a =>
    a.obra === item.obra &&
    a.instalacao === item.instalacao &&
    a.estrutura === item.estrutura
  );
  if (!ap.length) return;

  const datas = ap.map(a => new Date(a.data));
  const inicio = new Date(Math.min(...datas));
  const fim = new Date(Math.max(...datas));

  const bar = document.createElement("div");
  bar.className = "bar real";
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${index * LINHA_ALTURA + 22}px`;
  bar.style.width = `${Math.max(1, diasEntre(inicio, fim)) * PX_POR_DIA}px`;
  bar.textContent = `REAL - ${item.instalacao} - ${item.estrutura}`;

  bar.ondblclick = () => abrirModal(item, "REAL", { inicio, fim });
  gantt.appendChild(bar);
}

/* ================= FORECAST ================= */
function renderForecast(item, index) {
  const ap = apontamentos.filter(a =>
    a.obra === item.obra &&
    a.instalacao === item.instalacao &&
    a.estrutura === item.estrutura
  );
  if (!ap.length) return;

  const datas = ap.map(a => new Date(a.data));
  const inicioReal = new Date(Math.min(...datas));
  const durPlan = diasEntre(new Date(item.data_inicio_plan), new Date(item.data_fim_plan));

  const bar = document.createElement("div");
  bar.className = "bar forecast";
  bar.style.left = `${diasEntre(DATA_BASE, inicioReal) * PX_POR_DIA}px`;
  bar.style.top = `${index * LINHA_ALTURA + 40}px`;
  bar.style.width = `${durPlan * PX_POR_DIA}px`;
  bar.textContent = `FORECAST - ${item.instalacao} - ${item.estrutura}`;

  bar.ondblclick = () =>
    abrirModal(item, "FORECAST", {
      inicio: inicioReal,
      fim: new Date(inicioReal.getTime() + durPlan * 86400000)
    });

  gantt.appendChild(bar);
}

/* ================= MODAL ================= */
function abrirModal(item, tipo, datas = {}) {
  modalContent.innerHTML = `
    <h3>${tipo} - ${item.instalacao} - ${item.estrutura}</h3>
    <p><b>Fornecedor:</b> ${item.fornecedor}</p>
    <p><b>Peso total:</b> ${item.peso_total || 0} kg</p>
    <p><b>Início:</b> ${datas.inicio ? datas.inicio.toISOString().slice(0,10) : item.data_inicio_plan}</p>
    <p><b>Fim:</b> ${datas.fim ? datas.fim.toISOString().slice(0,10) : item.data_fim_plan}</p>
    <br>
    <button onclick="modal.style.display='none'">Fechar</button>
  `;
  modal.style.display = "flex";
}

/* ================= INIT ================= */
carregarFornecedor();
