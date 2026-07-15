import { supabase } from "./supabase-client.js";

import {
  configurarBotoesCheckout
} from "./checkout.js";


const linkConta =
  document.querySelector("#link-conta");

const secaoConta =
  document.querySelector("#conta");

const botaoPlanoGratis =
  document.querySelector(
    "#botao-plano-gratis"
  );


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
        "Erro ao verificar sessão:",
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


async function mostrarEstadoConectado(
  usuario
) {
  /*
    Esconde os cards de entrar e criar conta.
  */
  if (secaoConta) {
    secaoConta.hidden = true;
  }


  /*
    O link Conta passa a abrir o painel.
  */
  if (linkConta) {
    linkConta.href = "conta.html";
    linkConta.textContent =
      "Minha conta";
  }


  /*
    Usuário conectado não precisa criar outra
    conta para usar o plano gratuito.
  */
  if (botaoPlanoGratis) {
    botaoPlanoGratis.href =
      "selecionar-apps.html";

    botaoPlanoGratis.textContent =
      "Gerenciar aplicativos";
  }


  /*
    Carrega o primeiro nome para o cabeçalho.
  */
  const {
    data: perfil,
    error
  } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", usuario.id)
    .maybeSingle();


  if (
    !error &&
    perfil?.display_name &&
    linkConta
  ) {
    const primeiroNome =
      perfil.display_name
        .trim()
        .split(/\s+/)[0];


    if (primeiroNome) {
      linkConta.textContent =
        `Olá, ${primeiroNome}`;
    }
  }
}


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


/*
  Liga os botões Pro e Ultra.
*/
configurarBotoesCheckout();


supabase.auth.onAuthStateChange(
  (evento, sessao) => {
    /*
      Evita executar consultas assíncronas
      diretamente dentro do callback.
    */
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


        if (evento === "SIGNED_OUT") {
          mostrarEstadoDesconectado();
        }
      },
      0
    );
  }
);


verificarLogin();
