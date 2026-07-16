import {
  supabase,
  obterRetornoDosParametros,
  sincronizarSessaoApi
} from "./supabase-client.js?v=18";


const parametros =
  new URLSearchParams(
    window.location.search
  );

const mensagemLogin =
  document.querySelector(
    "#mensagem-login"
  );

const formulario =
  document.querySelector(
    "#form-login"
  );

const campoEmail =
  document.querySelector(
    "#email"
  );

const campoSenha =
  document.querySelector(
    "#senha"
  );

const botaoEntrar =
  formulario?.querySelector(
    'button[type="submit"]'
  );


function mostrarMensagem(
  texto,
  tipo = "informacao"
) {
  if (!mensagemLogin) {
    if (tipo === "erro") {
      alert(texto);
    }

    return;
  }

  mensagemLogin.hidden = false;
  mensagemLogin.textContent = texto;

  mensagemLogin.classList.remove(
    "auth-mensagem-sucesso",
    "auth-mensagem-erro",
    "auth-mensagem-informacao"
  );

  mensagemLogin.classList.add(
    tipo === "erro"
      ? "auth-mensagem-erro"
      : (
          tipo === "sucesso"
            ? "auth-mensagem-sucesso"
            : "auth-mensagem-informacao"
        )
  );
}


function definirCarregamento(
  ativo,
  texto = "Entrando..."
) {
  if (!botaoEntrar) {
    return;
  }

  if (
    !botaoEntrar.dataset
      .conteudoOriginal
  ) {
    botaoEntrar.dataset
      .conteudoOriginal =
        botaoEntrar.innerHTML;
  }

  botaoEntrar.disabled = ativo;
  botaoEntrar.setAttribute(
    "aria-busy",
    String(ativo)
  );

  if (ativo) {
    botaoEntrar.textContent = texto;
    return;
  }

  botaoEntrar.removeAttribute(
    "aria-busy"
  );

  botaoEntrar.innerHTML =
    botaoEntrar.dataset
      .conteudoOriginal;
}


/*
  Mensagens vindas dos fluxos de confirmação
  e recuperação de senha.
*/
if (
  parametros.get("senha") ===
  "alterada"
) {
  mostrarMensagem(
    "Senha alterada. Entre novamente.",
    "sucesso"
  );
}

if (
  parametros.get("confirmado") ===
  "1"
) {
  mostrarMensagem(
    "E-mail confirmado. Agora você pode entrar.",
    "sucesso"
  );
}


/*
  Caso o usuário já esteja logado, garante que
  a API também possua a sessão antes de redirecionar.
*/
async function redirecionarUsuarioJaLogado() {
  const {
    data,
    error
  } = await supabase.auth.getSession();

  if (
    error ||
    !data.session?.access_token
  ) {
    return;
  }

  try {
    await sincronizarSessaoApi(
      data.session.access_token
    );

    const destino =
      obterRetornoDosParametros(
        "conta.html"
      );

    window.location.replace(destino);
  } catch (erro) {
    console.warn(
      "A sessão existe, mas a API ainda não respondeu:",
      erro
    );
  }
}


formulario?.addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    if (mensagemLogin) {
      mensagemLogin.hidden = true;
    }

    const email =
      String(
        campoEmail?.value || ""
      )
        .trim()
        .toLowerCase();

    const senha =
      String(
        campoSenha?.value || ""
      );

    if (!email || !senha) {
      mostrarMensagem(
        "Preencha o e-mail e a senha.",
        "erro"
      );

      return;
    }

    definirCarregamento(
      true,
      "Entrando..."
    );

    try {
      const {
        data,
        error
      } = await supabase.auth
        .signInWithPassword({
          email,
          password: senha
        });

      if (error) {
        throw error;
      }

      const accessToken =
        data.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "O Supabase não retornou uma sessão válida."
        );
      }

      definirCarregamento(
        true,
        "Preparando sua sessão..."
      );

      await sincronizarSessaoApi(
        accessToken
      );


      const destino =
        obterRetornoDosParametros(
          "conta.html"
        );

      window.location.replace(destino);
    } catch (erro) {
      console.error(
        "Erro ao entrar:",
        erro
      );

      const mensagem =
        erro?.status
          ? (
              "O login foi reconhecido, mas a Atero API não respondeu. Tente novamente."
            )
          : (
              "E-mail ou senha incorretos."
            );

      mostrarMensagem(
        mensagem,
        "erro"
      );

      definirCarregamento(false);
    }
  }
);


redirecionarUsuarioJaLogado();
