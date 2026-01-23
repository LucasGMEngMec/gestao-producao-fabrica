/*************************************************
 * SUPABASE (CLIENTE ÚNICO)
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At";

if (!window.__SB__) {
  window.__SB__ = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}
const sb = window.__SB__;

/*************************************************
 * CONFIGURAÇÕES
 *************************************************/
const DAY_WIDTH = 48;
const TOTAL_DAYS = 180;

let fornecedor = "BDR";
let itens = [];
let baseDate;

/*************************************************
 * ELEMENTOS
 *************************************************/
const gantt = document.getElementById("gantt");
const btnBDR = document.getElementById("btnBDR");
const btnBJ = document.getElementById("btnBJ");

/*************************************************
 * UTIL
 *************************************************/
const parse = d => new Date(d + "T00:00:00");
const diff = (a, b) => Math.round((b - a) / 86400000);

/*************************************************
 * CARREGAR DADOS
 *************************************************/
async function carregar() {
  gantt.innerHTML = "";

  // 🔹 NÃO filtrar por fornecedor enquanto a coluna não for garantida
  const { data, error } = await sb
    .from("cronograma_estrutura")
    .select("*")
    .order("ordem_prioridade", { ascending: true });

  if (error) {
    console.error(error);
    alert("Erro ao carregar cronograma");
    return;
  }

  itens = data || [];

  // Data base = menor data encontrada ou hoje
  baseDate = new Date();
  itens.forEach(i => {
    if (i.data_inicio_plan) {
      const d = parse(i.data_inicio_plan);
      if (d < baseDate) baseDate = d;
    }
  });

  criarCabecalho();
  itens.forEach(renderLinha);
  marcarHoje();
}

/*************************************************
 * CABEÇALHO (ANO / MÊS / DIA)
 *************************************************/
function criarCabecalho() {
  const anos = document.createElement("div");
  const meses = document.createElement("div");
  const dias = document.createElement("div");

  anos.className = meses.className = dias.className = "header-row";

  let anoAtual = null;
  let mesAtual = null;
  let spanAno = null;
  let spanMes = null;

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + i);

    // ANO
    if (d.getFullYear() !== anoAtual) {
      anoAtual = d.getFullYear();
      spanAno = document.createElement("div");
      spanAno.className = "day";
      spanAno.innerText = anoAtual;
      spanAno.style.width = "0px";
      anos.appendChild(spanAno);
    }
    spanAno.style.width =
      (parseInt(spanAno.style.width) + DAY_WIDTH) + "px";

    // MÊS
    if (d.getMonth() !== mesAtual) {
      mesAtual = d.getMonth();
      spanMes = document.createElement("div");
      spanMes.className = "day";
      spanMes.innerText = d.toLocaleString("pt-BR", { month: "short" });
      spanMes.style.width = "0px";
      meses.appendChild(spanMes);
    }
    spanMes.style.width =
      (parseInt(spanMes.style.width) + DAY_WIDTH) + "px";

    // DIA
    const dia = document.createElement("div");
    dia.className = "day";
    dia.innerText = d.getDate();
    dias.appendChild(dia);
  }

  gantt.appendChild(anos);
  gantt.appendChild(meses);
  gantt.appendChild(dias);
}

/*************************************************
 * LINHAS E BARRAS
 *************************************************/
function renderLinha(item) {
  if (!item.data_inicio_plan || !item.duracao_planejada_dias) return;

  const row = document.createElement("div");
  row.className = "row";

  const bar = document.createElement("div");
  bar.className = "bar";
  bar.innerText =
    `PLAN - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

  const inicio = parse(item.data_inicio_plan);
  bar.style.left = diff(baseDate, inicio) * DAY_WIDTH + "px";
  bar.style.width = item.duracao_planejada_dias * DAY_WIDTH + "px";

  habilitarDrag(bar, item);

  row.appendChild(bar);
  gantt.appendChild(row);
}

/*************************************************
 * DRAG
 *************************************************/
function habilitarDrag(bar, item) {
  let startX, startLeft;

  bar.onmousedown = e => {
    startX = e.clientX;
    startLeft = parseInt(bar.style.left);

    document.onmousemove = ev => {
      bar.style.left = startLeft + (ev.clientX - startX) + "px";
    };

    document.onmouseup = () => {
      document.onmousemove = null;

      const dias = Math.round(parseInt(bar.style.left) / DAY_WIDTH);
      const novaData = new Date(baseDate);
      novaData.setDate(novaData.getDate() + dias);

      item.data_inicio_plan = novaData.toISOString().slice(0, 10);
    };
  };
}

/*************************************************
 * LINHA DO DIA ATUAL
 *************************************************/
function marcarHoje() {
  const hoje = diff(baseDate, new Date()) * DAY_WIDTH;

  const linha = document.createElement("div");
  linha.className = "today-line";
  linha.style.left = hoje + "px";

  gantt.appendChild(linha);
}

/*************************************************
 * BOTÕES
 *************************************************/
btnBDR.onclick = () => {
  btnBDR.classList.add("active");
  btnBJ.classList.remove("active");
  carregar();
};

btnBJ.onclick = () => {
  btnBJ.classList.add("active");
  btnBDR.classList.remove("active");
  carregar();
};

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", carregar);
