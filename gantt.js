/* ================== SUPABASE ================== */
const supabaseClient = supabase.createClient(
  "https://dkjmejmjovtcdalicnhu.supabase.co",
  "sb_publishable_cpq_melwicz13c9vpmkFQw_OOAzH2At"
);

/* ================== GANTT ================== */
const gantt = document.getElementById("gantt");
const DAY_WIDTH = 40;

let itens = [];
let inicioGlobal;

/* ========= DATA ========= */
function parseDate(d) {
  return new Date(d + "T00:00:00");
}

function diffDays(a, b) {
  return Math.round((b - a) / 86400000);
}

/* ========= LOAD ========= */
async function carregar() {
  gantt.innerHTML = "";

  const { data, error } = await supabaseClient
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

/* ========= TIMELINE ========= */
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

/* ========= STRUCT ========= */
function criarEstrutura(item) {
  criarLinha(item, "plan", item.data_inicio_plan, item.duracao_planejada_dias);

  if (item.data_inicio_real)
    criarLinha(item, "real", item.data_inicio_real, item.duracao_planejada_dias);

  if (item.data_fim_forecast) {
    const inicio = item.data_inicio_real || item.data_inicio_plan;
    const duracao = diffDays(
      parseDate(inicio),
      parseDate(item.data_fim_forecast)
    );

    criarLinha(item, "forecast", inicio, duracao);
  }
}

/* ========= ROW =======*
