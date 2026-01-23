/*************************************************
 * SUPABASE CLIENT
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";

const sb = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/*************************************************
 * VARIÁVEIS
 *************************************************/
const gantt = document.getElementById("gantt");
const btnSalvar = document.getElementById("btnSalvar");
const DAY_WIDTH = 40;

let itens = [];
let inicioGlobal;

/*************************************************
 * FUNÇÕES AUXILIARES
 *************************************************/
function parseDate(d) {
  return new Date(d + "T00:00:00");
}

function diffDays(a, b) {
  return Math.round((b - a) / 86400000);
}

/*************************************************
 * CARREGAR DADOS
 *************************************************/
async function carregar() {
  gantt.innerHTML = "";

  const { data, error } = await sb
    .from("cronograma_estrutura")
    .select("*")
    .order("id");

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

/*************************************************
 * TIMELINE
 *************************************************/
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

/*************************************************
 * LINHAS
 *************************************************/
function criarEstrutura(item) {
  criarLinha(item, "plan", item.data_inicio_plan, item.duracao_planejada_dias);

  if (item.data_inicio_real)
    criarLinha(item, "real", item.data_inicio_real, item.duracao_planejada_dias);

  if (item.data_fim_forecast)
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

  area.appendChild(bar);
  row.appendChild(label);
  row.appendChild(area);
  gantt.appendChild(row);
}

/*************************************************
 * SALVAR
 *************************************************/
btnSalvar.onclick = async () => {
  for (const i of itens) {
    await sb
      .from("cronograma_estrutura")
      .update({
        data_inicio_plan: i.data_inicio_plan,
        data_inicio_real: i.data_inicio_real,
        data_fim_forecast: i.data_fim_forecast
      })
      .eq("id", i.id);
  }

  alert("Cronograma salvo");
};

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", carregar);
