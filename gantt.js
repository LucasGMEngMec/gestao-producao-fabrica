console.log("JS carregado corretamente");

/* ================= CONFIG ================= */

let PX_POR_DIA = 30;
const DATA_BASE = new Date("2026-01-01");
const TOTAL_DIAS = 220;
const ESPACO_BARRA = 6;

/* ================= DOM ================= */

const gantt = document.getElementById("gantt");
const header = document.getElementById("gantt-header");
const leftBody = document.getElementById("gantt-left-body");

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

/* ========================================================= */
/* ===================== PESOS ============================== */
/* ========================================================= */

function calcularPesoPorDia(){

  let pesoDia={};

  registros.forEach(item=>{

    const apont = apontamentos
      .filter(a=>a.estrutura===item.estrutura);

    /* ================= SEM REAL → DISTRIBUI PLAN ================= */

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

    /* ================= COM REAL → 25% POR APONTAMENTO ================= */

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
/* ===================== HEADER ============================= */
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

    /* CONTROLE DE MÊS */

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
/* ===================== RENDER ============================= */
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

    renderLinha(item,posY,"PLAN",id,item.data_inicio_plan,item.data_fim_plan,true);
    criarBarra("plan",item.data_inicio_plan,item.data_fim_plan,posY,item,true);

    posY+=altura+ESPACO_BARRA;

    renderLinha(item,posY,"REAL",id,real.inicio,real.fim,false);
    criarBarra("real",real.inicio,real.fim,posY,item,false);

    posY+=altura+ESPACO_BARRA;

    renderLinha(item,posY,"FORECAST",id,forecast.inicio,forecast.fim,false);
    criarBarra("forecast",forecast.inicio,forecast.fim,posY,item,false);

    posY+=altura+20;

    id++;
  });

  gantt.style.height=`${posY}px`;
}

/* ========================================================= */
/* ================= COLUNA FIXA ============================ */
/* ========================================================= */

function renderLinha(item,top,tipo,id,inicio,fim,editavel){

  const dur=(inicio&&fim)?diasEntre(inicio,fim)+1:"";

  const div=document.createElement("div");
  div.style.position="absolute";
  div.style.top=`${top}px`;
  div.style.height="32px";
  div.style.display="grid";
  div.style.gridTemplateColumns=
    "40px 60px 1fr 1fr 1fr 90px 90px 60px 60px 60px";
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
    <div ${editavel?'contenteditable data-field="pred"':''}>${item.predecessora||""}</div>
    <div ${editavel?'contenteditable data-field="suc"':''}>${item.sucessora||""}</div>
  `;

  if(editavel){
    div.querySelectorAll("[data-field]").forEach(el=>{
      el.onblur=()=>{
        if(el.dataset.field==="inicio")
          item.data_inicio_plan=parseBR(el.textContent.trim());

        if(el.dataset.field==="fim")
          item.data_fim_plan=parseBR(el.textContent.trim());

        if(el.dataset.field==="duracao"){
          const dias=Number(el.textContent);
          const novaFim=new Date(item.data_inicio_plan);
          novaFim.setDate(novaFim.getDate()+dias-1);
          item.data_fim_plan=formatISO(novaFim);
        }

        if(el.dataset.field==="pred")
          item.predecessora=el.textContent.trim();

        if(el.dataset.field==="suc")
          item.sucessora=el.textContent.trim();

        desenharHeader();
        renderizar();
      };
    });
  }

  leftBody.appendChild(div);
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
/* ================= INIT ================================== */
/* ========================================================= */

carregarFornecedor();
