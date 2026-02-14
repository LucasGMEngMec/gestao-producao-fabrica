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
let apontamentos = [];
let fornecedorAtual = null;

/* ================= UTIL ================= */

function diasEntre(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

function formatDateBR(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("pt-BR");
}

function formatISO(date) {
  return new Date(date).toISOString().slice(0, 10);
}

/* ================= HEADER COMPLETO ================= */

function desenharHeader() {

  header.innerHTML = "";
  gantt.innerHTML = "";

  const largura = TOTAL_DIAS * PX_POR_DIA;
  header.style.width = `${largura}px`;
  gantt.style.width = `${largura}px`;

  const mesesDiv = document.createElement("div");
  const diasDiv = document.createElement("div");

  mesesDiv.style.position = "absolute";
  diasDiv.style.position = "absolute";
  mesesDiv.style.top = "0px";
  mesesDiv.style.height = "30px";
  diasDiv.style.top = "30px";
  diasDiv.style.height = "30px";

  header.appendChild(mesesDiv);
  header.appendChild(diasDiv);

  let pesoDia = {};

  registros.forEach(r => {
    if (!r.data_inicio_plan || !r.data_fim_plan || !r.peso_total) return;

    const ini = new Date(r.data_inicio_plan);
    const fim = new Date(r.data_fim_plan);
    const dur = diasEntre(ini, fim) + 1;
    const peso = r.peso_total / dur;

    for (let d = new Date(ini); d <= fim; d.setDate(d.getDate() + 1)) {
      const key = formatISO(d);
      pesoDia[key] = (pesoDia[key] || 0) + peso;
    }
  });

  let mesAtual = null;
  let inicioMesX = 0;
  let diasMes = 0;
  let pesoMes = 0;
  let refMes = null;

  for (let i = 0; i <= TOTAL_DIAS; i++) {

    const data = new Date(DATA_BASE);
    data.setDate(data.getDate() + i);
    const x = i * PX_POR_DIA;
    const key = formatISO(data);

    const line = document.createElement("div");
    line.className = "grid-line";
    line.style.left = `${x}px`;
    gantt.appendChild(line);

    const day = document.createElement("div");
    day.style.position = "absolute";
    day.style.left = `${x}px`;
    day.style.width = `${PX_POR_DIA}px`;
    day.style.textAlign = "center";
    day.style.fontSize = "10px";
    day.innerHTML = `
      <div>${data.getDate()}</div>
      <div style="font-size:9px;color:#64748b">
        ${((pesoDia[key] || 0) / 1000).toFixed(2)}t
      </div>
    `;

    const diaSemana = data.getDay();
    if (diaSemana === 6) day.style.background = "#fef3c7";
    if (diaSemana === 0) day.style.background = "#fee2e2";

    diasDiv.appendChild(day);

    if (mesAtual !== data.getMonth()) {
      if (mesAtual !== null) {
        criarMes(mesesDiv, inicioMesX, diasMes, pesoMes, refMes);
      }
      mesAtual = data.getMonth();
      inicioMesX = x;
      diasMes = 0;
      pesoMes = 0;
      refMes = new Date(data);
    }

    pesoMes += pesoDia[key] || 0;
    diasMes++;
  }

  criarMes(mesesDiv, inicioMesX, diasMes, pesoMes, refMes);
}

function criarMes(container, x, dias, peso, ref) {
  const m = document.createElement("div");
  m.style.position = "absolute";
  m.style.left = `${x}px`;
  m.style.width = `${dias * PX_POR_DIA}px`;
  m.style.textAlign = "center";
  m.style.fontWeight = "600";
  m.style.fontSize = "11px";
  m.textContent =
    `${ref.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })} | ${(peso / 1000).toFixed(1)}t`;

  container.appendChild(m);
}

/* ================= REAL ================= */

function calcularReal(item) {

  const apont = apontamentos.filter(a => a.estrutura === item.estrutura);

  if (!apont.length) return { inicio: null, fim: null };

  apont.sort((a, b) => new Date(a.data) - new Date(b.data));

  const inicio = apont[0].data;
  const total = apont.reduce((s, a) => s + a.peso, 0);

  if (total >= item.peso_total)
    return { inicio, fim: apont[apont.length - 1].data };

  return { inicio, fim: formatISO(new Date()) };
}

/* ================= FORECAST ================= */

function calcularForecast(item, real) {

  if (!real.inicio) return { inicio: null, fim: null };

  if (real.fim && real.fim !== formatISO(new Date()))
    return { inicio: real.inicio, fim: real.fim };

  const diasExec = diasEntre(real.inicio, new Date()) + 1;

  const apont = apontamentos.filter(a => a.estrutura === item.estrutura);
  const total = apont.reduce((s, a) => s + a.peso, 0);

  if (!total) return { inicio: real.inicio, fim: item.data_fim_plan };

  const media = total / diasExec;
  const diasRest = Math.ceil((item.peso_total - total) / media);

  const fimPrev = new Date();
  fimPrev.setDate(fimPrev.getDate() + diasRest);

  return { inicio: real.inicio, fim: formatISO(fimPrev) };
}

/* ================= DEPENDÊNCIAS ================= */

function aplicarDependencias(){

  registros.forEach(item => {

    if(!item.predecessora) return;

    const preds = item.predecessora
      .split(",")
      .map(p => parseInt(p.trim()))
      .filter(p => !isNaN(p));

    if(!preds.length) return;

    let maiorFim = null;

    preds.forEach(idPred => {

      const predItem = registros.find(r => r._id === idPred);

      if(!predItem || !predItem.data_fim_plan) return;

      const fimPred = new Date(predItem.data_fim_plan);

      if(!maiorFim || fimPred > maiorFim){
        maiorFim = fimPred;
      }
    });

    if(!maiorFim) return;

    const gap = Number(item.gap) || 0;

    const novaDataInicio = new Date(maiorFim);
    novaDataInicio.setDate(novaDataInicio.getDate() + gap);

    const dur = diasEntre(item.data_inicio_plan, item.data_fim_plan);

    const novaDataFim = new Date(novaDataInicio);
    novaDataFim.setDate(novaDataFim.getDate() + dur);

    item.data_inicio_plan = formatISO(novaDataInicio);
    item.data_fim_plan = formatISO(novaDataFim);

  });

}

/* ================= RENDER ================= */

function renderizar() {
    aplicarDependencias();

  gantt.innerHTML = "";
  leftBody.innerHTML = "";

  registros.forEach((item, index) => {

    const idUnico = index + 1;
    const base = index * 3;

    const real = calcularReal(item);
    const forecast = calcularForecast(item, real);

    renderLinha(item, base, "PLAN", idUnico, item.data_inicio_plan, item.data_fim_plan);
    renderLinha(item, base + 1, "REAL", idUnico, real.inicio, real.fim);
    renderLinha(item, base + 2, "FORECAST", idUnico, forecast.inicio, forecast.fim);

    criarBarra("plan", item.data_inicio_plan, item.data_fim_plan, base, item, true);
    criarBarra("real", real.inicio, real.fim, base + 1, item);
    criarBarra("forecast", forecast.inicio, forecast.fim, base + 2, item);

    const line = document.createElement("div");
    line.style.position = "absolute";
    line.style.top = `${(base + 3) * LINHA_ALTURA}px`;
    line.style.left = "0px";
    line.style.width = "100%";
    line.style.height = "1px";
    line.style.background = "#f1f5f9";

    gantt.appendChild(line);
  });

  gantt.style.height = `${registros.length * 3 * LINHA_ALTURA}px`;
}

/* ================= COLUNA FIXA ================= */

function renderLinha(item, row, tipo, id, inicio, fim) {

  const dur = (inicio && fim) ? diasEntre(inicio, fim) + 1 : "";

  const div = document.createElement("div");
  div.style.position = "absolute";
  div.style.top = `${row * LINHA_ALTURA}px`;
  div.style.height = `${LINHA_ALTURA}px`;
  div.style.display = "grid";
  div.style.gridTemplateColumns =
    "40px 55px 100px 100px 100px 80px 80px 60px 55px 55px";
  div.style.fontSize = "10px";
  div.style.alignItems = "center";
  div.style.borderBottom = "1px solid #e5e7eb";

  div.innerHTML = `
    <div>${id}</div>
    <div>${tipo}</div>
    <div>${item.obra || ""}</div>
    <div>${item.instalacao || ""}</div>
    <div>${item.estrutura || ""}</div>
    <div>${formatDateBR(inicio)}</div>
    <div>${formatDateBR(fim)}</div>
    <div>${dur}</div>
    <div contenteditable data-field="pred">${item.predecessora || ""}</div>
    <div contenteditable data-field="gap">${item.gap || ""}</div>
  `;

  div.querySelectorAll("[data-field]").forEach(el => {
    el.onblur = () => {
      if (el.dataset.field === "pred") {
        item.predecessora = el.textContent.trim();
      }
      if (el.dataset.field === "gap") {
        item.gap = Number(el.textContent.trim()) || 0;
      }
      renderizar();
    };
  });

  leftBody.appendChild(div);
}

/* ================= BARRAS ================= */

function criarBarra(tipo, inicio, fim, row, item, drag = false) {

  if (!inicio || !fim) return;

  const bar = document.createElement("div");
  bar.className = `bar ${tipo}`;
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${row * LINHA_ALTURA + 2}px`;
  bar.style.width = `${(diasEntre(inicio, fim) + 1) * PX_POR_DIA}px`;

  bar.textContent =
    `${tipo.toUpperCase()} - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

  if (drag) ativarDrag(bar, item);

  gantt.appendChild(bar);
}

/* ================= DRAG ================= */

function ativarDrag(bar, item) {

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
      novaFim.setDate(novaFim.getDate() + dur);

      item.data_inicio_plan = formatISO(novaIni);
      item.data_fim_plan = formatISO(novaFim);

      renderizar();
    };
  };
}

/* ================= FORNECEDOR ================= */

async function carregarFornecedor() {

  const { data } = await supabase
    .from("cronograma_estrutura")
    .select("fornecedor");

  if (!data || !data.length) return;

  fornecedorContainer.innerHTML = "";

  const unicos = [...new Set(data.map(d => d.fornecedor))];

  unicos.forEach((nome, i) => {

    const btn = document.createElement("button");
    btn.textContent = nome;

    btn.onclick = () => {
      fornecedorAtual = nome;
      document.querySelectorAll("#fornecedor button")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      carregarCronograma();
    };

    fornecedorContainer.appendChild(btn);

    if (i === 0) {
      fornecedorAtual = nome;
      btn.classList.add("active");
    }
  });

  carregarCronograma();
}

/* ================= LOAD ================= */

async function carregarCronograma() {

  const { data } = await supabase
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtual);

  const { data: ap } = await supabase
    .from("apontamentos")
    .select("*");

  registros = data || [];
  apontamentos = ap || [];

  registros.forEach((item, index) => {
    item._id = index + 1;
  });

  desenharHeader();
  renderizar();
}

/* ================= INIT ================= */

carregarFornecedor();
