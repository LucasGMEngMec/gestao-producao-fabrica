/***************************************************
 * SUPABASE — USAR CLIENTE GLOBAL DO CDN
 ***************************************************/
const sb = window.supabase;

/***************************************************
 * ELEMENTOS E CONSTANTES
 ***************************************************/
const gantt = document.getElementById("gantt");
const DAY_WIDTH = 40;

let itens = [];
let inicioGlobal;

/***************************************************
 * FUNÇÕES DE DATA
 ***************************************************/
function parseDate(d) {
  return new Date(d + "T00:00:00");
}

function diffDays(a, b) {
  return Math.round((b - a) / 86400000);
}

/***************************************************
 * CARREGAR DADOS
 ***************************************************/
async function carregar() {
  gantt.innerHTML = "";

  const { data, error } = await sb
    .from("cronograma_estrutural")
    .select("*")
    .order("ordem_prioridade");

  if (error) {
    console.error(error);
    alert("Erro ao carregar dados");
    return;
  }

  itens = data;

  inicioGlobal = new Date();
  itens.forEach(i => {
    if (i.data_inicio_plan) {
      const d = parseDate(i.data_inicio_plan);
      if (d < inicioGlobal) inicioGlobal = d;
    }
  });

  criarTimeline();
  itens.forEach(criarEstrutura);
}

/***************************************************
 * TIMELINE
 ***************************************************/
function criarTimeline() {
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

  gantt.appendChild(t);
}

/***************************************************
 * ESTRUTURAS
 ***************************************************/
function criarEstrutura(item) {
  criarLinha(item, "plan", item.data_inicio_plan, item.duracao_planejada_dias);

  if (item.data_inicio_real) {
    criarLinha(item, "real", item.data_inicio_real, item.duracao_planejada_dias);
  }

  if (item.data_fim_forecast) {
    criarLinha(
      item,
      "forecast",
      item.data_inicio_real || item.data_inicio_plan,
      diffDays(
        parseDate(item.data_inicio_real || item.data_inicio_plan),
        parseDate(item.data_fim_forecast)
      )
    );
  }
}

/***************************************************
 * LINHAS
 ***************************************************/
function criarLinha(item, tipo, inicio, duracao) {
  if (!inicio || !duracao) return;

  const row = document.createElement("div");
  row.className = "row";

  const label = document.createElement("div");
  label.className = "label";
  label.innerHTML = `<b>${item.estrutura}</b><br>${item.obra}<br>${item.instalacao}`;

  const area = document.createElement("div");
  area.className = "bar-area";

  const bar = document.createElement("div");
  bar.className = `bar ${tipo}`;
  bar.innerText = tipo.toUpperCase();

  const start = parseDate(inicio);
  bar.style.left = diffDays(inicioGlobal, start) * DAY_WIDTH + "px";
  bar.style.width = duracao * DAY_WIDTH + "px";

  habilitarDrag(bar, item, tipo);

  area.appendChild(bar);
  row.appendChild(label);
  row.appendChild(area);
  gantt.appendChild(row);
}

/***************************************************
 * DRAG
 ***************************************************/
function habilitarDrag(bar, item, tipo) {
  let startX, startLeft;

  bar.onmousedown = e => {
    startX = e.clientX;
    startLeft = parseInt(bar.style.left);

    document.onmousemove = e => {
      bar.style.left = startLeft + (e.clientX - startX) + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;

      const days = Math.round(parseInt(bar.style.left) / DAY_WIDTH);
      const d = new Date(inicioGlobal);
      d.setDate(d.getDate() + days);

      const iso = d.toISOString().slice(0, 10);

      if (tipo === "plan") item.data_inicio_plan = iso;
      if (tipo === "real") item.data_inicio_real = iso;
      if (tipo === "forecast") item.data_fim_forecast = iso;
    };
  };
}

/***************************************************
 * SALVAR
 ***************************************************/
async function salvarCronograma() {
  for (const i of itens) {
    await sb
      .from("cronograma_estrutural")
      .update({
        data_inicio_plan: i.data_inicio_plan,
        data_inicio_real: i.data_inicio_real,
        data_fim_forecast: i.data_fim_forecast
      })
      .eq("id", i.id);
  }

  alert("Cronograma salvo com sucesso");
}

/***************************************************
 * INIT
 ***************************************************/
carregar();
