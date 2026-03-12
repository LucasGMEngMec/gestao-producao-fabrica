const { createClient } = supabase;

const supabaseClient = createClient(
    "https://dklmejmlovtcadlicnhu.supabase.co",
    "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At"
);

const tabela = document.querySelector("#tabelaMateriais tbody");
const btnFinalizar = document.getElementById("btnFinalizar");

function removerLinha(btn){
    btn.closest("tr").remove();
}

function adicionarLinha(){

const row = tabela.insertRow();

row.innerHTML = `

<td><input class="marca"></td>

<td><input type="number" class="qtd"></td>

<td><input class="material"></td>

<td><input class="perfil"></td>

<td><input type="number" class="comprimento"></td>

<td><input type="number" step="0.0001" class="peso_unit"></td>

<td><input type="number" step="0.0001" class="peso_total" disabled></td>

<td style="text-align:center;">
<button class="btn-vermelho" onclick="removerLinha(this)">🗑</button>
</td>

`;

adicionarEventos(row);

}

function calcularPeso(row){

const qtd = parseFloat(row.querySelector(".qtd").value) || 0;
const peso = parseFloat(row.querySelector(".peso_unit").value) || 0;

const total = qtd * peso;

row.querySelector(".peso_total").value = total.toFixed(4);

}

async function colarExcel(){

const texto = await navigator.clipboard.readText();

const linhas = texto.split("\n");

linhas.forEach(linha=>{

const col = linha.split("\t");

const row = tabela.insertRow();

row.innerHTML=`

<td><input class="marca" value="${col[0]||""}"></td>
<td><input class="qtd" value="${col[1]||""}"></td>
<td><input class="material" value="${col[2]||""}"></td>
<td><input class="perfil" value="${col[3]||""}"></td>
<td><input class="comprimento" value="${col[4]||""}"></td>
<td><input class="peso_unit"></td>
<td><input class="peso_total" disabled></td>

<td style="text-align:center;">
<button class="btn-vermelho" onclick="removerLinha(this)">🗑</button>
</td>

`;

adicionarEventos(row);

});

}

function adicionarEventos(row){

row.querySelector(".qtd").addEventListener("input", ()=>calcularPeso(row));
row.querySelector(".peso_unit").addEventListener("input", ()=>calcularPeso(row));

const perfilInput = row.querySelector(".perfil");

perfilInput.addEventListener("blur", async ()=>{

const perfil = perfilInput.value.trim();

const data = await buscarPerfil(perfil);

if(data){

row.querySelector(".peso_unit").value = data.peso_kg_m;

calcularPeso(row);

}

});

}

async function buscarPerfil(perfil){

const {data} = await supabaseClient
.from("materiais")
.select("peso_kg_m")
.eq("perfil",perfil)
.single();

return data;

}

window.addEventListener("DOMContentLoaded", function () {

const hoje = new Date();

const dia = String(hoje.getDate()).padStart(2,'0');
const mes = String(hoje.getMonth()+1).padStart(2,'0');
const ano = hoje.getFullYear();

document.getElementById("dataCadastro").value = `${dia}/${mes}/${ano}`;

adicionarLinha();

});