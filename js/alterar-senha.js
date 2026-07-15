import { supabase } from "./supabase-client.js";


const formulario =
  document.querySelector(
    "#form-alterar-senha"
  );

const campoNovaSenha =
  document.querySelector("#nova-senha");

const campoConfirmacao =
  document.querySelector(
    "#confirmar-nova-senha"
  );

const botaoAlterarSenha =
  document.querySelector(
    "#botao-alterar-senha"
  );

const mensagemSessao =
  document.querySelector(
    "#mensagem-sessao"
  );

const mensagemAlteracao =
  document.querySelector(
    "#mensagem-alteracao"
  );

const acoesLinkInvalido =
  document.querySelector(
    "#acoes-link-invalido"
  );


let usuarioAutenticado = null;
let modoRecuperacao = false;
let paginaInicializada = false;


/*
  Exibe mensagens dentro do formulário.
*/
function mostrarMensagemAlteracao(
  texto,
  tipo = "erro"
) {
  mensagemAlteracao.hidden = false;
  mensagemAlteracao.textContent = texto;

  mensagemAlteracao.classList.remove(
    "auth-mensagem-sucesso",
    "auth-mensagem-erro"
  );

  mensagemAlteracao.classList.add(
    tipo === "sucesso"
      ? "auth-mensagem-sucesso"
      : "auth-mensagem-erro"
  );
}


/*
  Mostra o formulário quando existe uma
  sessão válida para alterar a senha.
*/
function liberarFormulario(usuario) {
  usuarioAutenticado = usuario;

  mensagemSessao.hidden = true;
  acoesLinkInvalido.hidden = true;
  formulario.hidden = false;

  paginaInicializada = true;

  campoNovaSenha.focus();
}


/*
  Mostra o estado de link inválido ou expirado.
*/
function bloquearFormulario(
  mensagem =
    "O link de recuperação é inválido ou expirou."
) {
  usuarioAutenticado = null;

  formulario.hidden = true;

  mensagemSessao.hidden = false;
  mensagemSessao.textContent = mensagem;

  mensagemSessao.classList.add(
    "auth-mensagem-erro"
  );

  acoesLinkInvalido.hidden = false;

  paginaInicializada = true;
}


/*
  Analisa possíveis mensagens de erro enviadas
  pelo Supabase na URL.
*/
function verificarErroNaUrl() {
  const parametros =
    new URLSearchParams(
      window.location.search
    );

  const hash =
    new URLSearchParams(
      window.location.hash.replace(
        /^#/,
        ""
      )
    );

  const descricaoErro =
    parametros.get(
      "error_description"
    ) ||
    hash.get(
      "error_description"
    );

  if (!descricaoErro) {
    return false;
  }

  bloquearFormulario(
    decodeURIComponent(
      descricaoErro.replace(
        /\+/g,
        " "
      )
    )
  );

  return true;
}


/*
  Verifica a sessão já existente.

  Isso também permite que um usuário logado
  abra esta página pela área da conta.
*/
async function verificarSessaoExistente() {
  const {
    data,
    error
  } = await supabase.auth.getUser();

  if (error || !data.user) {
    return false;
  }

  liberarFormulario(data.user);

  return true;
}


/*
  O Supabase emite PASSWORD_RECOVERY quando
  processa corretamente o link enviado por e-mail.
*/
const {
  data: listenerAutenticacao
} = supabase.auth.onAuthStateChange(
  (evento, sessao) => {
    if (
      evento === "PASSWORD_RECOVERY" &&
      sessao?.user
    ) {
      modoRecuperacao = true;

      liberarFormulario(
        sessao.user
      );
    }

    if (
      evento === "SIGNED_IN" &&
      sessao?.user &&
      !paginaInicializada
    ) {
      liberarFormulario(
        sessao.user
      );
    }

    if (
      evento === "SIGNED_OUT" &&
      paginaInicializada
    ) {
      bloquearFormulario(
        "Sua sessão terminou. Solicite um novo link de recuperação."
      );
    }
  }
);


/*
  Inicializa a página.
*/
async function iniciarPagina() {
  if (verificarErroNaUrl()) {
    return;
  }

  /*
    Aguarda um pequeno ciclo para que o cliente
    processe o código ou os tokens presentes
    no endereço de recuperação.
  */
  await new Promise(
    resolver =>
      window.setTimeout(
        resolver,
        300
      )
  );

  if (paginaInicializada) {
    return;
  }

  const possuiSessao =
    await verificarSessaoExistente();

  if (possuiSessao) {
    return;
  }

  bloquearFormulario();
}


/*
  Altera o texto e estado do botão.
*/
function definirCarregamento(ativo) {
  botaoAlterarSenha.disabled = ativo;

  botaoAlterarSenha.innerHTML =
    ativo
      ? "Salvando..."
      : `
          Salvar nova senha
          <span aria-hidden="true">→</span>
        `;
}


/*
  Validação básica da senha.
*/
function validarSenha(
  senha,
  confirmacao
) {
  if (senha.length < 8) {
    return (
      "A senha precisa ter pelo menos 8 caracteres."
    );
  }

  if (senha !== confirmacao) {
    return (
      "As senhas digitadas não são iguais."
    );
  }

  return null;
}


formulario.addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    mensagemAlteracao.hidden = true;

    if (!usuarioAutenticado) {
      bloquearFormulario();
      return;
    }

    const senha =
      campoNovaSenha.value;

    const confirmacao =
      campoConfirmacao.value;

    const erroValidacao =
      validarSenha(
        senha,
        confirmacao
      );

    if (erroValidacao) {
      mostrarMensagemAlteracao(
        erroValidacao
      );

      return;
    }


    definirCarregamento(true);


    const {
      data,
      error
    } = await supabase.auth.updateUser({
      password: senha
    });


    definirCarregamento(false);


    if (error) {
      console.error(
        "Erro ao alterar senha:",
        error
      );

      let mensagem =
        "Não foi possível alterar a senha.";

      const erro =
        error.message
          ?.toLowerCase() || "";

      if (
        erro.includes("same password")
      ) {
        mensagem =
          "A nova senha precisa ser diferente da senha atual.";
      }

      if (
        erro.includes("weak") ||
        erro.includes("password")
      ) {
        mensagem =
          "A senha informada não atende aos requisitos de segurança.";
      }

      mostrarMensagemAlteracao(
        mensagem
      );

      return;
    }


    if (!data.user) {
      mostrarMensagemAlteracao(
        "A senha não pôde ser atualizada."
      );

      return;
    }


    mostrarMensagemAlteracao(
      "Senha alterada com sucesso.",
      "sucesso"
    );

    campoNovaSenha.value = "";
    campoConfirmacao.value = "";

    formulario
      .querySelectorAll("input, button")
      .forEach(elemento => {
        elemento.disabled = true;
      });


    /*
      No fluxo de recuperação, encerramos a sessão
      temporária e exigimos um login normal.

      Para uma troca feita por um usuário já logado,
      preservamos sua sessão e voltamos à conta.
    */
    window.setTimeout(
      async () => {
        if (modoRecuperacao) {
          await supabase.auth.signOut();

          window.location.replace(
            "login.html?senha=alterada"
          );

          return;
        }

        window.location.replace(
          "conta.html?senha=alterada"
        );
      },
      900
    );
  }
);


window.addEventListener(
  "beforeunload",
  () => {
    listenerAutenticacao
      ?.subscription
      ?.unsubscribe();
  }
);


iniciarPagina();
