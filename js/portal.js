import {
  supabase
} from "./supabase-client.js?v=14";


let portalEmAndamento = false;


function definirEstadoBotao(
  botao,
  carregando
) {
  if (!botao) {
    return;
  }


  if (carregando) {
    if (
      !botao.dataset
        .textoOriginal
    ) {
      botao.dataset.textoOriginal =
        botao.textContent;
    }

    botao.disabled = true;

    botao.setAttribute(
      "aria-busy",
      "true"
    );

    botao.textContent =
      "Abrindo gerenciamento...";

    return;
  }


  botao.disabled = false;

  botao.removeAttribute(
    "aria-busy"
  );

  if (
    botao.dataset
      .textoOriginal
  ) {
    botao.textContent =
      botao.dataset
        .textoOriginal;
  }
}


async function obterMensagemErro(
  erro
) {
  if (erro?.context) {
    try {
      const resposta =
        await erro.context
          .clone()
          .json();

      if (
        typeof resposta?.error ===
        "string"
      ) {
        return resposta.error;
      }
    } catch (erroLeitura) {
      console.warn(
        "Não foi possível ler a resposta:",
        erroLeitura
      );
    }
  }


  return (
    erro?.message ||
    "Não foi possível abrir o gerenciamento."
  );
}


export async function abrirPortalAssinatura(
  botao = null
) {
  if (portalEmAndamento) {
    return;
  }


  portalEmAndamento = true;

  definirEstadoBotao(
    botao,
    true
  );


  try {
    const {
      data: dadosUsuario,
      error: erroUsuario
    } = await supabase.auth
      .getUser();


    if (
      erroUsuario ||
      !dadosUsuario.user
    ) {
      window.location.assign(
        "login.html?next=conta.html"
      );

      return;
    }


    const {
      data: dadosSessao,
      error: erroSessao
    } = await supabase.auth
      .getSession();


    if (
      erroSessao ||
      !dadosSessao.session
        ?.access_token
    ) {
      window.location.assign(
        "login.html?next=conta.html"
      );

      return;
    }


    const {
      data,
      error
    } = await supabase.functions
      .invoke(
        "create-portal-session",
        {
          headers: {
            Authorization:
              `Bearer ${dadosSessao.session.access_token}`
          },

          body: {}
        }
      );


    if (error) {
      const mensagem =
        await obterMensagemErro(
          error
        );

      throw new Error(mensagem);
    }


    if (
      !data?.success ||
      typeof data.url !== "string"
    ) {
      throw new Error(
        data?.error ||
        "O endereço do portal não foi retornado."
      );
    }


    const endereco =
      new URL(data.url);


    if (
      endereco.protocol !==
      "https:"
    ) {
      throw new Error(
        "O endereço retornado é inválido."
      );
    }


    window.location.assign(
      endereco.href
    );
  } catch (erro) {
    console.error(
      "Erro ao abrir portal:",
      erro
    );


    const mensagem =
      erro instanceof Error
        ? erro.message
        : "Não foi possível abrir o gerenciamento.";


    window.alert(mensagem);
  } finally {
    portalEmAndamento = false;

    definirEstadoBotao(
      botao,
      false
    );
  }
}
