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
let LINHA_BASE = 28;

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

/* ================= ZOOM ================= */

document.querySelectorAll("[data-zoom]").forEach(btn=>{
  btn.onclick=()=>{
    PX_POR_DIA=Number(btn.dataset.zoom);

    document.querySelectorAll("[data-zoom]")
      .forEach(b=>b.classList.remove("active"));

    btn.classList.add("active");

    desenharHeader();
    renderizar();
  };
});

/* ================= HEADER ================= */

function desenharHeader(){

  header.innerHTML="";
  gantt.innerHTML="";

  const largura=TOTAL_DIAS*PX_POR_DIA;
  header.style.width=`${largura}px`;
  gantt.style.width=`${largura}px`;

  let mesAtual=null;
  let inicioMesX=0;
  let diasMes=0;
  let refMes=null;

  for(let i=0;i<=TOTAL_DIAS;i++){

    const data=new Date(DATA_BASE);
    data.setDate(data.getDate()+i);

    const x=i*PX_POR_DIA;

    /* linha vertical */
    const v=document.createElement("div");
    v.style.position="absolute";
    v.style.left=`${x}px`;
    v.style.top="0";
    v.style.bottom="0";
    v.style.width="1px";
    v.style.background="#e5e7eb";
    gantt.appendChild(v);

    /* dias */
    const day=document.createElement("div");
    day.style.position="absolute";
    day.style.left=`${x}px`;
    day.style.width=`${PX_POR_DIA}px`;
    day.style.fontSize="10px";
    day.style.textAlign="center";
    day.style.top="30px";
    day.textContent=data.getDate();

    if(data.getDay()===6) day.style.background="#fef3c7";
    if(data.getDay()===0) day.style.background="#fee2e2";

    header.appendChild(day);

    /* mês */
    if(mesAtual!==data.getMonth()){
      if(mesAtual!==null){
        criarMes(inicioMesX,diasMes,refMes);
      }
      mesAtual=data.getMonth();
      inicioMesX=x;
      diasMes=0;
      refMes=new Date(data);
    }
    diasMes++;
  }

  criarMes(inicioMesX,diasMes,refMes);
}

function criarMes(x,dias,ref){
  const m=document.createElement("div");
  m.style.position="absolute";
  m.style.left=`${x}px`;
  m.style.width=`${dias*PX_POR_DIA}px`;
  m.style.textAlign="center";
  m.style.fontWeight="600";
  m.style.fontSize="11px";
  m.style.top="0";
  m.textContent=
    ref.toLocaleDateString("pt-BR",{month:"short",year:"numeric"});
  header.appendChild(m);
}

/* ================= REAL ================= */

function calcularReal(item){

  const ap=apontamentos
    .filter(a=>a.estrutura===item.estrutura);

  if(!ap.length) return {inicio:null,fim:null};

  ap.sort((a,b)=>new Date(a.data)-new Date(b.data));

  const inicio=ap[0].data;
  const total=ap.reduce((s,a)=>s+a.peso,0);

  if(total>=item.peso_total)
    return {inicio,fim:ap[ap.length-1].data};

  return {inicio,fim:formatISO(new Date())};
}

/* ================= FORECAST ================= */

function calcularForecast(item,real){

  if(!real.inicio) return {inicio:null,fim:null};

  if(real.fim && real.fim!==formatISO(new Date()))
    return {inicio:real.inicio,fim:real.fim};

  const diasExec=diasEntre(real.inicio,new Date())+1;
  const ap=apontamentos
    .filter(a=>a.estrutura===item.estrutura);

  const total=ap.reduce((s,a)=>s+a.peso,0);
  if(!total) return {inicio:real.inicio,fim:item.data_fim_plan};

  const media=total/diasExec;
  const diasRest=Math.ceil((item.peso_total-total)/media);

  const fimPrev=new Date();
  fimPrev.setDate(fimPrev.getDate()+diasRest);

  return {inicio:real.inicio,fim:formatISO(fimPrev)};
}

/* ================= RENDER ================= */

function renderizar(){

  gantt.innerHTML="";
  leftBody.innerHTML="";

  let linhaAtual=0;
  let idSequencial=1;

  registros.forEach(item=>{

    const real=calcularReal(item);
    const forecast=calcularForecast(item,real);

    const alturaExtra=Math.ceil(
      (item.instalacao||"").length/25
    )*8;

    const alturaLinha=LINHA_BASE+alturaExtra;

    renderLinha(item,linhaAtual,"PLAN",
      idSequencial,item.data_inicio_plan,item.data_fim_plan,alturaLinha,true);

    linhaAtual++;

    renderLinha(item,linhaAtual,"REAL",
      idSequencial,real.inicio,real.fim,alturaLinha,false);

    linhaAtual++;

    renderLinha(item,linhaAtual,"FORECAST",
      idSequencial,forecast.inicio,forecast.fim,alturaLinha,false);

    criarBarra("plan",item.data_inicio_plan,
      item.data_fim_plan,linhaAtual-3,item,alturaLinha,true);

    criarBarra("real",real.inicio,
      real.fim,linhaAtual-2,item,alturaLinha);

    criarBarra("forecast",forecast.inicio,
      forecast.fim,linhaAtual-1,item,alturaLinha);

    linhaAtual++;
    idSequencial++;
  });

  gantt.style.height=`${linhaAtual*LINHA_BASE}px`;
}

/* ================= COLUNA FIXA ================= */

function renderLinha(item,row,tipo,id,inicio,fim,altura,editavel){

  const dur=(inicio&&fim)?diasEntre(inicio,fim)+1:"";

  const div=document.createElement("div");
  div.style.position="absolute";
  div.style.top=`${row*LINHA_BASE}px`;
  div.style.height=`${altura}px`;
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
    <div>${item.predecessora||""}</div>
    <div>${item.sucessora||""}</div>
  `;

  if(editavel){
    div.querySelectorAll("[data-field]")
      .forEach(el=>{
        el.onblur=()=>{
          if(el.dataset.field==="inicio"){
            item.data_inicio_plan=parseBR(el.textContent.trim());
          }
          if(el.dataset.field==="fim"){
            item.data_fim_plan=parseBR(el.textContent.trim());
          }
          if(el.dataset.field==="duracao"){
            const dias=Number(el.textContent);
            const novaFim=new Date(item.data_inicio_plan);
            novaFim.setDate(novaFim.getDate()+dias-1);
            item.data_fim_plan=formatISO(novaFim);
          }
          desenharHeader();
          renderizar();
        };
      });
  }

  leftBody.appendChild(div);
}

/* ================= BARRA ================= */

function criarBarra(tipo,inicio,fim,row,item,altura,drag=false){

  if(!inicio||!fim) return;

  const bar=document.createElement("div");
  bar.className=`bar ${tipo}`;
  bar.style.left=`${diasEntre(DATA_BASE,inicio)*PX_POR_DIA}px`;
  bar.style.top=`${row*LINHA_BASE+2}px`;
  bar.style.height=`${altura-4}px`;
  bar.style.width=`${(diasEntre(inicio,fim)+1)*PX_POR_DIA}px`;

  bar.textContent=
    `${tipo.toUpperCase()} - ${item.obra} - ${item.instalacao} - ${item.estrutura}`;

  if(drag) ativarDrag(bar,item);

  gantt.appendChild(bar);
}

/* ================= DRAG ================= */

function ativarDrag(bar,item){

  let startX;

  bar.onmousedown=e=>{
    startX=e.clientX;

    document.onmousemove=ev=>{
      const dx=ev.clientX-startX;
      bar.style.left=`${bar.offsetLeft+dx}px`;
      startX=ev.clientX;
    };

    document.onmouseup=()=>{
      document.onmousemove=null;
      document.onmouseup=null;

      const dias=Math.round(bar.offsetLeft/PX_POR_DIA);

      const novaIni=new Date(DATA_BASE);
      novaIni.setDate(novaIni.getDate()+dias);

      const dur=diasEntre(item.data_inicio_plan,item.data_fim_plan);

      const novaFim=new Date(novaIni);
      novaFim.setDate(novaFim.getDate()+dur);

      item.data_inicio_plan=formatISO(novaIni);
      item.data_fim_plan=formatISO(novaFim);

      renderizar();
    };
  };
}

/* ================= FORNECEDOR ================= */

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

/* ================= LOAD ================= */

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
