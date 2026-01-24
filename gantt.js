console.log("JS carregado corretamente");

/* ================= SUPABASE ================= */
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";

const supabase = window.createSupabaseClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/* ================= CONFIG ================= */
let PX_POR_DIA = 30;
const DATA_BASE = new Date("2026-01-01");
const LINHA_ALTURA = 36;
const TOTAL_DIAS = 180;

/* ================= DOM ================= */
const gantt = document.getElementById("gantt");
const ganttHeader = document.getElementById("gantt-header");
const fornecedorContainer = document.getElementById("fornecedor");

/* ================= UTIL ================= */
function diasEntre(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

/* ================= GRADE + CABEÇALHO ================= */
function desenharGrade() {
  gantt.innerHTML = "";
  ganttHeader.innerHTML = "";

  gantt.style.width = `${TOTAL_DIAS * PX_POR_DIA}px`;
  ganttHeader.style.width = gantt.style.width;

  for (let d = 0; d <= TOTAL_DIAS; d++) {
    const x = d * PX_POR_DIA;

    const line = document.createElement("div");
    line.className = "grid-line";
    line.style.left = `${x}px`;
    gantt.appendChild(line);

    const data = new Date(DATA_BASE);
    data.setDate(data.getDate() + d);

    if (data.getDate() === 1) {
      const label = document.createElement("div");
      label.className = "month-label";
      label.style.left = `${x}px`;
      label.style.width = `${PX_POR_DIA * 30}px`;
      label.textContent = data.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric"
      });
      ganttHeader.appendChild(label);
    }
  }
}

/* ================= FORNECEDOR ================= */
async function carregarFornecedor() {
  fornecedorContainer.innerHTML = "";

  const { data } = await supabase
    .from("cronograma_estrutura")
    .select("fornecedor");

  const lista = [...new Set(data.map(d => d.fornecedor).filter(Boolean))];

  lista.forEach((nome, i) => {
    const btn = document.createElement("button");
    btn.className = "btn-filter";
    btn.textContent = nome;
    btn.onclick = () => selecionarFornecedor(nome);
    fornecedorContainer.appendChild(btn);
    if (i === 0) selecionarFornecedor(nome);
  });
}

let fornecedorAtual = null;

function selecionarFornecedor(nome) {
  fornecedorAtual = nome;
  document.querySelectorAll(".btn-filter").forEach(b =>
    b.classList.toggle("active", b.textContent === nome)
  );
  carregarCronograma();
}

/* ================= CRONOGRAMA ================= */
async function carregarCronograma() {
  desenharGrade();

  const { data } = await supabase
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtual);

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
    bar.className = "bar plan";
    bar.style.left = `${left}px`;
    bar.style.top = `${index * LINHA_ALTURA + 8}px`;
    bar.style.width = `${width}px`;

    bar.textContent =
      `${item.obra} - ${item.instalacao} - ${item.estrutura}`;

    gantt.appendChild(bar);
  });
}

/* ================= ZOOM ================= */
document.querySelectorAll("[data-zoom]").forEach(btn => {
  btn.onclick = () => {
    PX_POR_DIA = Number(btn.dataset.zoom);
    document.querySelectorAll("[data-zoom]").forEach(b =>
      b.classList.toggle("active", b === btn)
    );
    carregarCronograma();
  };
});

/* ================= INIT ================= */
carregarFornecedor();
