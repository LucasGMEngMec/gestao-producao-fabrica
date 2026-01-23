/*************************************************
 * SUPABASE
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/*************************************************
 * CONFIGURAÇÃO
 *************************************************/
const DAY_WIDTH = 42;
const RANGE_DAYS = 240;

/*************************************************
 * ELEMENTOS
 *************************************************/
const gantt = document.getElementById("gantt");

/*************************************************
 * UTIL
 *************************************************/
const parseDate = d => new Date(d + "T00:00:00");
const diffDays = (a, b) => Math.round((b - a) / 86400000);

/*************************************************
 * VARIÁVEIS
 *************************************************/
let itens = [];
let baseDate;

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", carregar);

/*************************************************
 * CARREGAR
 *************************************************/
async function carregar() {
  gantt.innerHTML = "";

  const { data, error } = await sb
    .from("cronograma_estrutura")
    .select("*")
    .order("ordem_prioridade");

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

  renderHeader();
  renderRows();
  renderTodayLine();
}

/*************************************************
 * HEADER (ANO / MÊS / DIA)
 *************************************************/
function renderHeader() {
  const header = document.createElement("div");
  header.className = "gantt-header";

  const rowYear = document.createElement("div");
  const rowMonth = document.createElement("div");
  const rowDay = document.createElement("div");

  rowYear.className = "header-row year";
  rowMonth.className = "header-row month";
  rowDay.className = "header-row day";

  let lastYear = null;
  let lastMonth = null;

  for (let i = 0; i < RANGE_DAYS; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);

    // DIA
    const day = document.createElement("div");
    day.className = "cell";
    day.style.width = DAY_WIDTH + "px";
    day.innerText = d.getDate();
    rowDay.appendChild(day);

    // MÊS
    if (d.getMonth() !== lastMonth) {
      lastMonth = d.getMonth();
      const m = document.createElement("div");
      m.className = "cell";
      m.style.width = DAY_WIDTH + "px";
      m.innerText = d.toLocaleString("pt-BR", { month: "short" });
      rowMonth.appendChild(m);
    } else {
      rowMonth.lastChild.style.width =
        parseInt(rowMonth.lastChild.style.width) + DAY_WIDTH + "px";
    }

    // ANO
    if (d.getFullYear() !== lastYear) {
      lastYear = d.getFullYear();
      const y = document.createElement("div");
      y.className = "cell";
      y.style.width = DAY_WIDTH + "px";
      y.innerText = lastYear;
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
 * ROWS + BARRAS
 *************************************************/
function renderRows() {
  itens.forEach(item => {
    if (!item.data_inicio_plan || !item.duracao_planejada_dias) return;

    const row = document.createElement("div");
    row.className = "gantt-row";

    const bar = document.createElement("div");
    bar.className = "gantt-bar";
    bar.innerText =
      `PLAN - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

    const inicio = parseDate(item.data_inicio_plan);
    bar.style.left = diffDays(baseDate, inicio) * DAY_WIDTH + "px";
    bar.style.width = item.duracao_planejada_dias * DAY_WIDTH + "px";

    enableDrag(bar, item);

    row.appendChild(bar);
    gantt.appendChild(row);
  });
}

/*************************************************
 * DRAG HORIZONTAL
 *************************************************/
function enableDrag(bar, item) {
  let startX, startLeft;

  bar.addEventListener("mousedown", e => {
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
  });
}

/*************************************************
 * LINHA DO DIA ATUAL
 *************************************************/
function renderTodayLine() {
  const hoje = diffDays(baseDate, new Date()) * DAY_WIDTH;

  const line = document.createElement("div");
  line.className = "today-line";
  line.style.left = hoje + "px";

  gantt.appendChild(line);
}
