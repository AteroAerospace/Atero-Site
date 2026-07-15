import { supabase } from "./supabase-client.js";


const parametros =
  new URLSearchParams(
    window.location.search
  );


if (
  parametros.get("conta") ===
  "excluida"
) {
  alert(
    "Sua Conta Atero foi excluída com sucesso."
  );

  window.history.replaceState(
    {},
    document.title,
    "index.html"
  );
}

const linkConta =
  document.querySelector("#link-conta");

const secaoConta =
  document.querySelector("#conta");


async function verificarLogin() {
  const {
    data,
    error
  } = await supabase.auth.getUser();


  if (error) {
    console.error(
      "Erro ao verificar sessão:",
      error
    );

    mostrarEstadoDesconectado();
    return;
  }


  if (data.user) {
    await mostrarEstadoConectado(
      data.user
    );

    return;
  }


  mostrarEstadoDesconectado();
}


async function mostrarEstadoConectado(
  usuario
) {
  /*
    A seção com os cards de entrar e
    criar conta deixa de ser necessária.
  */
  if (secaoConta) {
    secaoConta.hidden = true;
  }


  /*
    O link do cabeçalho passa a levar
    diretamente ao painel da conta.
  */
  if (linkConta) {
    linkConta.href = "conta.html";
    linkConta.textContent = "Minha conta";
  }


  /*
    Tenta carregar o nome para deixar
    o cabeçalho mais pessoal.
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
}


/*
  Atualiza a página quando o usuário
  entra ou sai em outra aba.
*/
supabase.auth.onAuthStateChange(
  evento => {
    if (evento === "SIGNED_IN") {
      verificarLogin();
    }

    if (evento === "SIGNED_OUT") {
      mostrarEstadoDesconectado();
    }
  }
);


verificarLogin();
