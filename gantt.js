/**************************************************
 * SUPABASE CLIENT (JS v2 – BROWSER)
 **************************************************/
const supabaseUrl = "https://dkjmejmjovtcdalicnhu.supabase.co";
const supabaseKey =
  "sb_publishable_cpq_melwicz13c9vpmkFQw_OOAzH2At";

const supabaseClient = supabase.createClient(
  supabaseUrl,
  supabaseKey
);

/**************************************************
 * TESTE IMEDIATO (NÃO REMOVER)
 **************************************************/
console.log("Supabase client:", supabaseClient);

/**************************************************
 * LOAD DATA
 **************************************************/
async function carregar() {
  const { data, error } = await supabaseClient
    .from("cronograma_estrutural")
    .select("*")
    .limit(5);

  if (error) {
    console.error(error);
    alert("Erro Supabase: " + error.message);
    return;
  }

  console.log("Dados carregados:", data);
}

function salvarCronograma() {
  alert("Salvar ainda não implementado");
}

carregar();
