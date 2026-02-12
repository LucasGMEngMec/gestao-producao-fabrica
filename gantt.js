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
const LINHA_ALTURA = 30;

/* ================= DOM ================= */
const gantt = document.getElementById("gantt");
const header = document.getElementById("gantt-header");
const leftBody = document.getElementById("gantt-left-body");
const fornecedorContainer = document.getElementById("fornecedor");

/* ================= STATE ================= */
let registros = [];
let apontamentos = [];
let fornecedorAtual = null;

/* ================= UTIL ================= */
function diasEntre(d1, d2) {
  return Math.round((new Date(d2) - new Date(d1)) / 86400000);
}
function formatDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

/* ================= HEADER ================= */
function desenharHeader() {

  header.innerHTML = "";
  gantt.innerHTML = "";

  const largura = TOTAL_DIAS * PX_POR_DIA;
  header.style.width = `${largura}px`;
  gantt.style.width = `${largura}px`;

  for (let i = 0; i <= TOTAL_DIAS; i++) {

    const data = new Date(DATA_BASE);
    data.setDate(data.getDate() + i);
    const x = i * PX_POR_DIA;

    const line = document.createElement("div");
    line.className = "grid-line";
    line.style.left = `${x}px`;
    gantt.appendChild(line);

    const day = document.createElement("div");
    day.style.position = "absolute";
    day.style.left = `${x}px`;
    day.style.width = `${PX_POR_DIA}px`;
    day.style.textAlign = "center";
    day.style.fontSize = "11px";
    day.innerHTML = `<div>${data.getDate()}</div>`;

    const diaSemana = data.getDay();
    if (diaSemana === 6) day.style.background = "#fef3c7";
    if (diaSemana === 0) day.style.background = "#fee2e2";

    header.appendChild(day);
  }
}

/* ================= REGRAS REAL / FORECAST ================= */
function calcularReal(item) {

  const apont = apontamentos
    .filter(a => a.estrutura === item.estrutura);

  if (!apont.length) return { inicio: null, fim: null };

  apont.sort((a,b)=> new Date(a.data) - new Date(b.data));

  const inicio = apont[0].data;
  const totalExecutado = apont.reduce((s,a)=> s + a.peso,0);

  if (totalExecutado >= item.peso_total)
    return { inicio, fim: apont[apont.length-1].data };

  return { inicio, fim: null };
}

function calcularForecast(item, real) {

  if (!real.inicio) return { inicio:null, fim:null };

  if (real.fim)
    return { inicio: real.inicio, fim: real.fim };

  const diasExecutados = diasEntre(real.inicio, new Date()) + 1;
  const apont = apontamentos
    .filter(a => a.estrutura === item.estrutura);

  const totalExecutado = apont.reduce((s,a)=> s + a.peso,0);
  if (!totalExecutado) return { inicio: real.inicio, fim: item.data_fim_plan };

  const mediaDia = totalExecutado / diasExecutados;
  const diasRestantes = Math.ceil((item.peso_total - totalExecutado) / mediaDia);

  const fimPrev = new Date();
  fimPrev.setDate(fimPrev.getDate() + diasRestantes);

  return { inicio: real.inicio, fim: formatDate(fimPrev) };
}

/* ================= RENDER ================= */
function renderizar() {

  gantt.innerHTML = "";
  leftBody.innerHTML = "";

  registros.forEach((item, index) => {

    const idUnico = index + 1;
    const base = index * 3;

    const real = calcularReal(item);
    const forecast = calcularForecast(item, real);

    renderLinha(item, base, "PLAN", idUnico,
      item.data_inicio_plan, item.data_fim_plan);

    renderLinha(item, base+1, "REAL", idUnico,
      real.inicio, real.fim);

    renderLinha(item, base+2, "FORECAST", idUnico,
      forecast.inicio, forecast.fim);

    criarBarra("plan", item.data_inicio_plan,
      item.data_fim_plan, base, item, true);

    criarBarra("real", real.inicio,
      real.fim, base+1, item);

    criarBarra("forecast", forecast.inicio,
      forecast.fim, base+2, item);
  });

  gantt.style.height =
    `${registros.length * 3 * LINHA_ALTURA}px`;
}

/* ================= COLUNAS FIXAS ================= */
function renderLinha(item,row,tipo,id,inicio,fim){

  const dur = (inicio && fim)
    ? diasEntre(inicio,fim)+1 : "";

  const div = document.createElement("div");
  div.style.position="absolute";
  div.style.top=`${row*LINHA_ALTURA}px`;
  div.style.height=`${LINHA_ALTURA}px`;
  div.style.display="grid";
  div.style.gridTemplateColumns=
    "50px 70px repeat(8,1fr)";
  div.style.fontSize="12px";
  div.style.alignItems="center";
  div.style.borderBottom="1px solid #e5e7eb";

  div.innerHTML=`
    <div>${id}</div>
    <div>${tipo}</div>
    <div>${item.obra||""}</div>
    <div>${item.instalacao||""}</div>
    <div>${item.estrutura||""}</div>
    <div contenteditable data-field="inicio">${inicio||""}</div>
    <div contenteditable data-field="fim">${fim||""}</div>
    <div>${dur}</div>
    <div>${item.predecessora||""}</div>
    <div>${item.sucessora||""}</div>
  `;

  if(tipo==="PLAN"){
    div.querySelectorAll("[data-field]")
      .forEach(el=>{
        el.onblur=()=>{
          if(el.dataset.field==="inicio")
            item.data_inicio_plan=el.textContent.trim();
          if(el.dataset.field==="fim")
            item.data_fim_plan=el.textContent.trim();
          desenharHeader();
          renderizar();
        };
      });
  }

  leftBody.appendChild(div);
}

/* ================= BARRAS ================= */
function criarBarra(tipo,inicio,fim,row,item,drag=false){

  if(!inicio||!fim) return;

  const bar=document.createElement("div");
  bar.className=`bar ${tipo}`;
  bar.style.left=
    `${diasEntre(DATA_BASE,inicio)*PX_POR_DIA}px`;
  bar.style.top=
    `${row*LINHA_ALTURA+2}px`;
  bar.style.width=
    `${(diasEntre(inicio,fim)+1)*PX_POR_DIA}px`;

  bar.textContent=
    `${tipo.toUpperCase()} - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

  if(drag) ativarDrag(bar,item);

  gantt.appendChild(bar);
}

function ativarDrag(bar,item){

  let startX;

  bar.onmousedown=e=>{
    startX=e.clientX;

    document.onmousemove=ev=>{
      const dx=ev.clientX-startX;
      bar.style.left=
        `${bar.offsetLeft+dx}px`;
      startX=ev.clientX;
    };

    document.onmouseup=()=>{
      document.onmousemove=null;
      document.onmouseup=null;

      const dias=
        Math.round(bar.offsetLeft/PX_POR_DIA);

      const novaIni=new Date(DATA_BASE);
      novaIni.setDate(
        novaIni.getDate()+dias);

      const dur=
        diasEntre(item.data_inicio_plan,
                   item.data_fim_plan);

      const novaFim=new Date(novaIni);
      novaFim.setDate(
        novaIni.getDate()+dur);

      item.data_inicio_plan=
        formatDate(novaIni);
      item.data_fim_plan=
        formatDate(novaFim);

      desenharHeader();
      renderizar();
    };
  };
}

/* ================= FORNECEDOR ================= */
async function carregarFornecedor(){

  const {data}=
    await supabase
      .from("cronograma_estrutura")
      .select("fornecedor");

  fornecedorContainer.innerHTML="";

  [...new Set(data.map(d=>d.fornecedor))]
    .forEach((nome,i)=>{

      const btn=document.createElement("button");
      btn.textContent=nome;
      btn.className="zoom-btn";
      btn.onclick=()=>{
        fornecedorAtual=nome;
        document
          .querySelectorAll("#fornecedor button")
          .forEach(b=>b.classList.remove("active"));
        btn.classList.add("active");
        carregarCronograma();
      };

      if(i===0) btn.classList.add("active");
      fornecedorContainer.appendChild(btn);
    });
}

async function carregarCronograma(){

  const {data}=await supabase
    .from("cronograma_estrutura")
    .select("*")
    .eq("fornecedor",fornecedorAtual);

  const {data:ap}=await supabase
    .from("apontamentos")
    .select("*");

  registros=data||[];
  apontamentos=ap||[];

  desenharHeader();
  renderizar();
}

/* ================= INIT ================= */
carregarFornecedor();
