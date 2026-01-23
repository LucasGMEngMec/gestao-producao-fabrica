/*************************************************
 * SUPABASE
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";

const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/*************************************************
 * CONFIGURAÇÃO
 *************************************************/
const DAY_WIDTH = 32; // compacto, mas fácil de arrastar
const RANGE_DAYS = 180;

let fornecedorAtual = "BDR";
let itens = [];
let inicioGlobal;

/*************************************************
 * HELPERS
 *************************************************/
const parseDate = d => new Date(d + "T00:00:00");
const diffDays = (a, b) => Math.round((b - a) / 86400000);

/*************************************************
 * LOAD
 *************************************************/
async function carregar() {
  const { data, error } = await supabase
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtual)
    .order("id");

  if (error) {
    console.error(error);
    alert("Erro ao carregar dados");
    return;
  }

  itens = data;
  calcularInicio();
  render();
}

function calcularInicio() {
  inicioGlobal = new Date();
  itens.forEach(i => {
    if (i.data_inicio_plan) {
      const d = parseDate(i.data_inicio_plan);
      if (d < inicioGlobal) inicioGlobal = d;
    }
  });
  inicioGlobal.setDate(inicioGlobal.getDate() - 10);
}

/*************************************************
 * TIMELINE
 *************************************************/
function renderTimeline() {
  const timeline = document.getElementById("timeline");
  timeline.innerHTML = "";

  const yearRow = document.createElement("div");
  const monthRow = document.createElement("div");
  const dayRow = document.createElement("div");

  yearRow.className = monthRow.className = dayRow.className = "timeline-row";

  let lastYear = null;
  let lastMonth = null;

  for (let i = 0; i < RANGE_DAYS; i++) {
    const d = new Date(inicioGlobal);
    d.setDate(d.getDate() + i);

    if (d.getFullYear() !== lastYear) {
      const y = document.createElement("div");
      y.className = "cell";
      y.style.width = DAY_WIDTH * 30 + "px";
      y.innerText = d.getFullYear();
      yearRow.appendChild(y);
      lastYear = d.getFullYear();
    }

    if (d.getMonth() !== lastMonth) {
      const m = document.createElement("div");
      m.className = "cell";
      m.style.width = DAY_WIDTH * 30 + "px";
      m.innerText = d.toLocaleString("pt-BR", { month: "short" });
      monthRow.appendChild(m);
      lastMonth = d.getMonth();
    }

    const day = document.createElement("div");
    day.className = "cell days";
    day.style.width = DAY_WIDTH + "px";
    day.innerText = d.getDate();
    dayRow.appendChild(day);
  }

  timeline.append(yearRow, monthRow, dayRow);
}

/*************************************************
 * GANTT
 *************************************************/
function renderGantt() {
  const gantt = document.getElementById("gantt");
  gantt.innerHTML = "";

  // linha de hoje
  const hoje = new Date();
  const todayLine = document.createElement("div");
  todayLine.className = "today-line";
  todayLine.style.left =
    diffDays(inicioGlobal, hoje) * DAY_WIDTH + "px";
  gantt.appendChild(todayLine);

  itens.forEach(item => {
    const row = document.createElement("div");
    row.className = "gantt-row";

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.innerText = `PLAN - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

    const inicio = parseDate(item.data_inicio_plan);
    bar.style.left =
      diffDays(inicioGlobal, inicio) * DAY_WIDTH + "px";
    bar.style.width =
      item.duracao_planejada_dias * DAY_WIDTH + "px";

    tornarArrastavel(bar, item);
    row.appendChild(bar);
    gantt.appendChild(row);
  });
}

function render() {
  renderTimeline();
  renderGantt();
}

/*************************************************
 * DRAG
 *************************************************/
function tornarArrastavel(bar, item) {
  let startX, startLeft;

  bar.onmousedown = e => {
    startX = e.clientX;
    startLeft = parseInt(bar.style.left, 10);
    document.onmousemove = move;
    document.onmouseup = stop;
  };

  function move(e) {
    const dx = e.clientX - startX;
    bar.style.left = startLeft + dx + "px";
  }

  function stop() {
    document.onmousemove = null;
    document.onmouseup = null;

    const dias = Math.round(parseInt(bar.style.left, 10) / DAY_WIDTH);
    const novaData = new Date(inicioGlobal);
    novaData.setDate(novaData.getDate() + dias);

    item.data_inicio_plan = novaData.toISOString().slice(0, 10);
  }
}

/*************************************************
 * AÇÕES
 *************************************************/
document.getElementById("btnSalvar").onclick = async () => {
  for (const i of itens) {
    await supabase
      .from("cronograma_estrutura")
      .update({ data_inicio_plan: i.data_inicio_plan })
      .eq("id", i.id);
  }
  alert("Cronograma salvo");
};

document.getElementById("btnBDR").onclick = () => {
  fornecedorAtual = "BDR";
  carregar();
};

document.getElementById("btnBJ").onclick = () => {
  fornecedorAtual = "BJ";
  carregar();
};

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", carregar);
