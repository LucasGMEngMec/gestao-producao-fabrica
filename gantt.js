/*************************************************
 * SUPABASE (CLIENTE ÚNICO)
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";

if (!window.__SUPABASE__) {
  window.__SUPABASE__ = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
const sb = window.__SUPABASE__;

/*************************************************
 * CONFIGURAÇÃO GERAL
 *************************************************/
const DAY_WIDTH = 48;
const TOTAL_DAYS = 210;

/*************************************************
 * ELEMENTOS
 *************************************************/
const gantt = document.getElementById("gantt");

/*************************************************
 * UTILITÁRIOS
 *************************************************/
const parseDate = d => new Date(d + "T00:00:00");
const diffDays = (a, b) => Math.round((b - a) / 86400000);

/*************************************************
 * VARIÁVEIS
 *************************************************/
let itens = [];
let baseDate;

/*************************************************
 * CARREGAR DADOS
 *************************************************/
async function carregar() {
  gantt.innerHTML = "";

  const { data, error } = await sb
    .from("cronograma_estrutura")
    .select("*")
    .order("ordem_prioridade", { ascending: true });

  if (error) {
    console.error(error);
    alert("Erro ao carregar dados");
    return;
  }

  itens = data || [];

  baseDate = new Date();
  itens.forEach(i => {
    if (i.data_inicio_plan) {
      const d = parseDate(i.data_inicio_plan);
      if (d < baseDate) baseDate = d;
    }
  });

  renderCabecalho();
  renderLinhas();
  renderHoje();
}

/*************************************************
 * CABEÇALHO FIXO (ANO / MÊS / DIA)
 *************************************************/
function renderCabecalho() {
  const header = document.createElement("div");
  header.className = "gantt-header";

  const rowYear = document.createElement("div");
  const rowMonth = document.createElement("div");
  const rowDay = document.createElement("div");

  rowYear.className = rowMonth.className = rowDay.className = "header-row";

  let currentYear = null;
  let currentMonth = null;

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);

    // DIA
    const day = document.createElement("div");
    day.className = "day";
    day.style.width = DAY_WIDTH + "px";
    day.innerText = d.getDate();
    rowDay.appendChild(day);

    // MÊS
    if (d.getMonth() !== currentMonth) {
      currentMonth = d.getMonth();
      const m = document.createElement("div");
      m.className = "month";
      m.innerText = d.toLocaleString("pt-BR", { month: "short" });
      m.style.width = DAY_WIDTH + "px";
      rowMonth.appendChild(m);
    } else {
      rowMonth.lastChild.style.width =
        parseInt(rowMonth.lastChild.style.width) + DAY_WIDTH + "px";
    }

    // ANO
    if (d.getFullYear() !== currentYear) {
      currentYear = d.getFullYear();
      const y = document.createElement("div");
      y.className = "year";
      y.innerText = currentYear;
      y.style.width = DAY_WIDTH + "px";
      rowYear.appendChild(y);
    } else {
      rowYear.lastChild.style.width =
        parseInt(rowYear.lastChild.style.width) + DAY_WIDTH + "px";
    }
  }

  header.appendChild(rowYear);
  header.appendChild(rowMonth);
  header.appendChild(rowDay);
  gantt.appendChild(header);
}

/*************************************************
 * LINHAS E BARRAS
 *************************************************/
function renderLinhas() {
  itens.forEach(item => {
    if (!item.data_inicio_plan || !item.duracao_planejada_dias) return;

    const row = document.createElement("div");
    row.className = "row";

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.innerText =
      `PLAN - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

    const inicio = parseDate(item.data_inicio_plan);
    bar.style.left = diffDays(baseDate, inicio) * DAY_WIDTH + "px";
    bar.style.width = item.duracao_planejada_dias * DAY_WIDTH + "px";

    habilitarDrag(bar, item);

    row.appendChild(bar);
    gantt.appendChild(row);
  });
}

/*************************************************
 * DRAG HORIZONTAL
 *************************************************/
function habilitarDrag(bar, item) {
  let startX, startLeft;

  bar.onmousedown = e => {
    startX = e.clientX;
    startLeft = parseInt(bar.style.left);

    document.onmousemove = ev => {
      bar.style.left = startLeft + (ev.clientX - startX) + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;
      const dias = Math.round(parseInt(bar.style.left) / DAY_WIDTH);
      const nova = new Date(baseDate);
      nova.setDate(nova.getDate() + dias);
      item.data_inicio_plan = nova.toISOString().slice(0, 10);
    };
  };
}

/*************************************************
 * MARCADOR DO DIA ATUAL
 *************************************************/
function renderHoje() {
  const hoje = diffDays(baseDate, new Date()) * DAY_WIDTH;

  const linha = document.createElement("div");
  linha.className = "today-line";
  linha.style.left = hoje + "px";

  gantt.appendChild(linha);
}

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", carregar);
