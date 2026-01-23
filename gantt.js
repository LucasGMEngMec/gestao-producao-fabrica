/*************************************************
 * SUPABASE
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

/*************************************************
 * CONFIG
 *************************************************/
const DAY_WIDTH = 42;
const RANGE_DAYS = 240;

/*************************************************
 * DOM
 *************************************************/
const gantt = document.getElementById("gantt");

/*************************************************
 * UTILS
 *************************************************/
const parseDate = d => new Date(d + "T00:00:00");
const diffDays = (a, b) => Math.round((b - a) / 86400000);

/*************************************************
 * STATE
 *************************************************/
let itens = [];
let baseDate;

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", carregar);

/*************************************************
 * LOAD
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

  renderHeader();
  renderBody();
  renderTodayLine();
}

/*************************************************
 * HEADER
 *************************************************/
function renderHeader() {
  const header = document.createElement("div");
  header.className = "gantt-header";

  const yearRow = document.createElement("div");
  const monthRow = document.createElement("div");
  const dayRow = document.createElement("div");

  yearRow.className = "header-row";
  monthRow.className = "header-row";
  dayRow.className = "header-row";

  let lastYear = null;
  let lastMonth = null;

  for (let i = 0; i < RANGE_DAYS; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);

    // DAY
    const day = document.createElement("div");
    day.className = "cell";
    day.style.width = DAY_WIDTH + "px";
    day.innerText = d.getDate();
    dayRow.appendChild(day);

    // MONTH
    if (d.getMonth() !== lastMonth) {
      lastMonth = d.getMonth();
      const m = document.createElement("div");
      m.className = "cell";
      m.style.width = DAY_WIDTH + "px";
      m.innerText = d.toLocaleString("pt-BR", { month: "short" });
      monthRow.appendChild(m);
    } else {
      monthRow.lastChild.style.width =
        parseInt(monthRow.lastChild.style.width) + DAY_WIDTH + "px";
    }

    // YEAR
    if (d.getFullYear() !== lastYear) {
      lastYear = d.getFullYear();
      const y = document.createElement("div");
      y.className = "cell";
      y.style.width = DAY_WIDTH + "px";
      y.innerText = lastYear;
      yearRow.appendChild(y);
    } else {
      yearRow.lastChild.style.width =
        parseInt(yearRow.lastChild.style.width) + DAY_WIDTH + "px";
    }
  }

  header.appendChild(yearRow);
  header.appendChild(monthRow);
  header.appendChild(dayRow);
  gantt.appendChild(header);
}

/*************************************************
 * BODY + BARS
 *************************************************/
function renderBody() {
  const body = document.createElement("div");
  body.className = "gantt-body";

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
    body.appendChild(row);
  });

  gantt.appendChild(body);
}

/*************************************************
 * DRAG
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
 * TODAY LINE
 *************************************************/
function renderTodayLine() {
  const pos = diffDays(baseDate, new Date()) * DAY_WIDTH;

  const line = document.createElement("div");
  line.className = "today-line";
  line.style.left = pos + "px";

  gantt.appendChild(line);
}
