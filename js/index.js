import {
  supabase
} from "./supabase-client.js?v=8";

import {
  configurarBotoesCheckout
} from "./checkout.js?v=8";


console.log(
  "Atero index.js carregado."
);


const linkConta =
  document.querySelector(
    "#link-conta"
  );

const secaoConta =
  document.querySelector(
    "#conta"
  );

const botaoPlanoGratis =
  document.querySelector(
    "#botao-plano-gratis"
  );

const cardsPlanos =
  Array.from(
    document.querySelectorAll(
      ".plano-card[data-plan-id]"
    )
  );


function mostrarEstadoDesconectado() {
  if (secaoConta) {
    secaoConta.hidden = false;
  }

  if (linkConta) {
    linkConta.href = "#conta";
    linkConta.textContent = "Conta";
  }

  if (botaoPlanoGratis) {
    botaoPlanoGratis.href =
      "cadastro.html?plano=gratis";

    botaoPlanoGratis.textContent =
      "Começar grátis";
  }
}


async function mostrarEstadoConectado(
  usuario
) {
  if (secaoConta) {
    secaoConta.hidden = true;
  }

  if (linkConta) {
    linkConta.href = "conta.html";
    linkConta.textContent =
      "Minha conta";
  }

  if (botaoPlanoGratis) {
    botaoPlanoGratis.href =
      "selecionar-apps.html";

    botaoPlanoGratis.textContent =
      "Gerenciar aplicativos";
  }


  const {
    data: perfil,
    error
  } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", usuario.id)
    .maybeSingle();


  if (error) {
    console.warn(
      "Não foi possível carregar o nome:",
      error
    );

    return;
  }


  const primeiroNome =
    perfil?.display_name
      ?.trim()
      .split(/\s+/)[0];


  if (
    primeiroNome &&
    linkConta
  ) {
    linkConta.textContent =
      `Olá, ${primeiroNome}`;
  }
}


async function verificarLogin() {
  const {
    data,
    error
  } = await supabase.auth.getUser();


  if (
    error ||
    !data.user
  ) {
    if (error) {
      console.error(
        "Erro ao verificar usuário:",
        error
      );
    }

    mostrarEstadoDesconectado();
    return;
  }


  await mostrarEstadoConectado(
    data.user
  );
}


/*
  Esta linha é a que conecta os cliques
  dos botões Pro e Ultra ao checkout.
*/
const quantidadeBotoes =
  configurarBotoesCheckout();


console.log(
  "Botões de checkout encontrados:",
  quantidadeBotoes
);


supabase.auth.onAuthStateChange(
  (evento, sessao) => {
    window.setTimeout(
      () => {
        if (
          evento === "SIGNED_IN" &&
          sessao?.user
        ) {
          mostrarEstadoConectado(
            sessao.user
          );

          return;
        }

        if (
          evento === "SIGNED_OUT"
        ) {
          mostrarEstadoDesconectado();
        }
      },
      0
    );
  }
);


verificarLogin();
