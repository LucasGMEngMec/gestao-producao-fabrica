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
const parseDate = d => new Date(d);
const diffDays = (a, b) => Math.round((b - a) / 86400000);

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

  if (!data || data.length === 0) {
    console.warn("Tabela sem registros");
    return;
  }

  const itens = data;

  // Base do cronograma = menor data criada
  let baseDate = new Date();
  itens.forEach(i => {
    if (i.criado_em) {
      const d = parseDate(i.criado_em);
      if (d < baseDate) baseDate = d;
    }
  });

  renderHeader(baseDate);
  renderBody(baseDate, itens);
  renderTodayLine(baseDate);
}

/*************************************************
 * HEADER
 *************************************************/
function renderHeader(baseDate) {
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

    // DIA
    const day = document.createElement("div");
    day.className = "cell";
    day.style.width = DAY_WIDTH + "px";
    day.innerText = d.getDate();
    dayRow.appendChild(day);

    // MÊS
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

    // ANO
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
function renderBody(baseDate, itens) {
  const body = document.createElement("div");
  body.className = "gantt-body";

  itens.forEach(item => {
    if (!item.duracao_planejada_dias) return;

    const row = document.createElement("div");
    row.className = "gantt-row";

    const bar = document.createElement("div");
    bar.className = "gantt-bar";

    bar.innerText =
      `PLAN - ${item.instalacao} - ${item.estrutura}`;

    const inicio = item.criado_em
      ? parseDate(item.criado_em)
      : baseDate;

    bar.style.left =
      diffDays(baseDate, inicio) * DAY_WIDTH + "px";

    bar.style.width =
      item.duracao_planejada_dias * DAY_WIDTH + "px";

    row.appendChild(bar);
    body.appendChild(row);
  });

  gantt.appendChild(body);
}

/*************************************************
 * TODAY LINE
 *************************************************/
function renderTodayLine(baseDate) {
  const pos = diffDays(baseDate, new Date()) * DAY_WIDTH;

  const line = document.createElement("div");
  line.className = "today-line";
  line.style.left = pos + "px";

  gantt.appendChild(line);
}
