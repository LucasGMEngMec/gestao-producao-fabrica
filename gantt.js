/************************************************
 * ESPERA O DOM CARREGAR (EVITA NULL E DUPLICAÇÃO)
 ************************************************/
document.addEventListener("DOMContentLoaded", () => {

  /************************************************
   * SUPABASE — DECLARADO UMA ÚNICA VEZ
   ************************************************/
  const SUPABASE_URL = "https://dkmejmlovtcdalcinhu.supabase.co";
  const SUPABASE_KEY = "SUA_PUBLISHABLE_KEY_AQUI";

  const supa = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

  /************************************************
   * VARIÁVEIS
   ************************************************/
  const gantt = document.getElementById("gantt");
  const DAY_WIDTH = 40;

  let itens = [];
  let inicioGlobal;

  /************************************************
   * DATA
   ************************************************/
  const parseDate = d => new Date(d + "T00:00:00");
  const diffDays = (a, b) => Math.round((b - a) / 86400000);

  /************************************************
   * LOAD
   ************************************************/
  async function carregar() {
    gantt.innerHTML = "";

    const { data, error } = await supa
      .from("cronograma_estrutura")
      .select("*");

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

  /************************************************
   * TIMELINE
   ************************************************/
  function criarTimeline() {
    const t = document.createElement("div");
    t.style.display = "flex";

    for (let i = 0; i < 90; i++) {
      const d = new Date(inicioGlobal);
      d.setDate(d.getDate() + i);

      const c = document.createElement("div");
      c.style.width = DAY_WIDTH + "px";
      c.innerText = d.getDate();
      t.appendChild(c);
    }

    gantt.appendChild(t);
  }

  /************************************************
   * LINHAS
   ************************************************/
  function criarEstrutura(item) {
    criarLinha(item, item.data_inicio_plan, item.duracao_planejada_dias);
  }

  function criarLinha(item, inicio, duracao) {
    if (!inicio || !duracao) return;

    const row = document.createElement("div");
    row.innerText = `${item.estrutura} - ${item.obra}`;
    gantt.appendChild(row);
  }

  /************************************************
   * SALVAR
   ************************************************/
  document.getElementById("btnSalvar").onclick = async () => {
    for (const i of itens) {
      await supa
        .from("cronograma_estrutura")
        .update({
          data_inicio_plan: i.data_inicio_plan
        })
        .eq("id", i.id);
    }

    alert("Cronograma salvo");
  };

  /************************************************
   * INIT
   ************************************************/
  carregar();
});
