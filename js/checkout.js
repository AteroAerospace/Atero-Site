import { supabase } from "./supabase-client.js?v=13";

import {
  abrirPortalAssinatura
} from "./portal.js?v=14";

let checkoutEmAndamento = false;


/*
  Exibe uma notificação visual.
*/
export function mostrarAvisoCheckout(
  mensagem,
  tipo = "informacao"
) {
  let aviso =
    document.querySelector(
      "#aviso-checkout"
    );


  if (!aviso) {
    aviso =
      document.createElement("div");

    aviso.id = "aviso-checkout";
    aviso.className = "aviso-checkout";

    aviso.setAttribute(
      "role",
      "status"
    );

    aviso.setAttribute(
      "aria-live",
      "polite"
    );

    documentoSeguroAppend(aviso);
  }


  aviso.classList.remove(
    "aviso-checkout-sucesso",
    "aviso-checkout-erro",
    "aviso-checkout-informacao"
  );


  aviso.classList.add(
    `aviso-checkout-${tipo}`
  );

  aviso.textContent = mensagem;
  aviso.hidden = false;


  if (aviso.timeoutId) {
    window.clearTimeout(
      aviso.timeoutId
    );
  }


  aviso.timeoutId =
    window.setTimeout(
      () => {
        aviso.hidden = true;
      },
      tipo === "erro"
        ? 9000
        : 6000
    );
}


/*
  Adiciona o aviso ao body quando ele
  estiver disponível.
*/
function documentoSeguroAppend(elemento) {
  if (document.body) {
    document.body.append(elemento);
    return;
  }

  document.addEventListener(
    "DOMContentLoaded",
    () => {
      document.body.append(elemento);
    },
    {
      once: true
    }
  );
}


/*
  Tenta ler a mensagem JSON retornada
  pela Edge Function.
*/
async function obterMensagemErro(erro) {
  if (erro?.context) {
    try {
      const resposta =
        await erro.context.clone().json();

      if (
        typeof resposta?.error ===
        "string"
      ) {
        return resposta.error;
      }
    } catch (erroLeitura) {
      console.warn(
        "Não foi possível ler a resposta da função:",
        erroLeitura
      );
    }
  }


  return (
    erro?.message ||
    "Não foi possível iniciar o pagamento."
  );
}


/*
  Controla o estado visual do botão.
*/
function definirCarregamento(
  elemento,
  ativo,
  plano
) {
  if (!elemento) {
    return;
  }


  if (ativo) {
    if (
      !elemento.dataset
        .conteudoOriginal
    ) {
      elemento.dataset
        .conteudoOriginal =
          elemento.innerHTML;
    }


    elemento.setAttribute(
      "aria-busy",
      "true"
    );

    elemento.classList.add(
      "checkout-carregando"
    );


    if (
      elemento instanceof
      HTMLButtonElement
    ) {
      elemento.disabled = true;
    }


    elemento.textContent =
      plano === "ultra"
        ? "Abrindo Ultra..."
        : "Abrindo Pro...";

    return;
  }


  elemento.removeAttribute(
    "aria-busy"
  );

  elemento.classList.remove(
    "checkout-carregando"
  );


  if (
    elemento instanceof
      HTMLButtonElement
  ) {
    elemento.disabled = false;
  }


  if (
    elemento.dataset
      .conteudoOriginal
  ) {
    elemento.innerHTML =
      elemento.dataset
        .conteudoOriginal;
  }
}


/*
  Valida o usuário junto ao servidor
  do Supabase e depois obtém o token
  da sessão local.
*/
async function obterSessaoValida() {
  const {
    data: dadosUsuario,
    error: erroUsuario
  } = await supabase.auth.getUser();


  if (erroUsuario) {
    console.error(
      "Erro ao validar usuário:",
      erroUsuario
    );

    return null;
  }


  if (!dadosUsuario.user) {
    return null;
  }


  const {
    data: dadosSessao,
    error: erroSessao
  } = await supabase.auth.getSession();


  if (erroSessao) {
    console.error(
      "Erro ao obter sessão:",
      erroSessao
    );

    return null;
  }


  if (
    dadosSessao.session
      ?.access_token
  ) {
    return dadosSessao.session;
  }


  /*
    Caso o usuário exista, mas o token local
    precise ser renovado, tenta atualizar
    a sessão uma única vez.
  */
  const {
    data: dadosAtualizados,
    error: erroAtualizacao
  } = await supabase.auth
    .refreshSession();


  if (erroAtualizacao) {
    console.error(
      "Erro ao renovar sessão:",
      erroAtualizacao
    );

    return null;
  }


  return (
    dadosAtualizados.session ||
    null
  );
}


/*
  Monta o endereço do login preservando
  a página atual.
*/
function obterEnderecoLogin(plano) {
  const paginaAtual =
    `${window.location.pathname}` +
    `${window.location.search}` +
    `${window.location.hash}`;


  const parametros =
    new URLSearchParams({
      next: paginaAtual,
      plano
    });


  return (
    `login.html?${parametros.toString()}`
  );
}


/*
  Inicia o Stripe Checkout.
*/
export async function iniciarCheckout(
  plano,
  elemento = null
) {
  const planoNormalizado =
    String(plano)
      .trim()
      .toLowerCase();


  if (
    !["pro", "ultra"].includes(
      planoNormalizado
    )
  ) {
    mostrarAvisoCheckout(
      "O plano escolhido é inválido.",
      "erro"
    );

    return;
  }


  if (checkoutEmAndamento) {
    return;
  }


  checkoutEmAndamento = true;


  definirCarregamento(
    elemento,
    true,
    planoNormalizado
  );


  try {
    const sessao =
      await obterSessaoValida();


    if (!sessao) {
      mostrarAvisoCheckout(
        "Sua sessão não foi encontrada. Entre novamente para continuar.",
        "erro"
      );


      /*
        Não envia para cadastro.

        Caso realmente não exista sessão,
        envia para login depois de um pequeno
        intervalo.
      */
      window.setTimeout(
        () => {
          window.location.assign(
            obterEnderecoLogin(
              planoNormalizado
            )
          );
        },
        1200
      );

      return;
    }


    const {
      data,
      error
    } = await supabase.functions
      .invoke(
        "create-checkout-session",
        {
          headers: {
            Authorization:
              `Bearer ${sessao.access_token}`
          },

          body: {
            plan:
              planoNormalizado
          }
        }
      );


    if (error) {
      const mensagem =
        await obterMensagemErro(
          error
        );


      if (
          mensagem
            .toLowerCase()
            .includes(
              "já possui uma assinatura"
            )
        ) {
          mostrarAvisoCheckout(
            "Abrindo o gerenciamento da sua assinatura...",
            "informacao"
          );
        
        
          await abrirPortalAssinatura(
            elemento
          );
        
        
          return;
        }


      throw new Error(
        mensagem
      );
    }


    if (
      !data?.success ||
      typeof data?.url !== "string"
    ) {
      throw new Error(
        data?.error ||
        "A página de pagamento não foi retornada."
      );
    }


    const checkoutUrl =
      new URL(data.url);


    if (
      checkoutUrl.protocol !== "https:"
    ) {
      throw new Error(
        "A URL de pagamento retornada é inválida."
      );
    }


    window.location.assign(
      checkoutUrl.href
    );
  } catch (erro) {
    console.error(
      "Erro ao iniciar checkout:",
      erro
    );


    mostrarAvisoCheckout(
      erro.message ||
      "Não foi possível iniciar o pagamento.",
      "erro"
    );
  } finally {
    checkoutEmAndamento = false;


    definirCarregamento(
      elemento,
      false,
      planoNormalizado
    );
  }
}


/*
  Liga todos os botões que possuem
  data-checkout-plan.
*/
export function configurarBotoesCheckout(
  raiz = document
) {
  const botoes =
    raiz.querySelectorAll(
      "[data-checkout-plan]"
    );


  console.log(
    "Configurando botões de checkout:",
    botoes.length
  );


  botoes.forEach((botao) => {
    if (
      botao.dataset
        .checkoutConfigurado ===
      "true"
    ) {
      return;
    }


    botao.dataset
      .checkoutConfigurado =
        "true";


    botao.addEventListener(
      "click",
      (evento) => {
        evento.preventDefault();
        evento.stopPropagation();


        console.log(
          "Clique no plano:",
          botao.dataset.checkoutPlan
        );


        iniciarCheckout(
          botao.dataset.checkoutPlan,
          botao
        );
      }
    );
  });


  return botoes.length;
}
