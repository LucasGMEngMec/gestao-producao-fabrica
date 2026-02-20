console.log("Dashboard carregado");

/* ================= SUPABASE ================= */
const { createClient } = supabase;

const supabaseClient = createClient(
  "https://dklmejmlovtcadlicnhu.supabase.co",
  "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At"
);

/* ================= VARIÁVEIS ================= */
let graficos = {};
const camposFiltro = ["fabrica", "fornecedor", "obra", "instalacao", "estrutura", "descricao"];

/* ================= CARREGAR DADOS ================= */
async function carregarDados() {

  const inicio = document.getElementById("dataInicio").value;
  const fim = document.getElementById("dataFim").value;

  let query = supabaseClient
    .from("vw_producao_kg")
    .select("*")
    .order("data", { ascending: true });

  if (inicio) query = query.gte("data", inicio);
  if (fim) query = query.lte("data", fim);

  camposFiltro.forEach((campo) => {
    const valor = document.getElementById(campo)?.value;
    if (valor) {
      query = query.eq(campo, valor);
    }
  });

  const { data, error } = await query;

  if (error) {
    console.error(error);
    alert("Erro ao buscar dados.");
    return;
  }

  processarDados(data);
}

/* ================= PROCESSAMENTO ================= */
function processarDados(registros) {

  const agrupado = {};

  registros.forEach(r => {

    if (!agrupado[r.data]) {
      agrupado[r.data] = {
        pintura: 0,
        montagem: 0,
        soldagem: 0,
        acabamento: 0,
        envio: 0
      };
    }

    const processo = r.processo.toLowerCase().trim();

    if (agrupado[r.data][processo] !== undefined) {
      agrupado[r.data][processo] += Number(r.peso_kg);
    }
  });

  atualizarDashboard(agrupado);
}

/* ================= ATUALIZA DASHBOARD ================= */
function atualizarDashboard(dados) {

  const datasBrutas = Object.keys(dados);

  const datasFormatadas = datasBrutas.map(d => {
    const [ano, mes, dia] = d.split("-");
    return `${dia}/${mes}/${ano.slice(-2)}`;
  });

  const pintura = [];
  const montagem = [];
  const soldagem = [];
  const acabamento = [];
  const envio = [];

  datasBrutas.forEach(d => {
    pintura.push(dados[d].pintura);
    montagem.push(dados[d].montagem);
    soldagem.push(dados[d].soldagem);
    acabamento.push(dados[d].acabamento);
    envio.push(dados[d].envio);
  });

  criarGrafico("graficoPintura", datasFormatadas, pintura);
  criarGrafico("graficoMontagem", datasFormatadas, montagem);
  criarGrafico("graficoSoldagem", datasFormatadas, soldagem);
  criarGrafico("graficoAcabamento", datasFormatadas, acabamento);
  criarGrafico("graficoEnvio", datasFormatadas, envio);

  atualizarTotal("totalPintura", pintura);
  atualizarTotal("totalMontagem", montagem);
  atualizarTotal("totalSoldagem", soldagem);
  atualizarTotal("totalAcabamento", acabamento);
  atualizarTotal("totalEnvio", envio);

  const totalGeral = soma(pintura);
  document.getElementById("totalGeral").innerText =
    formatarMil(totalGeral);
}

/* ================= FUNÇÕES AUXILIARES ================= */
function soma(lista) {
  return lista.reduce((acc, val) => acc + val, 0);
}

function atualizarTotal(id, lista) {
  document.getElementById(id).innerText =
    formatarMil(soma(lista));
}

function formatarMil(valor) {
  return (valor / 1000).toFixed(2) + " Mil";
}

/* ================= FILTROS ================= */
async function atualizarFiltros() {

  let query = supabaseClient
    .from("vw_producao_kg")
    .select("*");

  // aplica filtros já escolhidos
  camposFiltro.forEach(campo => {
    const valor = document.getElementById(campo)?.value;
    if (valor) {
      query = query.eq(campo, valor);
    }
  });

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao atualizar filtros:", error);
    return;
  }

  popularFiltros(data);
}

/* ================= GRÁFICOS ================= */
function criarGrafico(id, labels, valores) {

  if (graficos[id]) {
    graficos[id].destroy();
  }

  const ctx = document.getElementById(id);

  graficos[id] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        data: valores,
        backgroundColor: "#8b1e23",
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: {
          top: 30
        }
      },
      plugins: {
        legend: { display: false },
        datalabels: {
          anchor: "end",
          align: "top",
          offset: 4,
          clamp: true,
          clip: false,
          color: "#333",
          font: { weight: "bold", size: 12 },
          formatter: (value) => {
            if (!value || value === 0) return "";
            return (value / 1000).toFixed(2) + " Mil";
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            maxRotation: 45,
            minRotation: 45,
            autoSkip: false
          }
        },
      y: {
          beginAtZero: true,
          display: false,
          grid: { display: false }
        }
      }
    },
    plugins: [ChartDataLabels]
  });
}

/* ================= MODAL FILTRO ================= */
function abrirFiltro() {
  document.getElementById("modalFiltro").style.display = "flex";
}

function fecharFiltro() {
  document.getElementById("modalFiltro").style.display = "none";
}

function fecharDetalhe() {
  document.getElementById("modalDetalhe").style.display = "none";
}

async function abrirDetalhe(processo) {

  const processoFormatado =
    processo.charAt(0).toUpperCase() + processo.slice(1);

  let query = supabaseClient
    .from("vw_producao_kg")
    .select("*")
    .ilike("processo", processoFormatado);

  const { data, error } = await query;

  if (error) {
    console.error(error);
    return;
  }

  console.log("Dados detalhe:", data); // para teste

  montarTabelaDetalhe(data);
}

function montarTabelaDetalhe(dados) {

  let html = `
    <div style="
      background:white;
      padding:25px;
      border-radius:12px;
      max-height:75vh;
      width:90%;
      max-width:1200px;
      overflow:auto;
      box-shadow:0 10px 30px rgba(0,0,0,0.2);
    ">
      <h3 style="margin-bottom:20px;">Detalhamento</h3>

      <table style="
        width:100%;
        border-collapse:collapse;
        font-size:14px;
      ">
        <thead>
          <tr style="background:#f2f2f2; text-align:left;">
            <th style="padding:10px;">Data</th>
            <th style="padding:10px;">Obra</th>
            <th style="padding:10px;">Instalação</th>
            <th style="padding:10px;">Estrutura</th>
            <th style="padding:10px;">Conjunto</th>
            <th style="padding:10px;">Descrição</th>
            <th style="padding:10px; text-align:right;">Quantidade</th>
            <th style="padding:10px; text-align:right;">Peso (kg)</th>
          </tr>
        </thead>
        <tbody>
  `;

  dados.forEach(d => {
    html += `
      <tr style="border-bottom:1px solid #eee;">
        <td style="padding:8px;">${formatarData(d.data)}</td>
        <td style="padding:8px;">${d.obra || ""}</td>
        <td style="padding:8px;">${d.instalacao || ""}</td>
        <td style="padding:8px;">${d.estrutura || ""}</td>
        <td style="padding:8px;">${d.conjunto || ""}</td>
        <td style="padding:8px;">${d.descricao || ""}</td>
        <td style="padding:8px; text-align:right;">
          ${Number(d.quantidade || 0).toFixed(0)}
        </td>
        <td style="padding:8px; text-align:right; font-weight:600;">
          ${Number(d.peso_kg).toFixed(2)}
        </td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>

      <div style="margin-top:20px; text-align:right;">
        <button onclick="fecharDetalhe()" style="
          padding:8px 18px;
          border:none;
          border-radius:6px;
          background:#8b1e23;
          color:white;
          cursor:pointer;
        ">
          Fechar
        </button>
      </div>
    </div>
  `;

  const modal = document.getElementById("modalDetalhe");
  modal.innerHTML = html;
  modal.style.display = "flex";
}

function formatarData(dataISO) {

  if (!dataISO) return "";

  const [ano, mes, dia] = dataISO.split("-");

  return `${dia}/${mes}/${ano.slice(-2)}`;
}

function popularFiltros(dados) {

  camposFiltro.forEach(campo => {

    const select = document.getElementById(campo);
    if (!select) return;

    const valorAtual = select.value;

    const valoresUnicos = [
      ...new Set(
        dados
          .map(d => d[campo])
          .filter(v => v && v !== "")
      )
    ];

    select.innerHTML = '<option value="">Todos</option>';

    valoresUnicos.sort().forEach(valor => {
      const option = document.createElement("option");
      option.value = valor;
      option.textContent = valor;

      if (valor === valorAtual) {
        option.selected = true;
      }

      select.appendChild(option);
    });

  });
}

/* ================= INICIALIZA ================= */
window.onload = () => {
  atualizarFiltros();
  carregarDados();
};

camposFiltro.forEach(campo => {
  const select = document.getElementById(campo);
  if (select) {
    select.addEventListener("change", atualizarFiltros);
  }
});

async function gerarPDF() {

  const { jsPDF } = window.jspdf;

  const elemento = document.querySelector(".container");

  const canvas = await html2canvas(elemento, {
    scale: 2,
    useCORS: true
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF("l", "mm", "a4");

  const pageWidth = pdf.internal.pageSize.getWidth();   // 297 mm
  const pageHeight = pdf.internal.pageSize.getHeight(); // 210 mm

  const margem = 15; // margem lateral elegante

  const larguraUtil = pageWidth - (margem * 2);
  const alturaImagem = (canvas.height * larguraUtil) / canvas.width;

  const posX = margem;
  const posY = (pageHeight - alturaImagem) / 2; // centraliza verticalmente

  pdf.addImage(imgData, "PNG", posX, posY, larguraUtil, alturaImagem);

  pdf.save("dashboard-producao.pdf");
}