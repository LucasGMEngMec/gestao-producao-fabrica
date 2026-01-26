console.log("JS carregado corretamente");

/* ================= SUPABASE ================= */
const supabase = window.createSupabaseClient(
  "https://dklmejmlovtcadlicnhu.supabase.co",
  "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At"
);

/* ================= CONFIG ================= */
let PX_POR_DIA = 30;
const DATA_BASE = new Date("2026-01-01");
const TOTAL_DIAS = 220;
const LINHA_ALTURA = 38;

/* ================= DOM ================= */
const gantt = document.getElementById("gantt");
const header = document.getElementById("gantt-header");
const fornecedorContainer = document.getElementById("fornecedor");
const modal = document.getElementById("modal");
const modalContent = document.getElementById("modalContent");

/* ================= STATE ================= */
let registros = [];
let apontamentos = [];
let fornecedorAtual = null;

/* ================= UTIL ================= */
function diasEntre(d1, d2) {
  return Math.max(1, Math.round((new Date(d2) - new Date(d1)) / 86400000));
}

function dataPorOffset(offset) {
  const d = new Date(DATA_BASE);
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
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
  fornecedorContainer.innerHTML = "";

  const { data } = await supabase
    .from("cronograma_estrutura")
    .select("fornecedor");

  [...new Set(data.map(d => d.fornecedor).filter(Boolean))].forEach((nome, i) => {
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

/* ================= LOAD ================= */
async function carregarCronograma() {
  desenharHeader();

  const resPlan = await supabase
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtual);

  const resApont = await supabase
    .from("apontamentos")
    .select("*")
    .eq("fornecedor", fornecedorAtual);

  registros = resPlan.data || [];
  apontamentos = resApont.data || [];

  renderizar();
}

/* ================= RENDER ================= */
function renderizar() {
  registros.forEach((item, i) => {
    renderPlan(item, i);
    renderReal(item, i);
    renderForecast(item, i);
  });
}

/* ================= PLAN ================= */
function renderPlan(item, index) {
  if (!item.data_inicio_plan || !item.data_fim_plan) return;

  const inicio = new Date(item.data_inicio_plan);
  const fim = new Date(item.data_fim_plan);
  const dur = diasEntre(inicio, fim);

  const bar = document.createElement("div");
  bar.className = "bar plan";
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${index * LINHA_ALTURA + 6}px`;
  bar.style.width = `${dur * PX_POR_DIA}px`;
  bar.textContent = `PLAN | ${item.obra} - ${item.instalacao} - ${item.estrutura};

  bar.onmousedown = e => dragPlan(bar, item, e);
  bar.ondblclick = () => abrirModal(item, "PLAN");

  gantt.appendChild(bar);
}

/* ================= REAL ================= */
function renderReal(item, index) {
  const ap = apontamentos.filter(a =>
    a.obra === item.obra &&
    a.instalacao === item.instalacao &&
    a.estrutura === item.estrutura
  );

  if (ap.length === 0) return;

  const datas = ap.map(a => new Date(a.data));
  const inicio = new Date(Math.min(...datas));
  const fim = new Date(Math.max(...datas));

  const bar = document.createElement("div");
  bar.className = "bar real";
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${index * LINHA_ALTURA + 6}px`;
  bar.style.width = `${diasEntre(inicio, fim) * PX_POR_DIA}px`;
  bar.textContent = `REAL | ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

  bar.ondblclick = () => abrirModal(item, "REAL", { inicio, fim });

  gantt.appendChild(bar);
}

/* ================= FORECAST ================= */
function renderForecast(item, index) {
  const ap = apontamentos.filter(a =>
    a.obra === item.obra &&
    a.instalacao === item.instalacao &&
    a.estrutura === item.estrutura
  );

  if (ap.length === 0) return;

  const datas = ap.map(a => new Date(a.data));
  const inicioReal = new Date(Math.min(...datas));

  const durPlan = diasEntre(
    new Date(item.data_inicio_plan),
    new Date(item.data_fim_plan)
  );

  const fimForecast = new Date(inicioReal);
  fimForecast.setDate(fimForecast.getDate() + durPlan);

  const bar = document.createElement("div");
  bar.className = "bar forecast";
  bar.style.left = `${diasEntre(DATA_BASE, inicioReal) * PX_POR_DIA}px`;
  bar.style.top = `${index * LINHA_ALTURA + 6}px`;
  bar.style.width = `${durPlan * PX_POR_DIA}px`;
  bar.textContent = `FORECAST | ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

  bar.ondblclick = () =>
    abrirModal(item, "FORECAST", { inicio: inicioReal, fim: fimForecast });

  gantt.appendChild(bar);
}

/* ================= DRAG ================= */
function dragPlan(bar, item, e) {
  let startX = e.clientX;

  document.onmousemove = ev => {
    const dx = ev.clientX - startX;
    bar.style.left = bar.offsetLeft + dx + "px";
    startX = ev.clientX;
  };

  document.onmouseup = () => {
    document.onmousemove = null;
    document.onmouseup = null;

    const offset = Math.round(bar.offsetLeft / PX_POR_DIA);
    const novaInicio = dataPorOffset(offset);
    const dur = diasEntre(item.data_inicio_plan, item.data_fim_plan);

    item.data_inicio_plan = novaInicio;
    const f = new Date(novaInicio);
    f.setDate(f.getDate() + dur);
    item.data_fim_plan = f.toISOString().slice(0, 10);
  };
}

/* ================= MODAL ================= */
function abrirModal(item, tipo, datas = {}) {
  modalContent.innerHTML = `
    <h3>${tipo} | ${item.obra} - ${item.instalacao} - ${item.estrutura}</h3>
    <p><b>Fornecedor:</b> ${item.fornecedor}</p>
    <p><b>Peso:</b> ${item.peso_total || 0} kg</p>
    <p><b>Início:</b> ${datas.inicio ? datas.inicio.toISOString().slice(0,10) : item.data_inicio_plan}</p>
    <p><b>Fim:</b> ${datas.fim ? datas.fim.toISOString().slice(0,10) : item.data_fim_plan}</p>
    <br>
    <button onclick="document.getElementById('modal').style.display='none'">Fechar</button>
  `;
  modal.style.display = "flex";
}

/* ================= SALVAR ================= */
document.getElementById("btnSalvar").onclick = async () => {
  for (const r of registros) {
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
