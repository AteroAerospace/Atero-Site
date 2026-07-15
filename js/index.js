import {
  supabase
} from "./supabase-client.js?v=9";

import {
  configurarBotoesCheckout
} from "./checkout.js?v=9";


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


/*
  Remove qualquer marcação de plano atual.
*/
function limparPlanoAtual() {
  cardsPlanos.forEach(card => {
    card.classList.remove(
      "plano-atual"
    );

    card.removeAttribute(
      "aria-current"
    );

    const selo =
      card.querySelector(
        "[data-selo-plano-atual]"
      );

    if (selo) {
      selo.hidden = true;
    }
  });
}


/*
  Marca o card correspondente ao plano
  atualmente registrado na assinatura.
*/
function marcarPlanoAtual(planoId) {
  limparPlanoAtual();


  const planoNormalizado =
    String(planoId || "")
      .trim()
      .toLowerCase();


  const cardAtual =
    cardsPlanos.find(
      card =>
        card.dataset.planId ===
        planoNormalizado
    );


  if (!cardAtual) {
    console.warn(
      "Card do plano não encontrado:",
      planoNormalizado
    );

    return;
  }


  cardAtual.classList.add(
    "plano-atual"
  );

  cardAtual.setAttribute(
    "aria-current",
    "true"
  );


  const selo =
    cardAtual.querySelector(
      "[data-selo-plano-atual]"
    );


  if (selo) {
    selo.hidden = false;
  }
}


/*
  Estado utilizado quando não existe
  uma Conta Atero autenticada.
*/
function mostrarEstadoDesconectado() {
  limparPlanoAtual();


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


/*
  Estado exibido quando o usuário está
  autenticado.
*/
async function mostrarEstadoConectado(
  usuario
) {
  if (secaoConta) {
    secaoConta.hidden = true;
  }


  if (linkConta) {
    linkConta.href =
      "conta.html";

    linkConta.textContent =
      "Minha conta";
  }


  if (botaoPlanoGratis) {
    botaoPlanoGratis.href =
      "selecionar-apps.html";

    botaoPlanoGratis.textContent =
      "Gerenciar aplicativos";
  }


  const [
    resultadoPerfil,
    resultadoAssinatura
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", usuario.id)
      .maybeSingle(),

    supabase
      .from("subscriptions")
      .select(`
        plan_id,
        status
      `)
      .eq("user_id", usuario.id)
      .maybeSingle()
  ]);


  /*
    Atualiza o link do cabeçalho com
    o primeiro nome do usuário.
  */
  if (
    !resultadoPerfil.error &&
    resultadoPerfil.data
      ?.display_name &&
    linkConta
  ) {
    const primeiroNome =
      resultadoPerfil.data
        .display_name
        .trim()
        .split(/\s+/)[0];


    if (primeiroNome) {
      linkConta.textContent =
        `Olá, ${primeiroNome}`;
    }
  } else if (
    resultadoPerfil.error
  ) {
    console.warn(
      "Não foi possível carregar o perfil:",
      resultadoPerfil.error
    );
  }


  /*
    Marca o plano atual apenas quando
    existe um usuário conectado.
  */
  if (resultadoAssinatura.error) {
    console.error(
      "Erro ao carregar o plano atual:",
      resultadoAssinatura.error
    );

    limparPlanoAtual();

    return;
  }


  marcarPlanoAtual(
    resultadoAssinatura.data
      ?.plan_id ||
    "gratis"
  );
}


/*
  Verifica a autenticação diretamente
  com o Supabase.
*/
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
  Liga os botões Pro e Ultra ao
  sistema de checkout.
*/
const quantidadeBotoes =
  configurarBotoesCheckout();


console.log(
  "Botões de checkout encontrados:",
  quantidadeBotoes
);


/*
  Atualiza o estado da página quando
  o login muda em outra aba ou janela.
*/
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
