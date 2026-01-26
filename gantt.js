console.log("Gantt carregado corretamente");

/* ================= SUPABASE ================= */
const supabase = window.createSupabaseClient(
  "https://dklmejmlovtcadlicnhu.supabase.co",
  "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At"
);

/* ================= CONFIG ================= */
let PX_POR_DIA = 30;
const DATA_BASE = new Date("2026-01-01");
const TOTAL_DIAS = 220;
const ALTURA_LINHA = 34;

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
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

function dateFromLeft(px) {
  const d = new Date(DATA_BASE);
  d.setDate(d.getDate() + Math.round(px / PX_POR_DIA));
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

    // Linha vertical
    const line = document.createElement("div");
    line.className = "grid-line";
    line.style.left = `${x}px`;
    gantt.appendChild(line);

    // Número do dia
    const day = document.createElement("div");
    day.className = "day-label";
    day.style.left = `${x}px`;
    day.textContent = data.getDate();

    const diaSemana = data.getDay();
    if (diaSemana === 6) day.style.color = "#ca8a04"; // sábado
    if (diaSemana === 0) day.style.color = "#dc2626"; // domingo

    header.appendChild(day);

    // Mês
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

  desenharLinhaHoje();
}

/* ================= LINHA HOJE ================= */
function desenharLinhaHoje() {
  const hoje = new Date();
  const offset = diasEntre(DATA_BASE, hoje);

  if (offset < 0 || offset > TOTAL_DIAS) return;

  const line = document.createElement("div");
  line.style.position = "absolute";
  line.style.left = `${offset * PX_POR_DIA}px`;
  line.style.top = "0";
  line.style.bottom = "0";
  line.style.width = "2px";
  line.style.background = "#ef4444";
  line.style.zIndex = "5";

  gantt.appendChild(line);
}

/* ================= FORNECEDOR ================= */
async function carregarFornecedor() {
  fornecedorContainer.innerHTML = "";

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

/* ================= LOAD ================= */
async function carregarCronograma() {
  desenharHeader();

  const r1 = await supabase
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtual);

  const r2 = await supabase
    .from("apontamentos")
    .select("*")
    .eq("fornecedor", fornecedorAtual);

  registros = r1.data || [];
  apontamentos = r2.data || [];

  renderizar();
}

/* ================= RENDER ================= */
function renderizar() {
  let linha = 0;

  registros.forEach(item => {
    const prod = apontamentos.filter(a =>
      a.obra === item.obra &&
      a.instalacao === item.instalacao &&
      a.estrutura === item.estrutura
    );

    // PLAN
    linha = criarBarra(item, "PLAN", item.data_inicio_plan, item.data_fim_plan, linha, "plan");

    // REAL
    if (prod.length > 0) {
      const datas = prod.map(p => new Date(p.data));
      linha = criarBarra(
        item,
        "REAL",
        new Date(Math.min(...datas)),
        new Date(Math.max(...datas)),
        linha,
        "real"
      );
    }

    // FORECAST
    if (item.data_fim_forecast) {
      linha = criarBarra(
        item,
        "FORECAST",
        item.data_inicio_plan,
        item.data_fim_forecast,
        linha,
        "forecast"
      );
    }

    linha++;
  });
}

function criarBarra(item, tipo, inicio, fim, linha, classe) {
  if (!inicio || !fim) return linha;

  const bar = document.createElement("div");
  bar.className = `bar ${classe}`;
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${linha * ALTURA_LINHA + 6}px`;
  bar.style.width = `${Math.max(1, diasEntre(inicio, fim)) * PX_POR_DIA}px`;
  bar.textContent = `${tipo} - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

  if (tipo === "PLAN") {
    bar.onmousedown = e => drag(bar, item, e);
    bar.ondblclick = () => abrirModal(item);
  }

  gantt.appendChild(bar);
  return linha + 1;
}

/* ================= DRAG ================= */
function drag(bar, item, e) {
  let startX = e.clientX;

  document.onmousemove = ev => {
    bar.style.left = bar.offsetLeft + (ev.clientX - startX) + "px";
    startX = ev.clientX;
  };

  document.onmouseup = () => {
    document.onmousemove = null;
    document.onmouseup = null;

    item.data_inicio_plan = dateFromLeft(bar.offsetLeft);
    const dur = diasEntre(item.data_inicio_plan, item.data_fim_plan);
    const fim = new Date(item.data_inicio_plan);
    fim.setDate(fim.getDate() + dur);
    item.data_fim_plan = fim.toISOString().slice(0, 10);
  };
}

/* ================= MODAL ================= */
function abrirModal(item) {
  modalContent.innerHTML = `
    <h3>PLAN - ${item.obra} - ${item.instalacao} - ${item.estrutura}</h3>

    <label>Predecessora</label>
    <select id="pred">
      <option value="">Nenhuma</option>
      ${registros.filter(r => r.id !== item.id)
        .map(r => `<option value="${r.id}" ${r.id === item.tarefa_precedente_id ? "selected" : ""}>
          ${r.obra} - ${r.instalacao} - ${r.estrutura}
        </option>`).join("")}
    </select>

    <br><br>
    <button id="salvarDep">Salvar</button>
    <button onclick="document.getElementById('modal').style.display='none'">Fechar</button>
  `;

  document.getElementById("salvarDep").onclick = async () => {
    await supabase
      .from("cronograma_estrutura")
      .update({ tarefa_precedente_id: document.getElementById("pred").value || null })
      .eq("id", item.id);

    modal.style.display = "none";
  };

  modal.style.display = "flex";
}

/* ================= SAVE ================= */
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
