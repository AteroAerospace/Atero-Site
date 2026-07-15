import { supabase } from "./supabase-client.js";


let checkoutEmAndamento = false;


/*
  Cria uma notificação visual que pode ser usada
  tanto no index quanto na página da conta.
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

    document.body.append(aviso);
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


  window.clearTimeout(
    aviso.timeoutId
  );


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
  Lê a resposta JSON enviada por uma
  Edge Function em caso de erro.
*/
async function obterMensagemErro(
  erro
) {
  if (erro?.context) {
    try {
      const resposta =
        await erro.context.json();

      if (
        typeof resposta?.error ===
        "string"
      ) {
        return resposta.error;
      }
    } catch (erroLeitura) {
      console.warn(
        "Não foi possível ler o erro da função:",
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
  Guarda e restaura o conteúdo original
  do botão ou link.
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
    if (!elemento.dataset.conteudoOriginal) {
      elemento.dataset.conteudoOriginal =
        elemento.innerHTML;
    }


    elemento.setAttribute(
      "aria-busy",
      "true"
    );

    elemento.classList.add(
      "checkout-carregando"
    );


    elemento.innerHTML =
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
    elemento.dataset.conteudoOriginal
  ) {
    elemento.innerHTML =
      elemento.dataset.conteudoOriginal;
  }
}


/*
  Retorna a página de cadastro associada
  ao plano escolhido.
*/
function obterDestinoCadastro(
  elemento,
  plano
) {
  if (
    elemento instanceof
    HTMLAnchorElement
  ) {
    return elemento.href;
  }


  return new URL(
    `cadastro.html?plano=${plano}`,
    window.location.href
  ).href;
}


/*
  Inicia uma sessão Stripe Checkout.
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
    const {
      data: dadosSessao,
      error: erroSessao
    } = await supabase.auth
      .getSession();


    if (
      erroSessao ||
      !dadosSessao.session
    ) {
      mostrarAvisoCheckout(
        "Entre ou crie uma conta para assinar um plano.",
        "informacao"
      );


      const destino =
        obterDestinoCadastro(
          elemento,
          planoNormalizado
        );


      window.setTimeout(
        () => {
          window.location.assign(
            destino
          );
        },
        500
      );

      return;
    }


    const token =
      dadosSessao
        .session
        .access_token;


    const {
      data,
      error
    } = await supabase.functions
      .invoke(
        "create-checkout-session",
        {
          headers: {
            Authorization:
              `Bearer ${token}`
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


      /*
        A função retorna esta mensagem quando
        o usuário já tem assinatura Stripe ativa.
      */
      if (
        mensagem
          .toLowerCase()
          .includes(
            "já possui uma assinatura"
          )
      ) {
        mostrarAvisoCheckout(
          "Você já possui uma assinatura ativa. Gerencie seu plano pela página da conta.",
          "informacao"
        );

        return;
      }


      throw new Error(mensagem);
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
      checkoutUrl.protocol !==
      "https:"
    ) {
      throw new Error(
        "A URL de pagamento retornada é inválida."
      );
    }


    /*
      Sai do site e abre o checkout hospedado
      pela Stripe.
    */
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
  Liga automaticamente todos os elementos
  que possuem data-checkout-plan.
*/
export function configurarBotoesCheckout(
  raiz = document
) {
  const botoes =
    raiz.querySelectorAll(
      "[data-checkout-plan]"
    );


  botoes.forEach(botao => {
    if (
      botao.dataset.checkoutConfigurado ===
      "true"
    ) {
      return;
    }


    botao.dataset.checkoutConfigurado =
      "true";


    botao.addEventListener(
      "click",
      evento => {
        evento.preventDefault();


        iniciarCheckout(
          botao.dataset.checkoutPlan,
          botao
        );
      }
    );
  });
}
