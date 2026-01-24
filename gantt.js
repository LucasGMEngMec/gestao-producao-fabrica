console.log("JS carregado corretamente");

/* ================= SUPABASE ================= */
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";

const supabase = window.createSupabaseClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* ================= CONFIG ================= */
const PX_POR_DIA = 30;
const DATA_BASE = new Date("2026-01-01");

/* ================= DOM ================= */
const gantt = document.getElementById("gantt");
const fornecedorContainer = document.getElementById("fornecedor");

if (!gantt || !fornecedorContainer) {
  console.error("HTML inválido: faltam #gantt ou #fornecedor");
}

/* ================= UTIL ================= */
function diasEntre(d1, d2) {
  const ms = new Date(d2) - new Date(d1);
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/* ================= FORNECEDOR ================= */
async function carregarFornecedor() {
  fornecedorContainer.innerHTML = "";

  const { data, error } = await supabase
    .from("cronograma_estrutura")
    .select("fornecedor");

  if (error) {
    console.error(error);
    alert("Erro ao carregar fornecedor");
    return;
  }

  const fornecedor = [...new Set(
    data.map(d => d.fornecedor).filter(Boolean)
  )];

  fornecedor.forEach((nome, i) => {
    const btn = document.createElement("button");
    btn.className = "btn-filter";
    btn.textContent = nome;
    btn.onclick = () => selecionarFornecedor(nome);
    fornecedorContainer.appendChild(btn);

    if (i === 0) selecionarFornecedor(nome);
  });
}

/* ================= SELEÇÃO ================= */
let fornecedorAtual = null;

function selecionarFornecedor(nome) {
  fornecedorAtual = nome;

  document.querySelectorAll(".btn-filter").forEach(btn =>
    btn.classList.toggle("active", btn.textContent === nome)
  );

  carregarCronograma();
}

/* ================= CRONOGRAMA ================= */
async function carregarCronograma() {
  gantt.innerHTML = "";

  const { data, error } = await supabase
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtual);

  if (error || !data || data.length === 0) {
    gantt.innerHTML = "<p style='padding:12px'>Nenhuma atividade</p>";
    return;
  }

  renderizarGantt(data);
}

/* ================= GANTT ================= */
function renderizarGantt(registros) {
  registros.forEach((item, index) => {
    if (!item.data_inicio_plan || !item.data_fim_plan) return;

    const inicio = new Date(item.data_inicio_plan);
    const fim = new Date(item.data_fim_plan);

    const left = diasEntre(DATA_BASE, inicio) * PX_POR_DIA;
    const width = Math.max(1, diasEntre(inicio, fim)) * PX_POR_DIA;

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.left = `${left}px`;
    bar.style.top = `${index * 36}px`;
    bar.style.width = `${width}px`;

    bar.textContent =
      `${item.situacao ?? "PLAN"} - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

    tornarArrastavel(bar, item.id);
    gantt.appendChild(bar);
  });
}

/* ================= DRAG ================= */
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
      const novaData = new Date(DATA_BASE);
      novaData.setDate(novaData.getDate() + dias);

      await supabase
        .from("cronograma_estrutura")
        .update({
          data_inicio_plan: novaData.toISOString().slice(0, 10)
        })
        .eq("id", id);
    };
  };
}

/* ================= INIT ================= */
carregarFornecedor();
