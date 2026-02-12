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
const ESPACO_BARRA = 6;

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

function diasEntre(d1,d2){
  return Math.round((new Date(d2)-new Date(d1))/86400000);
}

function formatISO(d){
  return new Date(d).toISOString().slice(0,10);
}

function formatBR(d){
  if(!d) return "";
  return new Date(d).toLocaleDateString("pt-BR");
}

/* ========================================================= */
/* ================= PESO POR DIA =========================== */
/* ========================================================= */

function calcularPesoPorDia(){

  let pesoDia={};

  registros.forEach(item=>{

    const apont = apontamentos
      .filter(a=>a.estrutura===item.estrutura);

    /* SEM REAL → DISTRIBUI PLAN */
    if(!apont.length){

      if(!item.data_inicio_plan || !item.data_fim_plan) return;

      const ini=new Date(item.data_inicio_plan);
      const fim=new Date(item.data_fim_plan);
      const dur=diasEntre(ini,fim)+1;

      const pesoDiario=item.peso_total/dur;

      for(let d=new Date(ini); d<=fim; d.setDate(d.getDate()+1)){
        const key=formatISO(d);
        pesoDia[key]=(pesoDia[key]||0)+pesoDiario;
      }
    }

    /* COM REAL → 25% POR APONTAMENTO */
    else{
      apont.forEach(ap=>{
        const key=formatISO(ap.data);
        const pesoParcial=item.peso_total/4;
        pesoDia[key]=(pesoDia[key]||0)+pesoParcial;
      });
    }

  });

  return pesoDia;
}

/* ========================================================= */
/* ================= HEADER ================================ */
/* ========================================================= */

function desenharHeader(){

  header.innerHTML="";
  gantt.innerHTML="";

  const largura=TOTAL_DIAS*PX_POR_DIA;
  header.style.width=`${largura}px`;
  gantt.style.width=`${largura}px`;

  const pesoDia=calcularPesoPorDia();

  let mesAtual=null;
  let inicioMesX=0;
  let diasMes=0;
  let pesoMes=0;
  let refMes=null;

  for(let i=0;i<=TOTAL_DIAS;i++){

    const data=new Date(DATA_BASE);
    data.setDate(data.getDate()+i);

    const x=i*PX_POR_DIA;
    const key=formatISO(data);

    /* LINHA VERTICAL */
    const v=document.createElement("div");
    v.style.position="absolute";
    v.style.left=`${x}px`;
    v.style.top="0";
    v.style.bottom="0";
    v.style.width="1px";
    v.style.background="#e5e7eb";
    gantt.appendChild(v);

    /* DIA */
    const day=document.createElement("div");
    day.style.position="absolute";
    day.style.left=`${x}px`;
    day.style.width=`${PX_POR_DIA}px`;
    day.style.fontSize="10px";
    day.style.textAlign="center";
    day.style.top="30px";

    day.innerHTML=`
      <div>${data.getDate()}</div>
      <div style="font-size:9px;color:#64748b">
        ${( (pesoDia[key]||0)/1000 ).toFixed(2)}t
      </div>
    `;

    header.appendChild(day);

    /* CONTROLE MÊS */
    if(mesAtual!==data.getMonth()){
      if(mesAtual!==null){
        criarMes(inicioMesX,diasMes,pesoMes,refMes);
      }
      mesAtual=data.getMonth();
      inicioMesX=x;
      diasMes=0;
      pesoMes=0;
      refMes=new Date(data);
    }

    pesoMes+=(pesoDia[key]||0);
    diasMes++;
  }

  criarMes(inicioMesX,diasMes,pesoMes,refMes);
}

function criarMes(x,dias,peso,ref){
  const m=document.createElement("div");
  m.style.position="absolute";
  m.style.left=`${x}px`;
  m.style.width=`${dias*PX_POR_DIA}px`;
  m.style.textAlign="center";
  m.style.fontWeight="600";
  m.style.fontSize="11px";
  m.style.top="0";
  m.textContent=
    `${ref.toLocaleDateString("pt-BR",{month:"short",year:"numeric"})} | ${(peso/1000).toFixed(1)}t`;
  header.appendChild(m);
}

/* ========================================================= */
/* ================= REAL / FORECAST ======================== */
/* ========================================================= */

function calcularReal(item){

  const ap=apontamentos
    .filter(a=>a.estrutura===item.estrutura);

  if(!ap.length) return {inicio:null,fim:null};

  ap.sort((a,b)=>new Date(a.data)-new Date(b.data));

  const inicio=ap[0].data;
  const total=ap.length*(item.peso_total/4);

  if(total>=item.peso_total)
    return {inicio,fim:ap[ap.length-1].data};

  return {inicio,fim:formatISO(new Date())};
}

function calcularForecast(item,real){

  if(!real.inicio) return {inicio:null,fim:null};

  if(real.fim && real.fim!==formatISO(new Date()))
    return {inicio:real.inicio,fim:real.fim};

  const diasExec=diasEntre(real.inicio,new Date())+1;

  const totalExecutado=
    apontamentos.filter(a=>a.estrutura===item.estrutura).length
    *(item.peso_total/4);

  if(!totalExecutado)
    return {inicio:real.inicio,fim:item.data_fim_plan};

  const media=totalExecutado/diasExec;
  const diasRest=Math.ceil((item.peso_total-totalExecutado)/media);

  const fimPrev=new Date();
  fimPrev.setDate(fimPrev.getDate()+diasRest);

  return {inicio:real.inicio,fim:formatISO(fimPrev)};
}

/* ========================================================= */
/* ================= RENDER ================================ */
/* ========================================================= */

function renderizar(){

  gantt.innerHTML="";
  leftBody.innerHTML="";

  let posY=0;
  let id=1;

  registros.forEach(item=>{

    const altura=32;

    const real=calcularReal(item);
    const forecast=calcularForecast(item,real);

    criarBarra("plan",item.data_inicio_plan,item.data_fim_plan,posY,item,true);
    posY+=altura+ESPACO_BARRA;

    criarBarra("real",real.inicio,real.fim,posY,item,false);
    posY+=altura+ESPACO_BARRA;

    criarBarra("forecast",forecast.inicio,forecast.fim,posY,item,false);
    posY+=altura+20;

    id++;
  });

  gantt.style.height=`${posY}px`;
}

/* ========================================================= */
/* ================= SUPABASE LOAD ========================== */
/* ========================================================= */

async function carregarFornecedor(){

  const {data}=await supabase
    .from("cronograma_estrutura")
    .select("fornecedor");

  if(!data||!data.length) return;

  fornecedorContainer.innerHTML="";

  const unicos=[...new Set(data.map(d=>d.fornecedor))];

  unicos.forEach((nome,i)=>{

    const btn=document.createElement("button");
    btn.textContent=nome;

    btn.onclick=()=>{
      fornecedorAtual=nome;
      document.querySelectorAll("#fornecedor button")
        .forEach(b=>b.classList.remove("active"));
      btn.classList.add("active");
      carregarCronograma();
    };

    fornecedorContainer.appendChild(btn);

    if(i===0){
      fornecedorAtual=nome;
      btn.classList.add("active");
    }
  });

  carregarCronograma();
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

/* ========================================================= */
/* ================= INIT ================================= */
/* ========================================================= */

carregarFornecedor();
