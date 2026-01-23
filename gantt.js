/*************************************************
 * SUPABASE CLIENT
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "SUA_ANON_PUBLIC_KEY_AQUI"; // ⚠️ anon public

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

  console.log("Consultando tabela cronograma_estrutura");

  const { data, error } = await sb
    .from("cronograma_estrutura") // ✅ NOME CONFIRMADO
    .select("*")
    .order("id");

  if (error) {
    console.error("Erro Supabase:", error);
    alert("Erro ao carregar dados");
    return;
  }

  console.log("Dados carregados:", data);

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
  const wrapper = document.createElement("div");

  const years = document.createElement("div");
  const months = document.createElement("div");
  const days = document.createElement("div");

  years.className = "timeline";
  months.className = "timeline";
  days.className = "timeline";

  let lastYear = null;
  let lastMonth = null;

  for (let i = 0; i < 120; i++) {
    const d = new Date(inicioGlobal);
    d.setDate(d.getDate() + i);

    /* ===== ANO ===== */
    if (d.getFullYear() !== lastYear) {
      const y = document.createElement("div");
      y.className = "day";
      y.style.width = DAY_WIDTH + "px";
      y.innerText = d.getFullYear();
      years.appendChild(y);
      lastYear = d.getFullYear();
    } else {
      const e = document.createElement("div");
      e.className = "day";
      years.appendChild(e);
    }

    /* ===== MÊS ===== */
    if (d.getMonth() !== lastMonth) {
      const m = document.createElement("div");
      m.className = "day";
      m.innerText = d.toLocaleString("pt-BR", { month: "short" });
      months.appendChild(m);
      lastMonth = d.getMonth();
    } else {
      const e = document.createElement("div");
      e.className = "day";
      months.appendChild(e);
    }

    /* ===== DIA ===== */
    const day = document.createElement("div");
    day.className = "day";
    day.innerText = d.getDate();
    days.appendChild(day);
  }

  wrapper.appendChild(years);
  wrapper.appendChild(months);
  wrapper.appendChild(days);

  gantt.appendChild(wrapper);
}

/*************************************************
 * LINHAS
 *************************************************/
function criarEstrutura(item) {
  const inicioPlan =
    item.data_inicio_plan ||
    new Date().toISOString().slice(0, 10); // fallback seguro

  criarLinha(item, "plan", inicioPlan, item.duracao_planejada_dias);

  if (item.data_inicio_real)
    criarLinha(item, "real", item.data_inicio_real, item.duracao_planejada_dias);

  if (item.data_fim_forecast)
    criarLinha(
      item,
      "forecast",
      item.data_inicio_real || inicioPlan,
      diffDays(
        parseDate(item.data_inicio_real || inicioPlan),
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
  label.innerHTML = `<b>${item.estrutura}</b><br>${item.obra ?? ""}<br>${item.instalacao}`;

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
      .from("cronograma_estrutura") // ✅ CONFIRMADO
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
window.onload = carregar;
