/*************************************************
 * CONFIGURAÇÕES
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";
const TABLE = "cronograma_estrutura";

const DAY_WIDTH = 56; // MAIS LARGO PARA FACILITAR DRAG
const TOTAL_DAYS = 150;

/*************************************************
 * ELEMENTOS
 *************************************************/
const gantt = document.getElementById("gantt");

/*************************************************
 * ESTADO
 *************************************************/
let itens = [];
let inicioGlobal = null;
let hoje = new Date();
hoje.setHours(0,0,0,0);

/*************************************************
 * DATAS
 *************************************************/
function parseDate(d) {
  if (!d) return null;
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt) ? null : dt;
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
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/${TABLE}?select=*`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`
      }
    }
  );

  itens = await res.json();

  const datas = itens
    .map(i => parseDate(i.data_inicio_plan))
    .filter(Boolean);

  inicioGlobal = datas.length
    ? new Date(Math.min(...datas))
    : new Date();

  inicioGlobal.setHours(0,0,0,0);

  render();
}

/*************************************************
 * RENDER GERAL
 *************************************************/
function render() {
  gantt.innerHTML = "";

  criarTimeline();
  criarLinhaHoje();

  itens
    .sort((a,b) => (a.ordem_prioridade||0) - (b.ordem_prioridade||0))
    .forEach(i => criarLinha(i));
}

/*************************************************
 * TIMELINE (ANO / MÊS / DIA)
 *************************************************/
function criarTimeline() {
  const wrapper = document.createElement("div");
  wrapper.className = "timeline-wrapper";

  const linhaAno = document.createElement("div");
  const linhaMes = document.createElement("div");
  const linhaDia = document.createElement("div");

  linhaAno.className = "timeline-year";
  linhaMes.className = "timeline-month";
  linhaDia.className = "timeline-day";

  let mesAtual = -1;
  let anoAtual = -1;

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = new Date(inicioGlobal);
    d.setDate(d.getDate() + i);

    if (d.getMonth() !== mesAtual) {
      const m = document.createElement("div");
      m.style.width = `${DAY_WIDTH * 30}px`;
      m.innerText = d.toLocaleString("pt-BR", { month: "short" });
      linhaMes.appendChild(m);
      mesAtual = d.getMonth();
    }

    if (d.getFullYear() !== anoAtual) {
      const a = document.createElement("div");
      a.style.width = `${DAY_WIDTH * 365}px`;
      a.innerText = d.getFullYear();
      linhaAno.appendChild(a);
      anoAtual = d.getFullYear();
    }

    const dia = document.createElement("div");
    dia.className = "day";
    dia.style.width = DAY_WIDTH + "px";
    dia.innerText = d.getDate();
    linhaDia.appendChild(dia);
  }

  wrapper.appendChild(linhaAno);
  wrapper.appendChild(linhaMes);
  wrapper.appendChild(linhaDia);
  gantt.appendChild(wrapper);
}

/*************************************************
 * LINHA DO DIA ATUAL
 *************************************************/
function criarLinhaHoje() {
  const offset = diffDays(inicioGlobal, hoje) * DAY_WIDTH;

  const linha = document.createElement("div");
  linha.className = "today-line";
  linha.style.left = offset + "px";

  gantt.appendChild(linha);
}

/*************************************************
 * LINHA DE TAREFA
 *************************************************/
function criarLinha(item) {
  const row = document.createElement("div");
  row.className = "row";

  const area = document.createElement("div");
  area.className = "bar-area";

  const bar = document.createElement("div");
  bar.className = "bar plan";

  const inicio = parseDate(item.data_inicio_plan);
  const offset = inicio ? diffDays(inicioGlobal, inicio) : 0;

  bar.style.left = offset * DAY_WIDTH + "px";
  bar.style.width = (item.duracao_planejada_dias || 1) * DAY_WIDTH + "px";

  bar.innerText = `PLAN - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

  habilitarDrag(bar, item);

  area.appendChild(bar);
  row.appendChild(area);
  gantt.appendChild(row);
}

/*************************************************
 * DRAG SUAVE (SNAP EM DIA)
 *************************************************/
function habilitarDrag(bar, item) {
  let startX, startLeft;

  bar.onmousedown = e => {
    startX = e.clientX;
    startLeft = parseInt(bar.style.left);

    document.onmousemove = ev => {
      const delta = ev.clientX - startX;
      bar.style.left = startLeft + delta + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;
      document.onmouseup = null;

      const left = parseInt(bar.style.left);
      const dias = Math.round(left / DAY_WIDTH);

      const novaData = new Date(inicioGlobal);
      novaData.setDate(novaData.getDate() + dias);

      item.data_inicio_plan = formatDate(novaData);
      bar.style.left = dias * DAY_WIDTH + "px";
    };
  };
}

/*************************************************
 * INIT
 *************************************************/
carregar();
