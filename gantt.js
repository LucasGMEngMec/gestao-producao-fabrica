/*************************************************
 * CONFIGURAÇÃO SUPABASE (REST)
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";
const TABLE = "cronograma_estrutura";

/*************************************************
 * CONSTANTES
 *************************************************/
const DAY_WIDTH = 40;
const gantt = document.getElementById("gantt");

/*************************************************
 * ESTADO GLOBAL
 *************************************************/
let itens = [];
let inicioGlobal = null;
let fornecedorAtual = null;

/*************************************************
 * DATAS – BLINDADAS
 *************************************************/
function parseDate(d) {
  if (!d) return null;
  const date = new Date(d + "T00:00:00");
  return isNaN(date) ? null : date;
}

function formatDate(d) {
  if (!(d instanceof Date) || isNaN(d)) return null;
  return d.toISOString().slice(0, 10);
}

function diffDays(a, b) {
  if (!a || !b) return 0;
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

  // Normalizar prioridades
  itens.forEach((i, idx) => {
    if (i.ordem_prioridade == null) i.ordem_prioridade = idx + 1;
  });

  // Definir início global válido
  const datasValidas = itens
    .map(i => parseDate(i.data_inicio_plan))
    .filter(Boolean);

  inicioGlobal = datasValidas.length
    ? new Date(Math.min(...datasValidas))
    : new Date();

  montarAbas();
}

/*************************************************
 * ABAS POR FORNECEDOR (SEM DUPLICAR)
 *************************************************/
function montarAbas() {
  gantt.innerHTML = "";

  const fornecedores = [
    ...new Set(itens.map(i => i.fornecedor || "SEM FORNECEDOR"))
  ];

  const tabs = document.createElement("div");
  tabs.style.marginBottom = "16px";

  fornecedores.forEach(f => {
    const btn = document.createElement("button");
    btn.innerText = f;
    btn.style.marginRight = "8px";

    btn.onclick = () => {
      fornecedorAtual = f;
      render();
    };

    tabs.appendChild(btn);
  });

  gantt.appendChild(tabs);

  fornecedorAtual = fornecedores[0];
  render();
}

/*************************************************
 * RENDER (LIMPA ANTES DE DESENHAR)
 *************************************************/
function render() {
  const antigo = document.getElementById("areaGantt");
  if (antigo) antigo.remove();

  const area = document.createElement("div");
  area.id = "areaGantt";

  criarTimeline(area);

  itens
    .filter(i => (i.fornecedor || "SEM FORNECEDOR") === fornecedorAtual)
    .sort((a, b) => a.ordem_prioridade - b.ordem_prioridade)
    .forEach(i => criarLinha(area, i));

  gantt.appendChild(area);
}

/*************************************************
 * TIMELINE
 *************************************************/
function criarTimeline(container) {
  const t = document.createElement("div");
  t.className = "timeline";

  for (let i = 0; i < 120; i++) {
    const d = new Date(inicioGlobal);
    d.setDate(d.getDate() + i);

    const c = document.createElement("div");
    c.className = "day";
    c.innerText = d.getDate();
    t.appendChild(c);
  }

  container.appendChild(t);
}

/*************************************************
 * LINHA + PRIORIDADE
 *************************************************/
function criarLinha(container, item) {
  const row = document.createElement("div");
  row.className = "row";
  row.draggable = true;

  row.ondragstart = e => {
    e.dataTransfer.setData("id", item.id);
  };

  row.ondragover = e => e.preventDefault();

  row.ondrop = e => {
    const idOrigem = e.dataTransfer.getData("id");
    atualizarPrioridade(idOrigem, item.id);
  };

  const label = document.createElement("div");
  label.className = "label";
  label.innerHTML = `
    <b>PLAN</b> - ${item.obra} - ${item.instalacao} - ${item.estrutura}
  `;

  const area = document.createElement("div");
  area.className = "bar-area";

  const bar = document.createElement("div");
  bar.className = "bar plan";
  bar.innerText = "PLANEJADO";

  const inicio = parseDate(item.data_inicio_plan);
  const offset = inicio ? diffDays(inicioGlobal, inicio) : 0;

  bar.style.left = offset * DAY_WIDTH + "px";
  bar.style.width = (item.duracao_planejada_dias || 1) * DAY_WIDTH + "px";

  habilitarDragHorizontal(bar, item);

  area.appendChild(bar);
  row.appendChild(label);
  row.appendChild(area);
  container.appendChild(row);
}

/*************************************************
 * DRAG HORIZONTAL (DATAS – SEGURO)
 *************************************************/
function habilitarDragHorizontal(bar, item) {
  let startX, startLeft;

  bar.onmousedown = e => {
    startX = e.clientX;
    startLeft = parseInt(bar.style.left) || 0;

    document.onmousemove = ev => {
      bar.style.left = startLeft + (ev.clientX - startX) + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;
      document.onmouseup = null;

      const left = parseInt(bar.style.left);
      if (isNaN(left)) return;

      const dias = Math.round(left / DAY_WIDTH);
      const novaData = new Date(inicioGlobal);
      novaData.setDate(novaData.getDate() + dias);

      const formatada = formatDate(novaData);
      if (formatada) item.data_inicio_plan = formatada;
    };
  };
}

/*************************************************
 * PRIORIDADE
 *************************************************/
function atualizarPrioridade(idOrigem, idDestino) {
  const a = itens.find(i => i.id == idOrigem);
  const b = itens.find(i => i.id == idDestino);
  if (!a || !b) return;

  [a.ordem_prioridade, b.ordem_prioridade] =
    [b.ordem_prioridade, a.ordem_prioridade];

  render();
}

/*************************************************
 * INIT
 *************************************************/
carregar();
