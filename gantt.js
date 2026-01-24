console.log("JS carregado corretamente");

/* ================= SUPABASE ================= */
const supabase = window.createSupabaseClient(
  "https://dklmejmlovtcadlicnhu.supabase.co",
  "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At"
);

/* ================= CONFIG ================= */
let PX_POR_DIA = 30;
const DATA_BASE = new Date("2026-01-01");
const TOTAL_DIAS = 200;
const LINHA_ALTURA = 36;

/* ================= DOM ================= */
const gantt = document.getElementById("gantt");
const header = document.getElementById("gantt-header");
const fornecedorContainer = document.getElementById("fornecedor");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");

/* ================= STATE ================= */
let registrosAtuais = [];
let fornecedorAtual = null;

/* ================= UTIL ================= */
function diasEntre(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

/* ================= HEADER ================= */
function desenharHeader() {
  gantt.innerHTML = "";
  header.innerHTML = "";

  const largura = TOTAL_DIAS * PX_POR_DIA;
  gantt.style.width = `${largura}px`;
  header.style.width = `${largura}px`;

  for (let d = 0; d <= TOTAL_DIAS; d++) {
    const x = d * PX_POR_DIA;
    const data = new Date(DATA_BASE);
    data.setDate(data.getDate() + d);

    const line = document.createElement("div");
    line.className = "grid-line";
    line.style.left = `${x}px`;
    gantt.appendChild(line);

    const day = document.createElement("div");
    day.className = "day-label";
    day.style.left = `${x}px`;
    day.textContent = data.getDate();
    header.appendChild(day);

    if (data.getDate() === 1) {
      const month = document.createElement("div");
      month.className = "month-label";
      month.style.left = `${x}px`;
      month.style.width = `${PX_POR_DIA * 30}px`;
      month.textContent = data.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric"
      });
      header.appendChild(month);
    }
  }
}

/* ================= FORNECEDOR ================= */
async function carregarFornecedor() {
  const { data } = await supabase
    .from("cronograma_estrutura")
    .select("fornecedor");

  [...new Set(data.map(d => d.fornecedor))].forEach((nome, i) => {
    const btn = document.createElement("button");
    btn.className = "btn-filter";
    btn.textContent = nome;
    btn.onclick = () => selecionarFornecedor(nome);
    fornecedorContainer.appendChild(btn);
    if (i === 0) selecionarFornecedor(nome);
  });
}

function selecionarFornecedor(nome) {
  fornecedorAtual = nome;
  document.querySelectorAll(".btn-filter").forEach(b =>
    b.classList.toggle("active", b.textContent === nome)
  );
  carregarCronograma();
}

/* ================= CRONOGRAMA ================= */
async function carregarCronograma() {
  desenharHeader();

  const { data } = await supabase
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtual);

  registrosAtuais = data;
  renderizar();
}

/* ================= RENDER ================= */
function renderizar() {
  registrosAtuais.forEach((item, i) => {
    const inicio = new Date(item.data_inicio_plan);
    const fim = new Date(item.data_fim_plan);

    const bar = document.createElement("div");
    bar.className = "bar";
    bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
    bar.style.top = `${i * LINHA_ALTURA + 8}px`;
    bar.style.width = `${diasEntre(inicio, fim) * PX_POR_DIA}px`;
    bar.textContent = `${item.obra} - ${item.estrutura}`;

    bar.onmousedown = e => drag(bar, item, e);
    bar.ondblclick = () => abrirModal(item);

    gantt.appendChild(bar);
  });
}

/* ================= DRAG ================= */
function drag(bar, item, e) {
  let startX = e.clientX;

  document.onmousemove = ev => {
    const dx = ev.clientX - startX;
    bar.style.left = bar.offsetLeft + dx + "px";
    startX = ev.clientX;
  };

  document.onmouseup = () => {
    document.onmousemove = null;
    document.onmouseup = null;

    const dias = Math.round(bar.offsetLeft / PX_POR_DIA);
    const novaData = new Date(DATA_BASE);
    novaData.setDate(novaData.getDate() + dias);

    item.data_inicio_plan = novaData.toISOString().slice(0, 10);
    const dur = diasEntre(item.data_inicio_plan, item.data_fim_plan);
    const fim = new Date(novaData);
    fim.setDate(fim.getDate() + dur);
    item.data_fim_plan = fim.toISOString().slice(0, 10);
  };
}

/* ================= MODAL ================= */
function abrirModal(item) {
  modalContent.innerHTML = `
    <h3>${item.obra} - ${item.estrutura}</h3>
    <p><b>Fornecedor:</b> ${item.fornecedor}</p>
    <p><b>Início:</b> ${item.data_inicio_plan}</p>
    <p><b>Término:</b> ${item.data_fim_plan}</p>
    <p><b>Duração:</b> ${diasEntre(item.data_inicio_plan, item.data_fim_plan)} dias</p>
    <p><b>Peso:</b> ${item.peso_total_kg ?? "-"} kg</p>
    <button onclick="document.getElementById('modal').style.display='none'">Fechar</button>
  `;
  modal.style.display = "flex";
}

/* ================= SALVAR ================= */
document.getElementById("btnSalvar").onclick = async () => {
  for (const r of registrosAtuais) {
    await supabase
      .from("cronograma_estrutura")
      .update({
        data_inicio_plan: r.data_inicio_plan,
        data_fim_plan: r.data_fim_plan
      })
      .eq("id", r.id);
  }
  alert("Cronograma salvo com sucesso");
};

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
