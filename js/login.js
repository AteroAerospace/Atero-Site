import { supabase } from "./supabase-client.js";

const formulario =
  document.querySelector("#form-login");

formulario.addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    const email =
      document.querySelector("#email")
        .value
        .trim();

    const senha =
      document.querySelector("#senha")
        .value;

    const botao =
      formulario.querySelector(
        'button[type="submit"]'
      );

    botao.disabled = true;
    botao.textContent = "Entrando...";

    const { error } =
      await supabase.auth
        .signInWithPassword({
          email,
          password: senha
        });

    if (error) {
      alert(
        "E-mail ou senha incorretos."
      );

      botao.disabled = false;
      botao.textContent =
        "Entrar na Conta Atero →";

      return;
    }

    window.location.href =
      "conta.html";
  }
);
