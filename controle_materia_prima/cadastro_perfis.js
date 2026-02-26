const supabase = window.supabase.createClient(
    "https://dklmejmlovtcadlicnhu.supabase.co",
    "sb_publishable_cpq_meWiczl3c9vpmtKj0w_QOAzH2At"
);

const tabela = document.querySelector("#tabelaPerfis tbody");
const btnFinalizar = document.getElementById("btnFinalizar");

function formatarDataHoje() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    document.getElementById("dataCadastro").value = `${dia}/${mes}/${ano}`;
}

formatarDataHoje();

function adicionarLinha() {
    const row = tabela.insertRow();

    row.innerHTML = `
        <td><input type="text" class="perfil"></td>
        <td><input type="number" class="comprimento"></td>
        <td><input type="number" step="0.001" class="peso"></td>
        <td><input type="number" class="desenvolvimento"></td>
        <td style="text-align:center;">
            <button class="btn-vermelho" onclick="removerLinha(this)">🗑</button>
        </td>
    `;

    adicionarEventos(row);
}

function removerLinha(btn) {
    btn.closest("tr").remove();
    validarTabela();
}

function adicionarEventos(row) {
    const perfilInput = row.querySelector(".perfil");
    const desenvolvimentoInput = row.querySelector(".desenvolvimento");

    perfilInput.addEventListener("blur", () => {
        const tipo = verificarTipoPerfil(perfilInput.value);

        if (tipo === "laminado") {
            desenvolvimentoInput.value = "";
            desenvolvimentoInput.disabled = true;
        } else {
            desenvolvimentoInput.disabled = false;
        }

        validarTabela();
    });

    row.querySelectorAll("input").forEach(input => {
        input.addEventListener("input", validarTabela);
    });
}

function verificarTipoPerfil(perfil) {
    perfil = perfil.toUpperCase().trim();
    const laminados = ["W", "HP", "L", "BR", "CH", "TUBO"];

    for (let prefixo of laminados) {
        if (perfil.startsWith(prefixo)) return "laminado";
    }
    return "dobrado";
}

function normalizarPerfil(perfil) {
    return perfil.toUpperCase().replace(/\s+/g, "");
}

async function validarTabela() {
    let valido = true;
    const linhas = tabela.querySelectorAll("tr");
    const perfisDigitados = [];

    linhas.forEach(row => {
        row.style.backgroundColor = "";
        const perfil = normalizarPerfil(row.querySelector(".perfil").value);
        const comprimento = row.querySelector(".comprimento").value;
        const peso = row.querySelector(".peso").value;
        const desenvolvimento = row.querySelector(".desenvolvimento").value;
        const tipo = verificarTipoPerfil(perfil);

        if (!perfil || !comprimento || !peso) {
            row.style.backgroundColor = "#ffcccc";
            valido = false;
        }

        if (tipo === "dobrado" && (!desenvolvimento || desenvolvimento <= 0)) {
            row.style.backgroundColor = "#ffcccc";
            valido = false;
        }

        perfisDigitados.push(perfil);
    });

    // duplicidade interna
    const duplicados = perfisDigitados.filter((item, index) =>
        perfisDigitados.indexOf(item) !== index
    );

    if (duplicados.length > 0) {
        linhas.forEach(row => {
            const perfil = normalizarPerfil(row.querySelector(".perfil").value);
            if (duplicados.includes(perfil)) {
                row.style.backgroundColor = "#ff9999";
            }
        });
        valido = false;
    }

    // duplicidade banco
    if (perfisDigitados.length > 0) {
        const { data } = await supabase
            .from("materiais")
            .select("perfil")
            .in("perfil", perfisDigitados);

        if (data && data.length > 0) {
            linhas.forEach(row => {
                const perfil = normalizarPerfil(row.querySelector(".perfil").value);
                if (data.some(p => p.perfil === perfil)) {
                    row.style.backgroundColor = "#ff9999";
                }
            });
            valido = false;
        }
    }

    btnFinalizar.disabled = !valido;
}

async function salvarPerfis() {
    const linhas = tabela.querySelectorAll("tr");
    const perfis = [];

    linhas.forEach(row => {
        const perfil = normalizarPerfil(row.querySelector(".perfil").value);
        const comprimento = parseInt(row.querySelector(".comprimento").value);
        const peso = parseFloat(row.querySelector(".peso").value);
        const desenvolvimento = row.querySelector(".desenvolvimento").disabled
            ? null
            : parseFloat(row.querySelector(".desenvolvimento").value);

        perfis.push({
            perfil,
            comprimento_mm: comprimento,
            peso_kg_m: peso,
            desenvolvimento_mm: desenvolvimento
        });
    });

    const { error } = await supabase.from("materiais").insert(perfis);

    if (error) {
        alert("Erro ao salvar: " + error.message);
    } else {
        alert("Perfis cadastrados com sucesso!");
        location.reload();
    }
}

async function colarExcel() {
    const texto = await navigator.clipboard.readText();
    const linhas = texto.trim().split("\n");

    linhas.forEach(linha => {
        const colunas = linha.split("\t");
        const row = tabela.insertRow();

        row.innerHTML = `
            <td><input type="text" class="perfil" value="${colunas[0] || ''}"></td>
            <td><input type="number" class="comprimento" value="${colunas[1] || ''}"></td>
            <td><input type="number" step="0.001" class="peso" value="${colunas[2] || ''}"></td>
            <td><input type="number" class="desenvolvimento" value="${colunas[3] || ''}"></td>
            <td><button onclick="removerLinha(this)">🗑</button></td>
        `;

        adicionarEventos(row);
    });

    validarTabela();
}

// Cria primeira linha automaticamente ao abrir
window.addEventListener("DOMContentLoaded", function () {
    formatarDataHoje();
    adicionarLinha();
});