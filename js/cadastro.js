import {
  supabase,
  sincronizarSessaoApi
} from "./supabase-client.js?v=18";


const formulario =
  document.querySelector(
    "#form-cadastro"
  );

const parametros =
  new URLSearchParams(
    window.location.search
  );

const planoUrl =
  parametros.get("plano");

const planosValidos = [
  "gratis",
  "pro",
  "ultra"
];

const campoPlano =
  document.querySelector("#plano");

const botaoCadastro =
  formulario?.querySelector(
    'button[type="submit"]'
  );


if (
  planoUrl &&
  planosValidos.includes(planoUrl) &&
  campoPlano
) {
  campoPlano.value = planoUrl;
}


function definirCarregamento(ativo) {
  if (!botaoCadastro) {
    return;
  }

  if (
    !botaoCadastro.dataset
      .conteudoOriginal
  ) {
    botaoCadastro.dataset
      .conteudoOriginal =
        botaoCadastro.innerHTML;
  }

  botaoCadastro.disabled = ativo;

  if (ativo) {
    botaoCadastro.textContent =
      "Criando sua conta...";

    return;
  }

  botaoCadastro.innerHTML =
    botaoCadastro.dataset
      .conteudoOriginal;
}


formulario?.addEventListener(
  "submit",
  async evento => {
    evento.preventDefault();

    const nome =
      String(
        document.querySelector("#nome")
          ?.value || ""
      ).trim();

    const email =
      String(
        document.querySelector("#email")
          ?.value || ""
      )
        .trim()
        .toLowerCase();

    const senha =
      String(
        document.querySelector("#senha")
          ?.value || ""
      );

    const confirmacao =
      String(
        document.querySelector(
          "#confirmar-senha"
        )?.value || ""
      );

    const planoSolicitado =
      campoPlano?.value || "gratis";

    const termosAceitos =
      Boolean(
        document.querySelector(
          "#aceitar-termos"
        )?.checked
      );

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

    definirCarregamento(true);

    try {
      const redirectUrl =
        new URL(
          "login.html?confirmado=1",
          window.location.href
        ).href;

      const {
        data,
        error
      } = await supabase.auth.signUp({
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
        throw error;
      }

      /*
        Quando a confirmação de e-mail está
        desativada, o Supabase já devolve uma sessão.
      */
      if (data.session?.access_token) {
        await sincronizarSessaoApi(
          data.session.access_token
        );


        window.location.replace(
          "selecionar-apps.html"
        );

        return;
      }

      alert(
        "Conta criada. Confirme seu e-mail antes de entrar."
      );

      window.location.replace(
        "login.html"
      );
    } catch (erro) {
      console.error(
        "Erro ao criar conta:",
        erro
      );

      alert(
        erro?.message ||
        "Não foi possível criar sua conta."
      );

      definirCarregamento(false);
    }
  }
);
