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
        <td><input type="text" class="descricao"></td>
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

    linhas.forEach(row => {
        row.style.backgroundColor = "";

        const descricao = row.querySelector(".descricao").value;
        const perfil = normalizarPerfil(row.querySelector(".perfil").value);
        const comprimento = row.querySelector(".comprimento").value;
        const peso = row.querySelector(".peso").value;
        const desenvolvimento = row.querySelector(".desenvolvimento").value;
        const tipo = verificarTipoPerfil(perfil);

        if (!descricao || !perfil || !comprimento || !peso) {
            row.style.backgroundColor = "#ffcccc";
            valido = false;
        }

        if (tipo === "dobrado" && (!desenvolvimento || desenvolvimento <= 0)) {
            row.style.backgroundColor = "#ffcccc";
            valido = false;
        }
    });

    btnFinalizar.disabled = !valido;

    if (valido) {
        btnFinalizar.classList.remove("btn-desabilitado");
    } else {
        btnFinalizar.classList.add("btn-desabilitado");
    }
}

async function colarExcel() {
    try {
        const texto = await navigator.clipboard.readText();

        if (!texto) return;

        const linhas = texto.trim().split("\n");

        linhas.forEach(linha => {
            const colunas = linha.split("\t");

            const row = tabela.insertRow();

            row.innerHTML = `
                <td><input type="text" class="descricao" value="${colunas[0] || ''}"></td>
                <td><input type="text" class="perfil" value="${colunas[1] || ''}"></td>
                <td><input type="number" class="comprimento" value="${colunas[2] || ''}"></td>
                <td><input type="number" step="0.001" class="peso" value="${colunas[3] || ''}"></td>
                <td><input type="number" class="desenvolvimento" value="${colunas[4] || ''}"></td>
                <td style="text-align:center;">
                    <button class="btn-vermelho" onclick="removerLinha(this)">🗑</button>
                </td>
            `;

            adicionarEventos(row);
        });

        validarTabela();

    } catch (err) {
        alert("Não foi possível acessar a área de transferência. Use Ctrl+C antes de clicar em Colar.");
        console.error(err);
    }
}

window.addEventListener("DOMContentLoaded", function () {
    formatarDataHoje();
    adicionarLinha();
});