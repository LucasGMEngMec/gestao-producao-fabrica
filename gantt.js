console.log("Gantt carregado corretamente");

/* ================= SUPABASE ================= */
const supabase = window.createSupabaseClient(
  "https://dklmejmlovtcadlicnhu.supabase.co",
  "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At"
);

/* ================= CONFIG ================= */
let PX_POR_DIA = 30;
const DATA_BASE = new Date("2026-01-01");
const TOTAL_DIAS = 240;
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
let dependencias = [];
let fornecedorAtual = null;

/* ================= UTIL ================= */
function diasEntre(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}

function isDiaUtil(data) {
  const d = data.getDay();
  return d !== 0 && d !== 6;
}

function dateFromLeft(px) {
  const d = new Date(DATA_BASE);
  d.setDate(d.getDate() + Math.round(px / PX_POR_DIA));
  return d;
}

/* ================= HEADER + PESO ================= */
function desenharHeader() {
  gantt.innerHTML = "";
  header.innerHTML = "";

  const largura = TOTAL_DIAS * PX_POR_DIA;
  gantt.style.width = `${largura}px`;
  header.style.width = `${largura}px`;

  const pesoDia = {};
  const pesoMes = {};

  registros.forEach(r => {
    if (!r.data_inicio_plan || !r.data_fim_plan || !r.peso_total_kg) return;

    const inicio = new Date(r.data_inicio_plan);
    const fim = new Date(r.data_fim_plan);

    const diasUteis = [];
    for (let d = new Date(inicio); d <= fim; d.setDate(d.getDate() + 1)) {
      if (isDiaUtil(d)) diasUteis.push(new Date(d));
    }

    const pesoDiario = r.peso_total_kg / diasUteis.length;

    diasUteis.forEach(d => {
      const keyDia = d.toISOString().slice(0, 10);
      const keyMes = `${d.getFullYear()}-${d.getMonth() + 1}`;

      pesoDia[keyDia] = (pesoDia[keyDia] || 0) + pesoDiario;
      pesoMes[keyMes] = (pesoMes[keyMes] || 0) + pesoDiario;
    });
  });

  for (let i = 0; i <= TOTAL_DIAS; i++) {
    const x = i * PX_POR_DIA;
    const data = new Date(DATA_BASE);
    data.setDate(data.getDate() + i);

    const line = document.createElement("div");
    line.className = "grid-line";
    line.style.left = `${x}px`;
    gantt.appendChild(line);

    const diaKey = data.toISOString().slice(0, 10);
    const dia = document.createElement("div");
    dia.className = "day-label";
    dia.style.left = `${x}px`;
    dia.innerHTML = `
      ${data.getDate()}
      <div style="font-size:9px;color:#2563eb">
        ${(pesoDia[diaKey] || 0).toFixed(1)}
      </div>
    `;

    if (data.getDay() === 6) dia.style.color = "#ca8a04";
    if (data.getDay() === 0) dia.style.color = "#dc2626";

    header.appendChild(dia);

    if (data.getDate() === 1) {
      const mesKey = `${data.getFullYear()}-${data.getMonth() + 1}`;
      const mes = document.createElement("div");
      mes.className = "month-label";
      mes.style.left = `${x}px`;
      mes.style.width = `${PX_POR_DIA * 30}px`;
      mes.innerHTML = `
        ${data.toLocaleDateString("pt-BR", { month: "short", year: "numeric" })}
        <div style="font-size:10px">
          ${(pesoMes[mesKey] || 0).toFixed(1)} t
        </div>
      `;
      header.appendChild(mes);
    }
  }

  desenharLinhaHoje();
}

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

/* ================= LOAD ================= */
async function carregarCronograma() {
  desenharHeader();

  registros = (await supabase
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtual)).data || [];

  apontamentos = (await supabase
    .from("apontamentos")
    .select("*")
    .eq("fornecedor", fornecedorAtual)).data || [];

  dependencias = (await supabase
    .from("cronograma_dependencias")
    .select("*")).data || [];

  renderizar();
}

/* ================= RENDER ================= */
function renderizar() {
  let linha = 0;

  registros.forEach(item => {
    linha = criarBarra(item, "PLAN", item.data_inicio_plan, item.data_fim_plan, linha);

    const prod = apontamentos.filter(a =>
      a.obra === item.obra &&
      a.instalacao === item.instalacao &&
      a.estrutura === item.estrutura
    );

    if (prod.length > 0) {
      const datas = prod.map(p => new Date(p.data));
      linha = criarBarra(item, "REAL",
        new Date(Math.min(...datas)),
        new Date(Math.max(...datas)),
        linha
      );
    }

    if (item.data_fim_forecast) {
      linha = criarBarra(item, "FORECAST",
        item.data_inicio_real || item.data_inicio_plan,
        item.data_fim_forecast,
        linha
      );
    }

    linha++;
  });
}

function criarBarra(item, tipo, inicio, fim, linha) {
  if (!inicio || !fim) return linha;

  const bar = document.createElement("div");
  bar.className = `bar ${tipo.toLowerCase()}`;
  bar.style.left = `${diasEntre(DATA_BASE, inicio) * PX_POR_DIA}px`;
  bar.style.top = `${linha * ALTURA_LINHA + 6}px`;
  bar.style.width = `${Math.max(1, diasEntre(inicio, fim)) * PX_POR_DIA}px`;
  bar.textContent = `${tipo} - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

  if (tipo === "PLAN") {
    bar.onmousedown = e => drag(bar, item, e);
  }

  bar.ondblclick = () => abrirModal(item, tipo);
  gantt.appendChild(bar);

  return linha + 1;
}

/* ================= MODAL ================= */
function abrirModal(item, tipo) {
  if (tipo === "PLAN") abrirModalPlan(item);
  if (tipo === "REAL") abrirModalReal(item);
  if (tipo === "FORECAST") abrirModalForecast(item);
}

function abrirModalPlan(item) {
  const preds = dependencias.filter(d => d.tarefa_dependente_id === item.id);
  const sucs = dependencias.filter(d => d.tarefa_id === item.id);

  modalContent.innerHTML = `
    <h3>PLAN - ${item.obra} - ${item.instalacao} - ${item.estrutura}</h3>
    <p>Início: ${item.data_inicio_plan}</p>
    <p>Fim: ${item.data_fim_plan}</p>
    <p>Peso: ${item.peso_total_kg ?? "-"} kg</p>

    <label>Predecessoras</label>
    <select id="pred" multiple>
      ${registros.filter(r => r.id !== item.id)
        .map(r => `<option value="${r.id}" ${preds.some(p => p.tarefa_id === r.id) ? "selected" : ""}>
          ${r.obra} - ${r.estrutura}
        </option>`).join("")}
    </select>

    <label>Sucessoras</label>
    <select id="suc" multiple>
      ${registros.filter(r => r.id !== item.id)
        .map(r => `<option value="${r.id}" ${sucs.some(s => s.tarefa_dependente_id === r.id) ? "selected" : ""}>
          ${r.obra} - ${r.estrutura}
        </option>`).join("")}
    </select>

    <button id="salvarDep">Salvar</button>
    <button onclick="modal.style.display='none'">Fechar</button>
  `;

  document.getElementById("salvarDep").onclick = async () => {
    await supabase.from("cronograma_dependencias").delete().or(
      `tarefa_id.eq.${item.id},tarefa_dependente_id.eq.${item.id}`
    );

    const predsSel = [...document.getElementById("pred").selectedOptions];
    for (const p of predsSel) {
      await supabase.from("cronograma_dependencias")
        .insert({ tarefa_id: p.value, tarefa_dependente_id: item.id });
    }

    const sucsSel = [...document.getElementById("suc").selectedOptions];
    for (const s of sucsSel) {
      await supabase.from("cronograma_dependencias")
        .insert({ tarefa_id: item.id, tarefa_dependente_id: s.value });
    }

    modal.style.display = "none";
    carregarCronograma();
  };

  modal.style.display = "flex";
}

function abrirModalReal(item) {
  const prod = apontamentos.filter(a =>
    a.obra === item.obra &&
    a.instalacao === item.instalacao &&
    a.estrutura === item.estrutura
  );

  const datas = prod.map(p => new Date(p.data));
  const pesoAtual = prod.length; // placeholder

  modalContent.innerHTML = `
    <h3>REAL - ${item.obra} - ${item.estrutura}</h3>
    <p>Início real: ${datas.length ? datas[0].toISOString().slice(0,10) : "-"}</p>
    <p>Fim real: ${prod.length ? datas[datas.length - 1].toISOString().slice(0,10) : "-"}</p>
    <p>Peso produzido: ${pesoAtual} kg</p>
    <p>Percentual: ${(pesoAtual / item.peso_total_kg * 100).toFixed(1)}%</p>
    <button onclick="modal.style.display='none'">Fechar</button>
  `;
  modal.style.display = "flex";
}

function abrirModalForecast(item) {
  modalContent.innerHTML = `
    <h3>FORECAST - ${item.obra} - ${item.estrutura}</h3>
    <p>Início real: ${item.data_inicio_real ?? "-"}</p>
    <p>Fim forecast: ${item.data_fim_forecast ?? "-"}</p>
    <button onclick="modal.style.display='none'">Fechar</button>
  `;
  modal.style.display = "flex";
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

    item.data_inicio_plan = dateFromLeft(bar.offsetLeft).toISOString().slice(0,10);
    const dur = diasEntre(item.data_inicio_plan, item.data_fim_plan);
    const fim = new Date(item.data_inicio_plan);
    fim.setDate(fim.getDate() + dur);
    item.data_fim_plan = fim.toISOString().slice(0,10);
  };
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
  alert("Cronograma salvo");
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
