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
let LINHA_BASE = 34;

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

function parseBR(text){
  const [dia,mes,ano]=text.split("/");
  return `${ano}-${mes}-${dia}`;
}

/* ================= ZOOM (CORRIGIDO) ================= */

document.querySelectorAll("[data-zoom]").forEach(btn=>{
  btn.onclick=()=>{
    PX_POR_DIA = Number(btn.dataset.zoom);
    desenharHeader();
    renderizar();
  };
});

/* ================= PESO ================= */

function calcularPesoPorDia(){

  const pesoDia={};

  registros.forEach(item=>{

    const ap=apontamentos.filter(a=>a.estrutura===item.estrutura);

    if(!ap.length){

      if(!item.data_inicio_plan || !item.data_fim_plan) return;

      const ini=new Date(item.data_inicio_plan);
      const fim=new Date(item.data_fim_plan);
      const dur=diasEntre(ini,fim)+1;

      const pesoDiario=item.peso_total/dur;

      for(let d=new Date(ini); d<=fim; d.setDate(d.getDate()+1)){
        const key=formatISO(d);
        pesoDia[key]=(pesoDia[key]||0)+pesoDiario;
      }

    }else{

      ap.forEach(a=>{
        const key=formatISO(a.data);
        pesoDia[key]=(pesoDia[key]||0)+(item.peso_total/4);
      });
    }

  });

  return pesoDia;
}

/* ================= HEADER ================= */

function desenharHeader(){

  header.innerHTML="";
  gantt.innerHTML="";

  const largura=TOTAL_DIAS*PX_POR_DIA;
  header.style.width=`${largura}px`;
  gantt.style.width=`${largura}px`;

  const pesoDia=calcularPesoPorDia();

  for(let i=0;i<=TOTAL_DIAS;i++){

    const data=new Date(DATA_BASE);
    data.setDate(data.getDate()+i);
    const x=i*PX_POR_DIA;
    const key=formatISO(data);

    const v=document.createElement("div");
    v.style.position="absolute";
    v.style.left=`${x}px`;
    v.style.top="0";
    v.style.bottom="0";
    v.style.width="1px";
    v.style.background="#e5e7eb";
    gantt.appendChild(v);

    const day=document.createElement("div");
    day.style.position="absolute";
    day.style.left=`${x}px`;
    day.style.width=`${PX_POR_DIA}px`;
    day.style.top="30px";
    day.style.textAlign="center";
    day.style.fontSize="10px";

    day.innerHTML=`
      <div>${data.getDate()}</div>
      <div style="font-size:9px;color:#64748b">
        ${((pesoDia[key]||0)/1000).toFixed(2)}t
      </div>
    `;

    header.appendChild(day);
  }
}

/* ================= REAL ================= */

function calcularReal(item){

  const ap=apontamentos.filter(a=>a.estrutura===item.estrutura);

  if(!ap.length) return {inicio:null,fim:null};

  ap.sort((a,b)=>new Date(a.data)-new Date(b.data));

  const inicio=ap[0].data;
  const total=ap.length*(item.peso_total/4);

  if(total>=item.peso_total)
    return {inicio,fim:ap[ap.length-1].data};

  return {inicio,fim:formatISO(new Date())};
}

/* ================= FORECAST (CORRIGIDO) ================= */

function calcularForecast(item,real){

  if(!real.inicio) return {inicio:null,fim:null};

  const ap=apontamentos.filter(a=>a.estrutura===item.estrutura);
  const total=ap.length*(item.peso_total/4);

  if(!total) return {inicio:null,fim:null};

  const diasExec=diasEntre(real.inicio,new Date())+1;
  const media=total/diasExec;
  const diasRest=Math.ceil((item.peso_total-total)/media);

  const fimPrev=new Date(real.inicio);
  fimPrev.setDate(new Date().getDate()+diasRest);

  return {
    inicio: real.inicio,
    fim: formatISO(new Date(new Date().setDate(new Date().getDate()+diasRest)))
  };
}

/* ================= DEPENDÊNCIA + GAP ================= */

function aplicarDependencias(){

  registros.forEach((item,index)=>{

    if(!item.predecessora) return;

    const predIndex=Number(item.predecessora)-1;
    const pred=registros[predIndex];

    if(!pred) return;

    const gap=Number(item.gap||0);

    const novaIni=new Date(pred.data_fim_plan);
    novaIni.setDate(novaIni.getDate()+1+gap);

    const dur=diasEntre(item.data_inicio_plan,item.data_fim_plan);

    const novaFim=new Date(novaIni);
    novaFim.setDate(novaFim.getDate()+dur);

    item.data_inicio_plan=formatISO(novaIni);
    item.data_fim_plan=formatISO(novaFim);
  });
}

/* ================= RENDER ================= */

function renderizar(){

  aplicarDependencias();

  gantt.innerHTML="";
  leftBody.innerHTML="";

  let linhaAtual=0;
  let idSequencial=1;

  registros.forEach(item=>{

    const real=calcularReal(item);
    const forecast=calcularForecast(item,real);

    renderLinha(item,linhaAtual,"PLAN",
      idSequencial,item.data_inicio_plan,item.data_fim_plan,true);

    criarBarra("plan",item.data_inicio_plan,
      item.data_fim_plan,linhaAtual,item,true);

    linhaAtual++;

    renderLinha(item,linhaAtual,"REAL",
      idSequencial,real.inicio,real.fim,false);

    criarBarra("real",real.inicio,
      real.fim,linhaAtual,item);

    linhaAtual++;

    renderLinha(item,linhaAtual,"FORECAST",
      idSequencial,forecast.inicio,forecast.fim,false);

    criarBarra("forecast",forecast.inicio,
      forecast.fim,linhaAtual,item);

    linhaAtual+=2;
    idSequencial++;
  });

  gantt.style.height=`${linhaAtual*LINHA_BASE}px`;
}

/* ================= COLUNA FIXA ================= */

function renderLinha(item,row,tipo,id,inicio,fim,editavel){

  const dur=(inicio&&fim)?diasEntre(inicio,fim)+1:"";

  const div=document.createElement("div");
  div.style.position="absolute";
  div.style.top=`${row*LINHA_BASE}px`;
  div.style.height=`${LINHA_BASE}px`;
  div.style.display="grid";
  div.style.gridTemplateColumns=
    "40px 60px 1fr 1fr 1fr 90px 90px 60px 60px";
  div.style.fontSize="10px";
  div.style.alignItems="center";
  div.style.borderBottom="1px solid #e5e7eb";

  div.innerHTML=`
    <div>${id}</div>
    <div>${tipo}</div>
    <div>${item.obra||""}</div>
    <div>${item.instalacao||""}</div>
    <div>${item.estrutura||""}</div>
    <div ${editavel?'contenteditable data-field="inicio"':''}>${formatBR(inicio)}</div>
    <div ${editavel?'contenteditable data-field="fim"':''}>${formatBR(fim)}</div>
    <div ${editavel?'contenteditable data-field="duracao"':''}>${dur}</div>
    <div contenteditable data-field="pred">${item.predecessora||""}</div>
    <div contenteditable data-field="gap">${item.gap||0}</div>
  `;

  div.querySelectorAll("[data-field]").forEach(el=>{
    el.onblur=()=>{
      if(el.dataset.field==="pred")
        item.predecessora=el.textContent.trim();

      if(el.dataset.field==="gap")
        item.gap=Number(el.textContent)||0;

      desenharHeader();
      renderizar();
    };
  });

  leftBody.appendChild(div);
}
