/*************************************************
 * CONFIGURAÇÃO SUPABASE (REST)
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";
const TABLE = "cronograma_estrutura";

/*************************************************
 * ELEMENTOS
 *************************************************/
const gantt = document.getElementById("gantt");
const DAY_WIDTH = 40;

let itens = [];
let inicioGlobal;

/*************************************************
 * DATAS
 *************************************************/
function parseDate(d) {
  return new Date(d + "T00:00:00");
}

function formatDate(d) {
  return d.toISOString().slice(0, 10);
}

function diffDays(a, b) {
  return Math.round((b - a) / 86400000);
}

/*************************************************
 * CARREGAR DADOS
 *************************************************/
async function carregar() {
  gantt.innerHTML = "";

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?select=*`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
    }
  );

  itens = await res.json();

  inicioGlobal = new Date();

  itens.forEach(i => {
    if (i.data_inicio_plan) {
      const d = parseDate(i.data_inicio_plan);
      if (d < inicioGlobal) inicioGlobal = d;
    }
  });

  criarTimeline();
  itens.forEach(criarLinha);
}

/*************************************************
 * TIMELINE
 *************************************************/
function criarTimeline() {
  const anos = document.createElement("div");
  const meses = document.createElement("div");
  const dias = document.createElement("div");

  anos.className = meses.className = dias.className = "timeline";

  let anoAtual = null;
  let mesAtual = null;

  for (let i = 0; i < 120; i++) {
    const d = new Date(inicioGlobal);
    d.setDate(d.getDate() + i);

    const a = document.createElement("div");
    a.className = "day";
    a.innerText = d.getFullYear() !== anoAtual ? d.getFullYear() : "";
    anos.appendChild(a);
    anoAtual = d.getFullYear();

    const m = document.createElement("div");
    m.className = "day";
    m.innerText = d.getMonth() !== mesAtual
      ? d.toLocaleString("pt-BR", { month: "short" })
      : "";
    meses.appendChild(m);
    mesAtual = d.getMonth();

    const di = document.createElement("div");
    di.className = "day";
    di.innerText = d.getDate();
    dias.appendChild(di);
  }

  gantt.appendChild(anos);
  gantt.appendChild(meses);
  gantt.appendChild(dias);
}

/*************************************************
 * LINHAS + DRAG
 *************************************************/
function criarLinha(item) {
  if (!item.duracao_planejada_dias) return;

  const row = document.createElement("div");
  row.className = "row";

  const label = document.createElement("div");
  label.className = "label";
  label.innerHTML =
    `<b>PLAN</b> - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

  const area = document.createElement("div");
  area.className = "bar-area";

  const bar = document.createElement("div");
  bar.className = "bar plan";
  bar.innerText = "PLANEJADO";

  const inicio = parseDate(item.data_inicio_plan);
  bar.style.left =
    diffDays(inicioGlobal, inicio) * DAY_WIDTH + "px";
  bar.style.width =
    item.duracao_planejada_dias * DAY_WIDTH + "px";

  habilitarDrag(bar, item);

  area.appendChild(bar);
  row.appendChild(label);
  row.appendChild(area);
  gantt.appendChild(row);
}

/*************************************************
 * DRAG & DROP
 *************************************************/
function habilitarDrag(bar, item) {
  let startX;
  let startLeft;

  bar.addEventListener("mousedown", e => {
    startX = e.clientX;
    startLeft = parseInt(bar.style.left);

    document.onmousemove = ev => {
      const delta = ev.clientX - startX;
      bar.style.left = startLeft + delta + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;
      document.onmouseup = null;

      const dias = Math.round(parseInt(bar.style.left) / DAY_WIDTH);
      const novaData = new Date(inicioGlobal);
      novaData.setDate(novaData.getDate() + dias);

      item.data_inicio_plan = formatDate(novaData);
    };
  });
}

/*************************************************
 * INIT
 *************************************************/
carregar();
