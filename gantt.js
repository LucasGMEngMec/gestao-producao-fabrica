console.log("JS carregado corretamente");

/*************************************************
 * CONFIGURAÇÃO SUPABASE
 *************************************************/
const SUPABASE_URL = "https://dklmejmlovtcadlicnhu.supabase.co";
const SUPABASE_KEY = "SUA_CHAVE_PUBLICA_AQUI";

const supabaseClient = supabase.createClient(
  SUPABASE_URL,
  SUPABASE_KEY
);

/*************************************************
 * CONSTANTES
 *************************************************/
const DAY_WIDTH = 32;          // largura do dia (px)
const TOTAL_DAYS = 240;        // horizonte do gantt (~8 meses)

/*************************************************
 * ELEMENTOS
 *************************************************/
const gantt = document.getElementById("gantt");
const btnSalvar = document.getElementById("btnSalvar");
const btnBDR = document.getElementById("btnBDR");
const btnBJ = document.getElementById("btnBJ");

/*************************************************
 * ESTADO
 *************************************************/
let fornecedorAtivo = "BDR";
let tarefas = [];
let inicioGlobal = null;

/*************************************************
 * FUNÇÕES DE DATA
 *************************************************/
function parseDate(d) {
  return new Date(d + "T00:00:00");
}

function diffDays(a, b) {
  return Math.round((b - a) / 86400000);
}

function formatISO(date) {
  return date.toISOString().slice(0, 10);
}

/*************************************************
 * CARREGAR DADOS
 *************************************************/
async function carregarDados() {
  gantt.innerHTML = "";

  const { data, error } = await supabaseClient
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor", fornecedorAtivo)
    .order("ordem_prioridade", { ascending: true });

  if (error) {
    console.error(error);
    alert("Erro ao carregar dados");
    return;
  }

  tarefas = data;

  definirInicioGlobal();
  criarTimeline();
  criarLinhas();
}

/*************************************************
 * INÍCIO GLOBAL (menor data)
 *************************************************/
function definirInicioGlobal() {
  inicioGlobal = new Date();

  tarefas.forEach(t => {
    if (t.data_inicio_plan) {
      const d = parseDate(t.data_inicio_plan);
      if (d < inicioGlobal) inicioGlobal = d;
    }
  });

  inicioGlobal.setDate(inicioGlobal.getDate() - 5);
}

/*************************************************
 * TIMELINE (ANO / MÊS / DIA)
 *************************************************/
function criarTimeline() {
  const container = document.createElement("div");
  container.className = "timeline";

  const anos = document.createElement("div");
  const meses = document.createElement("div");
  const dias = document.createElement("div");

  anos.className = "timeline-anos";
  meses.className = "timeline-meses";
  dias.className = "timeline-dias";

  let dataAtual = new Date(inicioGlobal);

  let anoAtual = null;
  let mesAtual = null;
  let larguraMes = 0;

  for (let i = 0; i < TOTAL_DAYS; i++) {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();

    if (ano !== anoAtual) {
      const a = document.createElement("div");
      a.style.width = "0px";
      a.innerText = ano;
      anos.appendChild(a);
      anoAtual = ano;
    }

    if (mes !== mesAtual) {
      if (meses.lastChild) {
        meses.lastChild.style.width = larguraMes + "px";
      }
      const m = document.createElement("div");
      m.innerText = dataAtual.toLocaleString("pt-BR", { month: "short" });
      m.style.width = "0px";
      meses.appendChild(m);
      larguraMes = 0;
      mesAtual = mes;
    }

    const d = document.createElement("div");
    d.className = "timeline-dia";
    d.style.width = DAY_WIDTH + "px";
    d.innerText = dataAtual.getDate();
    dias.appendChild(d);

    larguraMes += DAY_WIDTH;
    dataAtual.setDate(dataAtual.getDate() + 1);
  }

  if (meses.lastChild) {
    meses.lastChild.style.width = larguraMes + "px";
  }

  container.appendChild(anos);
  container.appendChild(meses);
  container.appendChild(dias);

  gantt.appendChild(container);
}

/*************************************************
 * LINHAS E BARRAS
 *************************************************/
function criarLinhas() {
  tarefas.forEach(t => {
    if (!t.data_inicio_plan || !t.duracao_planejada_dias) return;

    const linha = document.createElement("div");
    linha.className = "linha";

    const area = document.createElement("div");
    area.className = "barra-area";

    const barra = document.createElement("div");
    barra.className = "barra";
    barra.innerText =
      `PLAN - ${t.obra} - ${t.instalacao} - ${t.estrutura}`;

    const inicio = parseDate(t.data_inicio_plan);
    const offset = diffDays(inicioGlobal, inicio);

    barra.style.left = offset * DAY_WIDTH + "px";
    barra.style.width = t.duracao_planejada_dias * DAY_WIDTH + "px";

    habilitarDrag(barra, t);

    area.appendChild(barra);
    linha.appendChild(area);
    gantt.appendChild(linha);
  });
}

/*************************************************
 * DRAG DA BARRA
 *************************************************/
function habilitarDrag(barra, tarefa) {
  let startX = 0;
  let startLeft = 0;

  barra.onmousedown = e => {
    startX = e.clientX;
    startLeft = barra.offsetLeft;
    document.onmousemove = mover;
    document.onmouseup = soltar;
  };

  function mover(e) {
    const delta = e.clientX - startX;
    const dias = Math.round(delta / DAY_WIDTH);
    barra.style.left = startLeft + dias * DAY_WIDTH + "px";
  }

  function soltar() {
    const dias = Math.round(barra.offsetLeft / DAY_WIDTH);
    const novaData = new Date(inicioGlobal);
    novaData.setDate(novaData.getDate() + dias);

    tarefa.data_inicio_plan = formatISO(novaData);

    document.onmousemove = null;
    document.onmouseup = null;
  }
}

/*************************************************
 * SALVAR
 *************************************************/
btnSalvar.onclick = async () => {
  for (const t of tarefas) {
    await supabaseClient
      .from("cronograma_estrutura")
      .update({
        data_inicio_plan: t.data_inicio_plan
      })
      .eq("id", t.id);
  }
  alert("Cronograma salvo");
};

/*************************************************
 * FILTROS
 *************************************************/
btnBDR.onclick = () => {
  fornecedorAtivo = "BDR";
  carregarDados();
};

btnBJ.onclick = () => {
  fornecedorAtivo = "BJ";
  carregarDados();
};

/*************************************************
 * INIT
 *************************************************/
document.addEventListener("DOMContentLoaded", carregarDados);
