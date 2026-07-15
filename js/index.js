import { supabase } from "./supabase-client.js?v=10";
import { configurarBotoesCheckout } from "./checkout.js?v=12";

console.log("Atero index.js carregado.");

const linkConta = document.querySelector("#link-conta");
const secaoConta = document.querySelector("#conta");
const botaoPlanoGratis = document.querySelector(
  "#botao-plano-gratis"
);

const cardsPlanos = Array.from(
  document.querySelectorAll(
    ".plano-card[data-plan-id]"
  )
);


/*
  Remove a indicação visual de plano atual.
*/
function limparPlanoAtual() {
  cardsPlanos.forEach((card) => {
    card.classList.remove("plano-atual");
    card.removeAttribute("aria-current");

    const selo = card.querySelector(
      "[data-selo-plano-atual]"
    );

    if (selo) {
      selo.hidden = true;
    }
  });
}


/*
  Marca visualmente o plano atual.
*/
function marcarPlanoAtual(planoId) {
  limparPlanoAtual();

  const planoNormalizado = String(
    planoId || ""
  )
    .trim()
    .toLowerCase();

  const cardAtual = cardsPlanos.find(
    (card) =>
      card.dataset.planId === planoNormalizado
  );

  if (!cardAtual) {
    console.warn(
      "Card do plano não encontrado:",
      planoNormalizado
    );

    return;
  }

  cardAtual.classList.add("plano-atual");

  cardAtual.setAttribute(
    "aria-current",
    "true"
  );

  const selo = cardAtual.querySelector(
    "[data-selo-plano-atual]"
  );

  if (selo) {
    selo.hidden = false;
  }
}


/*
  Restaura os botões dos planos pagos.
*/
function restaurarBotoesPagos() {
  const botoes = document.querySelectorAll(
    "[data-checkout-plan]"
  );

  botoes.forEach((botao) => {
    const plano = botao.dataset.checkoutPlan;

    botao.disabled = false;
    botao.removeAttribute("aria-current");

    if (plano === "pro") {
      botao.textContent = "Assinar Pro";
    }

    if (plano === "ultra") {
      botao.textContent = "Assinar Ultra";
    }
  });
}


/*
  Ajusta os botões conforme o plano atual.
*/
function atualizarBotoesDoPlano(planoId) {
  restaurarBotoesPagos();

  const planoNormalizado = String(
    planoId || "gratis"
  )
    .trim()
    .toLowerCase();

  const botaoPlanoAtual =
    document.querySelector(
      `[data-checkout-plan="${planoNormalizado}"]`
    );

  if (botaoPlanoAtual) {
    botaoPlanoAtual.disabled = true;

    botaoPlanoAtual.setAttribute(
      "aria-current",
      "true"
    );

    botaoPlanoAtual.textContent =
      "Plano atual";
  }
}


/*
  Estado da página para usuários desconectados.
*/
function mostrarEstadoDesconectado() {
  limparPlanoAtual();
  restaurarBotoesPagos();

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
  Estado da página para usuários conectados.
*/
async function mostrarEstadoConectado(usuario) {
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

  const consultas = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", usuario.id)
      .maybeSingle(),

    supabase
      .from("subscriptions")
      .select("plan_id, status")
      .eq("user_id", usuario.id)
      .maybeSingle()
  ]);

  const resultadoPerfil =
    consultas[0];

  const resultadoAssinatura =
    consultas[1];


  if (resultadoPerfil.error) {
    console.warn(
      "Não foi possível carregar o perfil:",
      resultadoPerfil.error
    );
  } else {
    const nomeCompleto =
      resultadoPerfil.data?.display_name;

    if (
      typeof nomeCompleto === "string" &&
      linkConta
    ) {
      const primeiroNome = nomeCompleto
        .trim()
        .split(/\s+/)[0];

      if (primeiroNome) {
        linkConta.textContent =
          `Olá, ${primeiroNome}`;
      }
    }
  }


  if (resultadoAssinatura.error) {
    console.error(
      "Não foi possível carregar o plano:",
      resultadoAssinatura.error
    );

    limparPlanoAtual();
    restaurarBotoesPagos();

    return;
  }

  const planoId =
    resultadoAssinatura.data?.plan_id ||
    "gratis";

  marcarPlanoAtual(planoId);
  atualizarBotoesDoPlano(planoId);
}


/*
  Verifica a autenticação atual.
*/
async function verificarLogin() {
  try {
    const { data, error } =
      await supabase.auth.getUser();

    if (error) {
      console.error(
        "Erro ao verificar usuário:",
        error
      );

      mostrarEstadoDesconectado();

      return;
    }

    if (!data.user) {
      mostrarEstadoDesconectado();

      return;
    }

    await mostrarEstadoConectado(
      data.user
    );
  } catch (erro) {
    console.error(
      "Erro inesperado ao verificar login:",
      erro
    );

    mostrarEstadoDesconectado();
  }
}


/*
  Liga os botões Pro e Ultra ao checkout.
*/
const quantidadeBotoes =
  configurarBotoesCheckout();

console.log(
  "Botões de checkout encontrados:",
  quantidadeBotoes
);


/*
  Atualiza o site quando o estado de
  autenticação mudar.
*/
supabase.auth.onAuthStateChange(
  (evento, sessao) => {
    window.setTimeout(() => {
      if (
        evento === "SIGNED_IN" &&
        sessao?.user
      ) {
        mostrarEstadoConectado(
          sessao.user
        );

        return;
      }

      if (evento === "SIGNED_OUT") {
        mostrarEstadoDesconectado();
      }
    }, 0);
  }
);


verificarLogin();
