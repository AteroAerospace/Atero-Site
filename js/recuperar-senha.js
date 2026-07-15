import { supabase } from "./supabase-client.js";


const formulario =
  document.querySelector(
    "#form-recuperar-senha"
  );

const campoEmail =
  document.querySelector("#email");

const botaoRecuperar =
  document.querySelector(
    "#botao-recuperar"
  );

const mensagemRecuperacao =
  document.querySelector(
    "#mensagem-recuperacao"
  );


function mostrarMensagem(
  texto,
  tipo = "sucesso"
) {
  mensagemRecuperacao.hidden = false;
  mensagemRecuperacao.textContent = texto;

  mensagemRecuperacao.classList.remove(
    "auth-mensagem-sucesso",
    "auth-mensagem-erro"
  );

  mensagemRecuperacao.classList.add(
    tipo === "erro"
      ? "auth-mensagem-erro"
      : "auth-mensagem-sucesso"
  );
}


function definirCarregamento(ativo) {
  botaoRecuperar.disabled = ativo;

  botaoRecuperar.innerHTML =
    ativo
      ? "Enviando..."
      : `
          Enviar link de recuperação
          <span aria-hidden="true">→</span>
        `;
}


function criarUrlRedirecionamento() {
  /*
    new URL resolve corretamente tanto o domínio
    publicado quanto localhost ou GitHub Pages.
  */
  return new URL(
    "alterar-senha.html",
    window.location.href
  ).href;
}


formulario.addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    mensagemRecuperacao.hidden = true;

    const email =
      campoEmail.value
        .trim()
        .toLowerCase();

    if (!email) {
      mostrarMensagem(
        "Informe o e-mail da sua conta.",
        "erro"
      );

      campoEmail.focus();
      return;
    }

    if (!campoEmail.checkValidity()) {
      mostrarMensagem(
        "Digite um endereço de e-mail válido.",
        "erro"
      );

      campoEmail.focus();
      return;
    }


    definirCarregamento(true);


    const redirectTo =
      criarUrlRedirecionamento();

    const { error } =
      await supabase.auth
        .resetPasswordForEmail(
          email,
          {
            redirectTo
          }
        );


    definirCarregamento(false);


    if (error) {
      console.error(
        "Erro ao solicitar recuperação:",
        error
      );

      /*
        Para erros de configuração ou rede,
        mostramos uma mensagem genérica.
      */
      mostrarMensagem(
        "Não foi possível enviar o link agora. Tente novamente.",
        "erro"
      );

      return;
    }


    /*
      Não revelamos se o e-mail realmente existe.
      Isso evita que terceiros usem a página para
      descobrir quais endereços estão cadastrados.
    */
    mostrarMensagem(
      "Se esse e-mail estiver cadastrado, você receberá um link para criar uma nova senha."
    );

    campoEmail.value = "";
  }
);
