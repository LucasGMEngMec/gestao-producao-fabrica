/*************************************************
 * SUPABASE — CLIENTE ÚNICO GLOBAL (OBRIGATÓRIO)
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";

if (!window.__SUPABASE_CLIENT__) {
  window.__SUPABASE_CLIENT__ = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
  );
}

const sb = window.__SUPABASE_CLIENT__;

/*************************************************
 * ELEMENTOS
 *************************************************/
const ganttEl = document.getElementById("gantt");
const btnSalvar = document.getElementById("btnSalvar");

/*************************************************
 * CONFIGURAÇÕES
 *************************************************/
const DAY_WIDTH = 50;          // maior para facilitar drag
const TOTAL_DAYS = 180;

/*************************************************
 * VARIÁVEIS
 *************************************************/
let itens = [];
let dataBase;

/*************************************************
 * UTIL
 *************************************************/
function parseDate(d) {
  if (!d) return null;
  return new Date(d + "T00:00:00");
}

function diffDays(a, b) {
  return Math.round((b - a) / 86400000);
}

function formatLabel(item) {
  return `PLAN - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;
}

/*************************************************
 * CARREGAR DADOS
 *************************************************/
async function carregar() {
  ganttEl.innerHTML = "";

  const { data, error } = await sb
    .from("cronograma_estrutura")
    .select("*")
    .order("ordem_prioridade", { ascending: true });

  if (error) {
    console.error(error);
    alert("Erro ao carregar dados");
    return;
  }

  itens = data;

  dataBase = new Date();
  itens.forEach(i => {
    const d = parseDate(i.data_inicio_plan);
    if (d && d < dataBase) dataBase = d;
  });

  criarTimeline();
  itens.forEach(renderBarra);
  marcarHoje();
}

/*************************************************
 * TIMELINE
 *************************************************/
function criarTimeline() {
  const timeline = document.createElement("div");
  timeline.className = "timeline";

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = new Date(dataBase);
    d.setDate(d.getDate() + i);

    const day = document.createElement("div");
    day.className = "day";
    day.innerHTML = `<div>${d.getDate()}</div>`;

    timeline.appendChild(day);
  }

  ganttEl.appendChild(timeline);
}

/*************************************************
 * BARRAS
 *************************************************/
function renderBarra(item) {
  if (!item.data_inicio_plan || !item.duracao_planejada_dias) return;

  const row = document.createElement("div");
  row.className = "row";

  const area = document.createElement("div");
  area.className = "bar-area";

  const bar = document.createElement("div");
  bar.className = "bar plan";
  bar.innerText = formatLabel(item);

  const inicio = parseDate(item.data_inicio_plan);
  const left = diffDays(dataBase, inicio) * DAY_WIDTH;

  bar.style.left = `${left}px`;
  bar.style.width = `${item.duracao_planejada_dias * DAY_WIDTH}px`;

  dragBar(bar, item);

  area.appendChild(bar);
  row.appendChild(area);
  ganttEl.appendChild(row);
}

/*************************************************
 * DRAG
 *************************************************/
function dragBar(bar, item) {
  let startX;
  let startLeft;

  bar.onmousedown = e => {
    startX = e.clientX;
    startLeft = parseInt(bar.style.left, 10);

    document.onmousemove = ev => {
      const delta = ev.clientX - startX;
      bar.style.left = startLeft + delta + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;
      document.onmouseup = null;

      const dias = Math.round(parseInt(bar.style.left, 10) / DAY_WIDTH);
      const novaData = new Date(dataBase);
      novaData.setDate(novaData.getDate() + dias);

      item.data_inicio_plan = novaData.toISOString().slice(0, 10);
    };
  };
}

/*************************************************
 * HOJE
 *************************************************/
function marcarHoje() {
  const hoje = new Date();
  const pos = diffDays(dataBase, hoje) * DAY_WIDTH;

  const linha = document.createElement("div");
  linha.className = "today-line";
  linha.style.left = pos + "px";

  ganttEl.appendChild(linha);
}

/*************************************************
 * SALVAR
 *************************************************/
btnSalvar.onclick = async () => {
  for (const i of itens) {
    await sb
      .from("cronograma_estrutura")
      .update({
        data_inicio_plan: i.data_inicio_plan
      })
      .eq("id", i.id);
  }
  alert("Cronograma salvo");
};

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", carregar);
