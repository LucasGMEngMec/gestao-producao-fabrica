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
async function carregarFiltros() {

  const { data, error } = await supabaseClient
    .from("vw_producao_kg")
    .select("*");

  if (error) {
    console.error("Erro ao carregar filtros:", error);
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

async function abrirDetalhe(processo) {

  const inicio = document.getElementById("dataInicio").value;
  const fim = document.getElementById("dataFim").value;

  let query = supabaseClient
    .from("vw_producao_kg")
    .select("*")
    .eq("processo", processo);

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
    alert("Erro ao buscar detalhes.");
    return;
  }

  montarTabelaDetalhe(data);
}

function montarTabelaDetalhe(dados) {

  let html = `
    <div style="background:white; padding:20px; border-radius:10px; max-height:70vh; overflow:auto;">
      <h3>Detalhamento</h3>
      <table style="width:100%; border-collapse:collapse;">
        <thead>
          <tr style="background:#eee;">
            <th>Data</th>
            <th>Obra</th>
            <th>Instalação</th>
            <th>Estrutura</th>
            <th>Conjunto</th>
            <th>Descrição</th>
            <th>Peso (kg)</th>
          </tr>
        </thead>
        <tbody>
  `;

  dados.forEach(d => {
    html += `
      <tr>
        <td>${d.data}</td>
        <td>${d.obra || ""}</td>
        <td>${d.instalacao || ""}</td>
        <td>${d.estrutura || ""}</td>
        <td>${d.conjunto || ""}</td>
        <td>${d.descricao || ""}</td>
        <td>${Number(d.peso_kg).toFixed(2)}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
      <br>
      <button onclick="fecharFiltro()" style="padding:8px 15px;">Fechar</button>
    </div>
  `;

  const modal = document.getElementById("modalFiltro");
  modal.innerHTML = html;
  modal.style.display = "flex";
}

function popularFiltros(dados) {

  camposFiltro.forEach(campo => {

    const select = document.getElementById(campo);
    if (!select) return;

    const valoresUnicos = [
      ...new Set(
        dados
          .map(d => d[campo])
          .filter(v => v && v !== "")
      )
    ];

    select.innerHTML = '<option value="">Todos</option>';

    valoresUnicos.forEach(valor => {
      const option = document.createElement("option");
      option.value = valor;
      option.textContent = valor;
      select.appendChild(option);
    });

  });
}

/* ================= INICIALIZA ================= */
window.onload = () => {
  carregarFiltros();
  carregarDados();
};