/*************************************************
 * SUPABASE CONFIG (REST)
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
 * ESTADO
 *************************************************/
let itens = [];
let inicioGlobal;
let fornecedorAtual = null;

/*************************************************
 * DATAS
 *************************************************/
const parseDate = d => new Date(d + "T00:00:00");
const formatDate = d => d.toISOString().slice(0, 10);
const diffDays = (a, b) => Math.round((b - a) / 86400000);

/*************************************************
 * LOAD
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

  // Normalizar prioridade
  itens.forEach((i, idx) => {
    if (i.ordem_prioridade == null) i.ordem_prioridade = idx + 1;
  });

  inicioGlobal = new Date(Math.min(
    ...itens.map(i => parseDate(i.data_inicio_plan))
  ));

  montarAbas();
}

/*************************************************
 * ABAS POR FORNECEDOR
 *************************************************/
function montarAbas() {
  gantt.innerHTML = "";

  const fornecedores = [...new Set(itens.map(i => i.fornecedor || "SEM FORNECEDOR"))];

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
 * RENDER
 *************************************************/
function render() {
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
 * LINHA + DRAG DUPLO
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
  label.innerHTML = `<b>PLAN</b> - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

  const area = document.createElement("div");
  area.className = "bar-area";

  const bar = document.createElement("div");
  bar.className = "bar plan";
  bar.innerText = "PLANEJADO";

  const inicio = parseDate(item.data_inicio_plan);
  bar.style.left = diffDays(inicioGlobal, inicio) * DAY_WIDTH + "px";
  bar.style.width = item.duracao_planejada_dias * DAY_WIDTH + "px";

  habilitarDragHorizontal(bar, item);

  area.appendChild(bar);
  row.appendChild(label);
  row.appendChild(area);
  container.appendChild(row);
}

/*************************************************
 * DRAG HORIZONTAL (DATAS)
 *************************************************/
function habilitarDragHorizontal(bar, item) {
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
      const novaData = new Date(inicioGlobal);
      novaData.setDate(novaData.getDate() + dias);

      item.data_inicio_plan = formatDate(novaData);
    };
  };
}

/*************************************************
 * PRIORIDADE
 *************************************************/
function atualizarPrioridade(idOrigem, idDestino) {
  const a = itens.find(i => i.id == idOrigem);
  const b = itens.find(i => i.id == idDestino);

  const temp = a.ordem_prioridade;
  a.ordem_prioridade = b.ordem_prioridade;
  b.ordem_prioridade = temp;

  gantt.innerHTML = "";
  montarAbas();
}

/*************************************************
 * INIT
 *************************************************/
carregar();
