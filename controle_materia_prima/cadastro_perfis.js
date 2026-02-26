const tabela = document.querySelector("#tabelaPerfis tbody");
const btnFinalizar = document.getElementById("btnFinalizar");

function formatarDataHoje() {
    const hoje = new Date();
    const dia = String(hoje.getDate()).padStart(2, '0');
    const mes = String(hoje.getMonth() + 1).padStart(2, '0');
    const ano = hoje.getFullYear();
    document.getElementById("dataCadastro").value = `${dia}/${mes}/${ano}`;
}

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

    btnFinalizar.disabled = !valido;
}

window.addEventListener("DOMContentLoaded", function () {
    formatarDataHoje();
    adicionarLinha();
});