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
const toggleColunasBtn = document.getElementById("toggle-colunas");

/* ================= STATE ================= */
let registros = [];
let fornecedorAtual = null;
let colunasVisiveis = true;

/* ================= UTIL ================= */
function diasEntre(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}
function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

/* ================= HEADER ================= */
function desenharHeader() {
  gantt.innerHTML = "";
  header.innerHTML = "";

  gantt.style.position = "relative";

  const largura = TOTAL_DIAS * PX_POR_DIA;
  gantt.style.width = `${largura}px`;
  header.style.width = `${largura}px`;
  header.style.height = "70px";
  header.style.position = "relative";

  const meses = document.createElement("div");
  const dias = document.createElement("div");

  meses.style.position = dias.style.position = "absolute";
  meses.style.top = "0";
  meses.style.height = "30px";
  dias.style.top = "30px";
  dias.style.height = "40px";
  meses.style.width = dias.style.width = "100%";

  header.appendChild(meses);
  header.appendChild(dias);

  let pesoPorDia = {};

  registros.forEach(r => {
    if (!r.data_inicio_plan || !r.data_fim_plan || !r.peso_total) return;
    const ini = new Date(r.data_inicio_plan);
    const fim = new Date(r.data_fim_plan);
    const dur = diasEntre(ini, fim) + 1;
    const pesoDia = r.peso_total / dur;

    for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) {
      const k = formatDate(d);
      pesoPorDia[k] = (pesoPorDia[k] || 0) + pesoDia;
    }
  });

  let mesAtual = null, pesoMes = 0, inicioMesX = 0, diasMes = 0, refMes = null;

  for (let i = 0; i <= TOTAL_DIAS; i++) {
    const x = i * PX_POR_DIA;
    const data = new Date(DATA_BASE);
    data.setDate(data.getDate() + i);
    const key = formatDate(data);

    const day = document.createElement("div");
    day.style.position = "absolute";
    day.style.left = `${x}px`;
    day.style.width = `${PX_POR_DIA}px`;
    day.style.display = "flex";
    day.style.flexDirection = "column";
    day.style.alignItems = "center";
    day.style.fontSize = "11px";
    day.innerHTML = `
      <div>${data.getDate()}</div>
      <div style="font-size:10px;color:#64748b">
        ${((pesoPorDia[key] || 0) / 1000).toFixed(2)} t
      </div>
    `;
    dias.appendChild(day);

    if (mesAtual !== data.getMonth()) {
      if (mesAtual !== null) criarMes(meses, inicioMesX, diasMes, pesoMes, refMes);
      mesAtual = data.getMonth();
      refMes = new Date(data);
      inicioMesX = x;
      diasMes = 0;
      pesoMes = 0;
    }

    pesoMes += pesoPorDia[key] || 0;
    diasMes++;
  }

  criarMes(meses, inicioMesX, diasMes, pesoMes, refMes);
}

function criarMes(container, x, dias, peso, ref) {
  const m = document.createElement("div");
  m.style.position = "absolute";
  m.style.left = `${x}px`;
  m.style.width = `${dias * PX_POR_DIA}px`;
  m.style.textAlign = "center";
  m.style.fontWeight = "600";
  m.textContent =
    `${ref.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })} | ${(peso / 1000).toFixed(2)} t`;
  container.appendChild(m);
}

/* ================= RENDER ================= */
function renderizar() {
  gantt.innerHTML = "";
  leftBody.innerHTML = "";

  registros.forEach((item, i) => {
    const base = i * 3;

    renderLinhaEsquerda(item, base, "PLAN", i + 1);
    renderLinhaEsquerda(item, base + 1, "REAL", i + 1);
    renderLinhaEsquerda(item, base + 2, "FORECAST", i + 1);

    renderPlan(item, base);
    renderReal(item, base + 1);
    renderForecast(item, base + 2);
  });

  gantt.style.height = `${registros.length * 3 * LINHA_ALTURA}px`;
}

/* ================= COLUNAS FIXAS ================= */
function renderLinhaEsquerda(item, row, tipo, idVisual) {
  let inicio = "", fim = "";

  if (tipo === "PLAN") { inicio = item.data_inicio_plan; fim = item.data_fim_plan; }
  if (tipo === "REAL") { inicio = item.data_inicio_real; fim = item.data_fim_real || formatDate(new Date()); }
  if (tipo === "FORECAST") { inicio = item.data_inicio_real; fim = item.data_fim_forecast || item.data_fim_plan; }

  const duracao = inicio && fim ? diasEntre(inicio, fim) + 1 : "";

  const rowDiv = document.createElement("div");
  rowDiv.style.position = "absolute";
  rowDiv.style.top = `${row * LINHA_ALTURA}px`;
  rowDiv.style.height = `${LINHA_ALTURA}px`;
  rowDiv.style.display = "grid";
  rowDiv.style.gridTemplateColumns = colunasVisiveis
    ? "40px 60px repeat(7,1fr)"
    : "40px 60px";
  rowDiv.style.fontSize = "12px";
  rowDiv.style.alignItems = "center";
  rowDiv.style.borderBottom = "1px solid #e5e7eb";

  rowDiv.innerHTML = `
    <div>${idVisual}</div>
    <div>${tipo}</div>
    ${colunasVisiveis ? `
      <div>${item.obra}</div>
      <div>${item.instalacao}</div>
      <div>${item.estrutura}</div>
      <div contenteditable data-field="inicio">${inicio || ""}</div>
      <div contenteditable data-field="fim">${fim || ""}</div>
      <div>${duracao}</div>
      <div contenteditable>${item.predecessora || ""}</div>
      <div contenteditable>${item.sucessora || ""}</div>
    ` : ""}
  `;

  rowDiv.querySelectorAll("[data-field]").forEach(el => {
    el.onblur = () => {
      if (tipo === "PLAN") {
        if (el.dataset.field === "inicio") item.data_inicio_plan = el.textContent.trim();
        if (el.dataset.field === "fim") item.data_fim_plan = el.textContent.trim();
        desenharHeader();
        renderizar();
      }
    };
  });

  leftBody.appendChild(rowDiv);
}

/* ================= BARRAS ================= */
function criarBarra(tipo, inicio, fim, row, item, draggable = false) {
  const bar = document.createElement("div");
  bar.className = `bar ${tipo}`;
  bar.style.position = "absolute";
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${row * LINHA_ALTURA + 2}px`;
  bar.style.width = `${(diasEntre(inicio, fim) + 1) * PX_POR_DIA}px`;
  bar.textContent = `${tipo}`;

  if (draggable) habilitarDrag(bar, item);

  gantt.appendChild(bar);
}

function habilitarDrag(bar, item) {
  let startX;

  bar.onmousedown = e => {
    startX = e.clientX;
    document.onmousemove = ev => {
      const dx = ev.clientX - startX;
      bar.style.left = `${bar.offsetLeft + dx}px`;
      startX = ev.clientX;
    };
    document.onmouseup = () => {
      document.onmousemove = null;
      document.onmouseup = null;

      const dias = Math.round(bar.offsetLeft / PX_POR_DIA);
      const novaIni = new Date(DATA_BASE);
      novaIni.setDate(novaIni.getDate() + dias);
      const dur = diasEntre(item.data_inicio_plan, item.data_fim_plan);
      const novaFim = new Date(novaIni);
      novaFim.setDate(novaIni.getDate() + dur);

      item.data_inicio_plan = formatDate(novaIni);
      item.data_fim_plan = formatDate(novaFim);

      desenharHeader();
      renderizar();
    };
  };
}

function renderPlan(item, row) {
  if (item.data_inicio_plan && item.data_fim_plan)
    criarBarra("plan", new Date(item.data_inicio_plan), new Date(item.data_fim_plan), row, item, true);
}

function renderReal(item, row) {
  if (item.data_inicio_real)
    criarBarra("real", new Date(item.data_inicio_real),
      new Date(item.data_fim_real || new Date()), row, item);
}

function renderForecast(item, row) {
  if (item.data_inicio_real)
    criarBarra("forecast", new Date(item.data_inicio_real),
      new Date(item.data_fim_forecast || item.data_fim_plan), row, item);
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

/* ================= TOGGLE COLUNAS ================= */
if (toggleColunasBtn) {
  toggleColunasBtn.onclick = () => {
    colunasVisiveis = !colunasVisiveis;
    renderizar();
  };
}

/* ================= INIT ================= */
carregarFornecedor();
