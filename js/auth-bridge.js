import {
  supabase,
  criarUrlLogin,
  obterUrlRetornoSegura,
  sincronizarSessaoApi
} from "./supabase-client.js?v=18";


const statusElemento =
  document.querySelector(
    "#status-sessao"
  );

const botaoTentarNovamente =
  document.querySelector(
    "#tentar-novamente"
  );

const parametros =
  new URLSearchParams(
    window.location.search
  );

const destinoRetorno =
  obterUrlRetornoSegura(
    parametros.get("return_to"),
    "conta.html"
  );


function atualizarStatus(texto) {
  if (statusElemento) {
    statusElemento.textContent = texto;
  }
}


function enviarParaLogin() {
  window.location.replace(
    criarUrlLogin(destinoRetorno)
  );
}


async function restaurarSessao() {
  if (botaoTentarNovamente) {
    botaoTentarNovamente.hidden = true;
    botaoTentarNovamente.disabled =
      true;
  }

  atualizarStatus(
    "Verificando sua Conta Atero..."
  );

  try {
    /*
      getSession() lê a sessão persistida e
      renova o access token quando necessário.
    */
    const {
      data,
      error
    } = await supabase.auth.getSession();

    if (error) {
      throw error;
    }

    const accessToken =
      data.session?.access_token;

    if (!accessToken) {
      enviarParaLogin();
      return;
    }

    atualizarStatus(
      "Sincronizando sua sessão..."
    );

    await sincronizarSessaoApi(
      accessToken
    );

    atualizarStatus(
      "Acesso confirmado."
    );

    window.location.replace(
      destinoRetorno
    );
  } catch (erro) {
    console.error(
      "Erro ao restaurar sessão:",
      erro
    );

    atualizarStatus(
      "Não foi possível conectar à Atero API."
    );

    if (botaoTentarNovamente) {
      botaoTentarNovamente.hidden =
        false;

      botaoTentarNovamente.disabled =
        false;
    }
  }
}


botaoTentarNovamente?.addEventListener(
  "click",
  restaurarSessao
);


restaurarSessao();
