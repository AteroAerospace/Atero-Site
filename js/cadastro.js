import { supabase } from "./supabase-client.js";

const formulario =
  document.querySelector("#form-cadastro");

const parametros =
  new URLSearchParams(window.location.search);

const planoUrl = parametros.get("plano");

const planosValidos = [
  "gratis",
  "pro",
  "ultra"
];

const campoPlano =
  document.querySelector("#plano");

if (
  planoUrl &&
  planosValidos.includes(planoUrl)
) {
  campoPlano.value = planoUrl;
}

formulario.addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    const nome =
      document.querySelector("#nome")
        .value
        .trim();

    const email =
      document.querySelector("#email")
        .value
        .trim();

    const senha =
      document.querySelector("#senha")
        .value;

    const confirmacao =
      document.querySelector(
        "#confirmar-senha"
      ).value;

    const planoSolicitado =
      campoPlano.value;

    const termosAceitos =
      document.querySelector(
        "#aceitar-termos"
      ).checked;

    if (senha !== confirmacao) {
      alert(
        "As senhas digitadas não são iguais."
      );

      return;
    }

    if (!termosAceitos) {
      alert(
        "Você precisa aceitar os Termos de Uso."
      );

      return;
    }

    const botao =
      formulario.querySelector(
        'button[type="submit"]'
      );

    botao.disabled = true;
    botao.textContent =
      "Criando sua conta...";

    const redirectUrl = new URL(
      "login.html?confirmado=1",
      window.location.href
    ).href;

    const { data, error } =
      await supabase.auth.signUp({
        email,
        password: senha,

        options: {
          emailRedirectTo: redirectUrl,

          data: {
            display_name: nome,
            requested_plan:
              planoSolicitado,
            terms_accepted: true
          }
        }
      });

    if (error) {
      alert(error.message);

      botao.disabled = false;
      botao.textContent =
        "Criar Conta Atero →";

      return;
    }

    if (data.session) {
      window.location.href =
        "selecionar-apps.html";

      return;
    }

    alert(
      "Conta criada. Confirme seu e-mail antes de entrar."
    );

    window.location.href =
      "login.html";
  }
);
