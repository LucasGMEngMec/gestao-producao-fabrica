console.log("Dashboard carregado");

/* ================= SUPABASE ================= */
const supabase = window.createSupabaseClient(
  "https://dklmejmlovtcadlicnhu.supabase.co",
  "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At"
);

/* ================= VARIÁVEIS ================= */
let graficos = {};

/* ================= CARREGAR DADOS ================= */
async function carregarDados() {

  const inicio = document.getElementById("dataInicio").value;
  const fim = document.getElementById("dataFim").value;

  let query = supabase
    .from("vw_producao_kg")
    .select("*")
    .order("data", { ascending: true });

  if (inicio) query = query.gte("data", inicio);
  if (fim) query = query.lte("data", fim);

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
        entrega: 0
      };
    }

    agrupado[r.data][r.processo] += Number(r.peso_kg);
  });

  atualizarDashboard(agrupado);
}

/* ================= ATUALIZA DASHBOARD ================= */
function atualizarDashboard(dados) {

  const datas = Object.keys(dados);

  const pintura = [];
  const montagem = [];
  const soldagem = [];
  const acabamento = [];
  const entrega = [];

  datas.forEach(d => {
    pintura.push(dados[d].pintura);
    montagem.push(dados[d].montagem);
    soldagem.push(dados[d].soldagem);
    acabamento.push(dados[d].acabamento);
    entrega.push(dados[d].entrega);
  });

  criarGrafico("graficoPintura", datas, pintura);
  criarGrafico("graficoMontagem", datas, montagem);
  criarGrafico("graficoSoldagem", datas, soldagem);
  criarGrafico("graficoAcabamento", datas, acabamento);
  criarGrafico("graficoEntrega", datas, entrega);

  atualizarTotal("totalPintura", pintura);
  atualizarTotal("totalMontagem", montagem);
  atualizarTotal("totalSoldagem", soldagem);
  atualizarTotal("totalAcabamento", acabamento);
  atualizarTotal("totalEntrega", entrega);

  const totalGeral =
    soma(pintura) +
    soma(montagem) +
    soma(soldagem) +
    soma(acabamento);

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
        backgroundColor: "#8b1e23"
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

/* ================= INICIALIZA ================= */
window.onload = () => {
  carregarDados();
};
