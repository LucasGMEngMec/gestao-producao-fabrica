console.log("JS carregado corretamente");

/* ================= SUPABASE ================= */
const SUPABASE_URL = "https://dkmejmlovtcadlichhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* ================= ELEMENTOS ================= */
document.addEventListener("DOMContentLoaded", () => {
  const gantt = document.getElementById("gantt");
  const fornecedoresContainer = document.getElementById("fornecedores");

  if (!gantt || !fornecedoresContainer) {
    console.error("HTML incompleto: faltam #gantt ou #fornecedores");
    return;
  }

  let fornecedorAtual = null;

  /* ============ UTIL ============ */
  function diasEntre(d1, d2) {
    const ms = new Date(d2) - new Date(d1);
    return Math.ceil(ms / (1000 * 60 * 60 * 24));
  }

  const dataBase = new Date("2026-01-01"); // marco inicial do gantt
  const PX_POR_DIA = 30;

  /* ============ FORNECEDORES ============ */
  async function carregarFornecedores() {
    fornecedoresContainer.innerHTML = "";

    const { data, error } = await supabaseClient
      .from("cronograma_estrutura")
      .select("fornecedor");

    if (error) {
      console.error(error);
      alert("Erro ao buscar fornecedores");
      return;
    }

    const fornecedores = [...new Set(data.map(d => d.fornecedor).filter(Boolean))];

    fornecedores.forEach((nome, i) => {
      const btn = document.createElement("button");
      btn.className = "btn-filter";
      btn.textContent = nome;
      btn.onclick = () => selecionarFornecedor(nome);
      fornecedoresContainer.appendChild(btn);
      if (i === 0) selecionarFornecedor(nome);
    });
  }

  /* ============ SELEÇÃO ============ */
  function selecionarFornecedor(nome) {
    fornecedorAtual = nome;
    document.querySelectorAll(".btn-filter").forEach(b =>
      b.classList.toggle("active", b.textContent === nome)
    );
    carregarCronograma();
  }

  /* ============ CRONOGRAMA ============ */
  async function carregarCronograma() {
    gantt.innerHTML = "";

    const { data, error } = await supabaseClient
      .from("cronograma_estrutura")
      .select("*")
      .eq("fornecedor", fornecedorAtual);

    if (error || !data.length) {
      gantt.innerHTML = "<p>Nenhum registro</p>";
      return;
    }

    renderizarGantt(data);
  }

  /* ============ GANTT REAL ============ */
  function renderizarGantt(registros) {
    registros.forEach((item, index) => {
      if (!item.data_inicio_plan || !item.data_fim_plan) return;

      const inicio = new Date(item.data_inicio_plan);
      const fim = new Date(item.data_fim_plan);

      const left = diasEntre(dataBase, inicio) * PX_POR_DIA;
      const width = diasEntre(inicio, fim) * PX_POR_DIA;

      const bar = document.createElement("div");
      bar.className = "bar";
      bar.style.left = `${left}px`;
      bar.style.top = `${index * 36}px`;
      bar.style.width = `${width}px`;
      bar.textContent = `${item.obra} – ${item.estrutura}`;

      tornarArrastavel(bar, item.id);

      gantt.appendChild(bar);
    });
  }

  /* ============ DRAG & UPDATE ============ */
  function tornarArrastavel(bar, id) {
    let startX;

    bar.onmousedown = e => {
      startX = e.clientX;
      document.onmousemove = ev => {
        const dx = ev.clientX - startX;
        bar.style.left = bar.offsetLeft + dx + "px";
        startX = ev.clientX;
      };

      document.onmouseup = async () => {
        document.onmousemove = null;
        document.onmouseup = null;

        const dias = Math.round(bar.offsetLeft / PX_POR_DIA);
        const novaData = new Date(dataBase);
        novaData.setDate(novaData.getDate() + dias);

        await supabaseClient
          .from("cronograma_estrutura")
          .update({ data_inicio_plan: novaData.toISOString().slice(0, 10) })
          .eq("id", id);
      };
    };
  }

  carregarFornecedores();
});
