/*************************************************
 * SUPABASE CLIENTE ÚNICO
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";

if (!window.__SB__) {
  window.__SB__ = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
const sb = window.__SB__;

/*************************************************
 * CONFIG
 *************************************************/
const DAY_WIDTH = 48;
const TOTAL_DAYS = 180;

let fornecedor = "BDR";
let itens = [];
let baseDate;

/*************************************************
 * ELEMENTOS
 *************************************************/
const gantt = document.getElementById("gantt");
const btnSalvar = document.getElementById("btnSalvar");
const btnBDR = document.getElementById("btnBDR");
const btnBJ = document.getElementById("btnBJ");

/*************************************************
 * UTIL
 *************************************************/
const parse = d => new Date(d + "T00:00:00");
const diff = (a, b) => Math.round((b - a) / 86400000);

/*************************************************
 * LOAD
 *************************************************/
async function carregar() {
  gantt.innerHTML = "";

  const { data } = await sb
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedor)
    .order("ordem_prioridade");

  itens = data || [];

  baseDate = new Date();
  itens.forEach(i => {
    const d = parse(i.data_inicio_plan);
    if (d < baseDate) baseDate = d;
  });

  criarCabecalho();
  itens.forEach(renderLinha);
  linhaHoje();
}

/*************************************************
 * CABEÇALHO
 *************************************************/
function criarCabecalho() {
  const header = document.createElement("div");
  header.className = "header-row";

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);

    const cell = document.createElement("div");
    cell.className = "day";
    cell.innerHTML = `<div>${d.getDate()}</div>`;
    header.appendChild(cell);
  }

  gantt.appendChild(header);
}

/*************************************************
 * LINHAS
 *************************************************/
function renderLinha(item) {
  if (!item.data_inicio_plan) return;

  const row = document.createElement("div");
  row.className = "row";

  const bar = document.createElement("div");
  bar.className = "bar";
  bar.innerText = `PLAN - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

  const start = parse(item.data_inicio_plan);
  bar.style.left = diff(baseDate, start) * DAY_WIDTH + "px";
  bar.style.width = item.duracao_planejada_dias * DAY_WIDTH + "px";

  drag(bar, item);

  row.appendChild(bar);
  gantt.appendChild(row);
}

/*************************************************
 * DRAG
 *************************************************/
function drag(bar, item) {
  let startX, startLeft;

  bar.onmousedown = e => {
    startX = e.clientX;
    startLeft = parseInt(bar.style.left);

    document.onmousemove = ev => {
      bar.style.left = startLeft + (ev.clientX - startX) + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;
      document.onmouseup = null;

      const dias = Math.round(parseInt(bar.style.left) / DAY_WIDTH);
      const nova = new Date(baseDate);
      nova.setDate(nova.getDate() + dias);
      item.data_inicio_plan = nova.toISOString().slice(0, 10);
    };
  };
}

/*************************************************
 * HOJE
 *************************************************/
function linhaHoje() {
  const pos = diff(baseDate, new Date()) * DAY_WIDTH;
  const l = document.createElement("div");
  l.className = "today-line";
  l.style.left = pos + "px";
  gantt.appendChild(l);
}

/*************************************************
 * FILTROS
 *************************************************/
btnBDR.onclick = () => {
  fornecedor = "BDR";
  btnBDR.classList.add("active");
  btnBJ.classList.remove("active");
  carregar();
};

btnBJ.onclick = () => {
  fornecedor = "BJ";
  btnBJ.classList.add("active");
  btnBDR.classList.remove("active");
  carregar();
};

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", carregar);
