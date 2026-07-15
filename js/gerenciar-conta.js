import {
  supabase
} from "./supabase-client.js?v=17";


let usuarioAtual = null;
let exclusaoEmAndamento = false;


/*
  Procura o primeiro elemento que corresponda
  a algum dos seletores fornecidos.

  Isso permite pequenas diferenças nos IDs
  usados pelo HTML.
*/
function buscarElemento(seletores) {
  for (const seletor of seletores) {
    try {
      const elemento =
        document.querySelector(
          seletor
        );

      if (elemento) {
        return elemento;
      }
    } catch (erro) {
      console.warn(
        "Seletor inválido:",
        seletor,
        erro
      );
    }
  }

  return null;
}


/*
  FORMULÁRIO DE DADOS
*/
const formularioDados =
  buscarElemento([
    "#form-dados",
    "#form-dados-pessoais",
    "#form-perfil",
    "[data-form-dados]"
  ]);

const campoNome =
  buscarElemento([
    "#nome",
    "#nome-completo",
    "#display-name",
    "#nome-conta",
    'input[name="nome"]',
    'input[name="display_name"]'
  ]);

const campoEmail =
  buscarElemento([
    "#email",
    "#email-conta",
    "#novo-email",
    'input[name="email"]'
  ]);

const botaoSalvarDados =
  buscarElemento([
    "#botao-salvar-dados",
    "#salvar-dados",
    "#botao-atualizar-perfil",
    '[data-acao="salvar-dados"]'
  ]);

const mensagemDados =
  buscarElemento([
    "#mensagem-dados",
    "#mensagem-perfil",
    "[data-mensagem-dados]"
  ]);


/*
  FORMULÁRIO DE SENHA
*/
const formularioSenha =
  buscarElemento([
    "#form-senha",
    "#form-alterar-senha",
    "[data-form-senha]"
  ]);

const campoSenhaAtual =
  buscarElemento([
    "#senha-atual",
    'input[name="senha_atual"]',
    'input[autocomplete="current-password"]'
  ]);

const campoNovaSenha =
  buscarElemento([
    "#nova-senha",
    "#senha-nova",
    'input[name="nova_senha"]',
    'input[autocomplete="new-password"]'
  ]);

const campoConfirmarSenha =
  buscarElemento([
    "#confirmar-nova-senha",
    "#confirmar-senha",
    "#confirmacao-senha",
    'input[name="confirmar_senha"]'
  ]);

const botaoSalvarSenha =
  buscarElemento([
    "#botao-salvar-senha",
    "#botao-alterar-senha",
    '[data-acao="alterar-senha"]'
  ]);

const mensagemSenha =
  buscarElemento([
    "#mensagem-senha",
    "[data-mensagem-senha]"
  ]);


/*
  EXCLUSÃO DA CONTA
*/
const botaoAbrirExclusao =
  buscarElemento([
    "#botao-excluir-conta",
    "#abrir-exclusao",
    "#abrir-modal-exclusao",
    '[data-acao="abrir-exclusao"]'
  ]);

const modalExclusao =
  buscarElemento([
    "#modal-exclusao",
    "#modal-excluir-conta",
    "[data-modal-exclusao]"
  ]);

const campoConfirmacaoExclusao =
  buscarElemento([
    "#confirmacao-exclusao",
    "#texto-confirmacao-exclusao",
    'input[name="confirmacao_exclusao"]'
  ]);

const botaoConfirmarExclusao =
  buscarElemento([
    "#botao-confirmar-exclusao",
    "#confirmar-exclusao",
    '[data-acao="confirmar-exclusao"]'
  ]);

const botaoCancelarExclusao =
  buscarElemento([
    "#botao-cancelar-exclusao",
    "#cancelar-exclusao",
    '[data-acao="cancelar-exclusao"]'
  ]);

const botaoFecharExclusao =
  buscarElemento([
    "#fechar-modal-exclusao",
    ".modal-fechar",
    '[data-acao="fechar-exclusao"]'
  ]);

const mensagemExclusao =
  buscarElemento([
    "#mensagem-exclusao",
    "[data-mensagem-exclusao]"
  ]);


/*
  OUTROS ELEMENTOS
*/
const botaoSair =
  buscarElemento([
    "#botao-sair",
    ".painel-sair",
    '[data-acao="sair"]'
  ]);

const emailAtualTexto =
  buscarElemento([
    "#email-atual",
    "[data-email-atual]"
  ]);

const nomeAtualTexto =
  buscarElemento([
    "#nome-atual",
    "[data-nome-atual]"
  ]);

const dataCriacaoTexto =
  buscarElemento([
    "#data-criacao",
    "[data-data-criacao]"
  ]);


/*
  Cria uma caixa de mensagem caso o HTML
  ainda não possua uma.
*/
function criarCaixaMensagem(
  elementoReferencia,
  id
) {
  const caixa =
    document.createElement("p");

  caixa.id = id;
  caixa.className =
    "gerenciar-mensagem";

  caixa.hidden = true;

  caixa.setAttribute(
    "role",
    "status"
  );

  caixa.setAttribute(
    "aria-live",
    "polite"
  );

  if (elementoReferencia) {
    elementoReferencia
      .insertAdjacentElement(
        "afterend",
        caixa
      );
  } else if (document.body) {
    document.body.append(caixa);
  }

  return caixa;
}


const caixaDados =
  mensagemDados ||
  criarCaixaMensagem(
    formularioDados,
    "mensagem-dados-gerada"
  );

const caixaSenha =
  mensagemSenha ||
  criarCaixaMensagem(
    formularioSenha,
    "mensagem-senha-gerada"
  );

const caixaExclusao =
  mensagemExclusao ||
  criarCaixaMensagem(
    botaoConfirmarExclusao,
    "mensagem-exclusao-gerada"
  );


/*
  Exibe mensagens de sucesso, erro
  ou informação.
*/
function mostrarMensagem(
  caixa,
  mensagem,
  tipo = "informacao"
) {
  if (!caixa) {
    if (tipo === "erro") {
      console.error(mensagem);
    } else {
      console.log(mensagem);
    }

    return;
  }

  caixa.hidden = false;
  caixa.textContent = mensagem;

  caixa.classList.remove(
    "gerenciar-mensagem-sucesso",
    "gerenciar-mensagem-erro",
    "gerenciar-mensagem-informacao"
  );

  caixa.classList.add(
    `gerenciar-mensagem-${tipo}`
  );
}


/*
  Limpa uma mensagem existente.
*/
function limparMensagem(caixa) {
  if (!caixa) {
    return;
  }

  caixa.hidden = true;
  caixa.textContent = "";

  caixa.classList.remove(
    "gerenciar-mensagem-sucesso",
    "gerenciar-mensagem-erro",
    "gerenciar-mensagem-informacao"
  );
}


/*
  Controla o estado visual de um botão.
*/
function definirCarregamento(
  botao,
  carregando,
  textoCarregando = "Salvando..."
) {
  if (!botao) {
    return;
  }

  if (carregando) {
    if (
      !botao.dataset
        .conteudoOriginal
    ) {
      botao.dataset
        .conteudoOriginal =
          botao.innerHTML;
    }

    botao.disabled = true;

    botao.setAttribute(
      "aria-busy",
      "true"
    );

    botao.textContent =
      textoCarregando;

    return;
  }

  botao.disabled = false;

  botao.removeAttribute(
    "aria-busy"
  );

  if (
    botao.dataset
      .conteudoOriginal
  ) {
    botao.innerHTML =
      botao.dataset
        .conteudoOriginal;
  }
}


/*
  Formata uma data para exibição.
*/
function formatarData(data) {
  if (!data) {
    return "";
  }

  const objetoData =
    new Date(data);

  if (
    Number.isNaN(
      objetoData.getTime()
    )
  ) {
    return "";
  }

  return new Intl.DateTimeFormat(
    "pt-BR",
    {
      dateStyle: "long"
    }
  ).format(objetoData);
}


/*
  Obtém o usuário autenticado validando
  sua sessão junto ao Supabase.
*/
async function obterUsuarioAtual() {
  const {
    data,
    error
  } = await supabase.auth
    .getUser();

  if (error) {
    console.error(
      "Erro ao validar usuário:",
      error
    );

    return null;
  }

  return data.user || null;
}


/*
  Carrega os dados do usuário e
  do perfil.
*/
async function carregarDadosConta() {
  usuarioAtual =
    await obterUsuarioAtual();

  if (!usuarioAtual) {
    const destino =
      encodeURIComponent(
        "gerenciar-conta.html"
      );

    window.location.replace(
      `login.html?next=${destino}`
    );

    return;
  }

  const {
    data: perfil,
    error: erroPerfil
  } = await supabase
    .from("profiles")
    .select(
      "display_name, created_at, updated_at"
    )
    .eq(
      "id",
      usuarioAtual.id
    )
    .maybeSingle();

  if (erroPerfil) {
    console.warn(
      "Não foi possível carregar o perfil:",
      erroPerfil
    );
  }

  const nome =
    perfil?.display_name ||
    usuarioAtual.user_metadata
      ?.display_name ||
    "";

  const email =
    usuarioAtual.email || "";

  if (campoNome) {
    campoNome.value = nome;
  }

  if (campoEmail) {
    campoEmail.value = email;
  }

  if (nomeAtualTexto) {
    nomeAtualTexto.textContent =
      nome || "Usuário Atero";
  }

  if (emailAtualTexto) {
    emailAtualTexto.textContent =
      email || "E-mail indisponível";
  }

  if (dataCriacaoTexto) {
    const dataCriacao =
      perfil?.created_at ||
      usuarioAtual.created_at;

    dataCriacaoTexto.textContent =
      formatarData(dataCriacao);
  }
}


/*
  Salva nome e e-mail.
*/
async function salvarDados(
  evento
) {
  evento?.preventDefault();

  limparMensagem(caixaDados);

  if (!usuarioAtual) {
    usuarioAtual =
      await obterUsuarioAtual();
  }

  if (!usuarioAtual) {
    window.location.replace(
      "login.html"
    );

    return;
  }

  const nome =
    String(
      campoNome?.value || ""
    ).trim();

  const email =
    String(
      campoEmail?.value || ""
    )
      .trim()
      .toLowerCase();

  if (nome.length < 2) {
    mostrarMensagem(
      caixaDados,
      "Digite um nome válido.",
      "erro"
    );

    campoNome?.focus();

    return;
  }

  if (
    !email ||
    !email.includes("@")
  ) {
    mostrarMensagem(
      caixaDados,
      "Digite um endereço de e-mail válido.",
      "erro"
    );

    campoEmail?.focus();

    return;
  }

  definirCarregamento(
    botaoSalvarDados,
    true,
    "Salvando dados..."
  );

  try {
    const emailAtual =
      String(
        usuarioAtual.email || ""
      ).toLowerCase();

    const dadosAtualizacao = {
      data: {
        display_name: nome
      }
    };

    if (email !== emailAtual) {
      dadosAtualizacao.email =
        email;
    }

    /*
      Atualiza os metadados e, quando
      necessário, solicita a troca de e-mail.
    */
    const {
      data: resultadoAuth,
      error: erroAuth
    } = await supabase.auth
      .updateUser(
        dadosAtualizacao
      );

    if (erroAuth) {
      throw erroAuth;
    }

    /*
      Atualiza o perfil público da conta.
    */
    const {
      error: erroPerfil
    } = await supabase
      .from("profiles")
      .upsert(
        {
          id: usuarioAtual.id,
          display_name: nome,
          updated_at:
            new Date().toISOString()
        },
        {
          onConflict: "id"
        }
      );

    if (erroPerfil) {
      throw erroPerfil;
    }

    usuarioAtual =
      resultadoAuth.user ||
      usuarioAtual;

    if (nomeAtualTexto) {
      nomeAtualTexto.textContent =
        nome;
    }

    if (
      email !== emailAtual
    ) {
      mostrarMensagem(
        caixaDados,
        (
          "Nome atualizado. Enviamos uma confirmação " +
          "para o novo endereço de e-mail."
        ),
        "sucesso"
      );
    } else {
      mostrarMensagem(
        caixaDados,
        "Seus dados foram atualizados.",
        "sucesso"
      );
    }
  } catch (erro) {
    console.error(
      "Erro ao atualizar dados:",
      erro
    );

    mostrarMensagem(
      caixaDados,
      erro?.message ||
      "Não foi possível atualizar seus dados.",
      "erro"
    );
  } finally {
    definirCarregamento(
      botaoSalvarDados,
      false
    );
  }
}


/*
  Confirma a senha atual fazendo
  uma nova autenticação.

  Essa etapa só ocorre quando o HTML
  possui o campo de senha atual.
*/
async function validarSenhaAtual(
  senhaAtual
) {
  if (!campoSenhaAtual) {
    return;
  }

  if (!senhaAtual) {
    throw new Error(
      "Digite sua senha atual."
    );
  }

  if (!usuarioAtual?.email) {
    throw new Error(
      "Não foi possível identificar o e-mail da conta."
    );
  }

  const {
    error
  } = await supabase.auth
    .signInWithPassword({
      email: usuarioAtual.email,
      password: senhaAtual
    });

  if (error) {
    throw new Error(
      "A senha atual está incorreta."
    );
  }
}


/*
  Altera a senha da conta.
*/
async function alterarSenha(
  evento
) {
  evento?.preventDefault();

  limparMensagem(caixaSenha);

  const senhaAtual =
    String(
      campoSenhaAtual?.value || ""
    );

  const novaSenha =
    String(
      campoNovaSenha?.value || ""
    );

  const confirmacao =
    String(
      campoConfirmarSenha?.value ||
      ""
    );

  if (novaSenha.length < 8) {
    mostrarMensagem(
      caixaSenha,
      "A nova senha deve ter pelo menos 8 caracteres.",
      "erro"
    );

    campoNovaSenha?.focus();

    return;
  }

  if (
    novaSenha !==
    confirmacao
  ) {
    mostrarMensagem(
      caixaSenha,
      "As novas senhas não são iguais.",
      "erro"
    );

    campoConfirmarSenha?.focus();

    return;
  }

  if (
    senhaAtual &&
    senhaAtual === novaSenha
  ) {
    mostrarMensagem(
      caixaSenha,
      "A nova senha deve ser diferente da senha atual.",
      "erro"
    );

    campoNovaSenha?.focus();

    return;
  }

  definirCarregamento(
    botaoSalvarSenha,
    true,
    "Alterando senha..."
  );

  try {
    if (!usuarioAtual) {
      usuarioAtual =
        await obterUsuarioAtual();
    }

    if (!usuarioAtual) {
      window.location.replace(
        "login.html"
      );

      return;
    }

    await validarSenhaAtual(
      senhaAtual
    );

    const {
      error
    } = await supabase.auth
      .updateUser({
        password: novaSenha
      });

    if (error) {
      throw error;
    }

    if (campoSenhaAtual) {
      campoSenhaAtual.value = "";
    }

    if (campoNovaSenha) {
      campoNovaSenha.value = "";
    }

    if (campoConfirmarSenha) {
      campoConfirmarSenha.value =
        "";
    }

    mostrarMensagem(
      caixaSenha,
      "Sua senha foi alterada com sucesso.",
      "sucesso"
    );
  } catch (erro) {
    console.error(
      "Erro ao alterar senha:",
      erro
    );

    mostrarMensagem(
      caixaSenha,
      erro?.message ||
      "Não foi possível alterar sua senha.",
      "erro"
    );
  } finally {
    definirCarregamento(
      botaoSalvarSenha,
      false
    );
  }
}


/*
  Abre o modal de exclusão.
*/
function abrirModalExclusao(
  evento
) {
  evento?.preventDefault();

  limparMensagem(
    caixaExclusao
  );

  if (campoConfirmacaoExclusao) {
    campoConfirmacaoExclusao.value =
      "";
  }

  if (!modalExclusao) {
    campoConfirmacaoExclusao
      ?.focus();

    return;
  }

  modalExclusao.hidden = false;

  modalExclusao.classList.add(
    "modal-ativo"
  );

  modalExclusao.setAttribute(
    "aria-hidden",
    "false"
  );

  document.body.classList.add(
    "modal-aberto"
  );

  window.setTimeout(
    () => {
      campoConfirmacaoExclusao
        ?.focus();
    },
    0
  );
}


/*
  Fecha o modal de exclusão.
*/
function fecharModalExclusao(
  evento
) {
  evento?.preventDefault();

  if (
    exclusaoEmAndamento
  ) {
    return;
  }

  limparMensagem(
    caixaExclusao
  );

  if (campoConfirmacaoExclusao) {
    campoConfirmacaoExclusao.value =
      "";
  }

  if (!modalExclusao) {
    return;
  }

  modalExclusao.hidden = true;

  modalExclusao.classList.remove(
    "modal-ativo"
  );

  modalExclusao.setAttribute(
    "aria-hidden",
    "true"
  );

  document.body.classList.remove(
    "modal-aberto"
  );

  botaoAbrirExclusao
    ?.focus();
}


/*
  Tenta extrair a mensagem JSON retornada
  pela Edge Function.
*/
async function obterMensagemErroFuncao(
  erro
) {
  let mensagem =
    erro?.message ||
    "Não foi possível excluir sua conta.";

  if (!erro?.context) {
    return mensagem;
  }

  try {
    const resposta =
      typeof erro.context.clone ===
        "function"
        ? erro.context.clone()
        : erro.context;

    const corpo =
      await resposta.json();

    if (
      typeof corpo?.error ===
      "string"
    ) {
      mensagem = corpo.error;
    }
  } catch (erroLeitura) {
    console.warn(
      "Não foi possível ler o erro da função:",
      erroLeitura
    );
  }

  return mensagem;
}


/*
  Exclui a conta e cancela a assinatura
  por meio da Edge Function.
*/
async function excluirConta(
  evento
) {
  evento?.preventDefault();

  if (exclusaoEmAndamento) {
    return;
  }

  limparMensagem(
    caixaExclusao
  );

  const confirmacao =
    String(
      campoConfirmacaoExclusao
        ?.value || ""
    )
      .trim()
      .toUpperCase();

  if (
    confirmacao !==
    "EXCLUIR"
  ) {
    mostrarMensagem(
      caixaExclusao,
      'Digite "EXCLUIR" para confirmar.',
      "erro"
    );

    campoConfirmacaoExclusao
      ?.focus();

    return;
  }

  exclusaoEmAndamento = true;

  definirCarregamento(
    botaoConfirmarExclusao,
    true,
    "Encerrando assinatura e conta..."
  );

  if (botaoCancelarExclusao) {
    botaoCancelarExclusao.disabled =
      true;
  }

  if (botaoFecharExclusao) {
    botaoFecharExclusao.disabled =
      true;
  }

  try {
    /*
      Obtém a sessão e o token usados
      para autenticar a Edge Function.
    */
    let {
      data: dadosSessao,
      error: erroSessao
    } = await supabase.auth
      .getSession();

    if (
      erroSessao ||
      !dadosSessao.session
        ?.access_token
    ) {
      const {
        data: dadosAtualizados,
        error: erroAtualizacao
      } = await supabase.auth
        .refreshSession();

      if (erroAtualizacao) {
        throw erroAtualizacao;
      }

      dadosSessao =
        dadosAtualizados;
    }

    const accessToken =
      dadosSessao.session
        ?.access_token;

    if (!accessToken) {
      window.location.replace(
        "login.html"
      );

      return;
    }

    const {
      data,
      error
    } = await supabase.functions
      .invoke(
        "delete-account",
        {
          headers: {
            Authorization:
              `Bearer ${accessToken}`
          },

          body: {
            confirmacao: "EXCLUIR"
          }
        }
      );

    if (error) {
      const mensagem =
        await obterMensagemErroFuncao(
          error
        );

      throw new Error(mensagem);
    }

    if (!data?.success) {
      throw new Error(
        data?.error ||
        "Não foi possível excluir sua conta."
      );
    }

    /*
      O usuário já foi removido no servidor.
      Limpamos apenas a sessão armazenada
      neste navegador.
    */
    try {
      await supabase.auth
        .signOut({
          scope: "local"
        });
    } catch (erroLogout) {
      console.warn(
        "A sessão local já estava inválida:",
        erroLogout
      );
    }

    try {
      localStorage.removeItem(
        "atero_plano"
      );

      localStorage.removeItem(
        "atero_apps"
      );

      sessionStorage.clear();
    } catch (erroStorage) {
      console.warn(
        "Não foi possível limpar todo o armazenamento:",
        erroStorage
      );
    }

    window.location.replace(
      "index.html?conta=excluida"
    );
  } catch (erro) {
    console.error(
      "Erro ao excluir conta:",
      erro
    );

    mostrarMensagem(
      caixaExclusao,
      erro?.message ||
      "Não foi possível excluir sua conta.",
      "erro"
    );

    exclusaoEmAndamento =
      false;

    definirCarregamento(
      botaoConfirmarExclusao,
      false
    );

    if (botaoCancelarExclusao) {
      botaoCancelarExclusao.disabled =
        false;
    }

    if (botaoFecharExclusao) {
      botaoFecharExclusao.disabled =
        false;
    }
  }
}


/*
  Encerra a sessão sem excluir a conta.
*/
async function sairDaConta(
  evento
) {
  evento?.preventDefault();

  definirCarregamento(
    botaoSair,
    true,
    "Saindo..."
  );

  try {
    const {
      error
    } = await supabase.auth
      .signOut();

    if (error) {
      throw error;
    }

    window.location.replace(
      "login.html"
    );
  } catch (erro) {
    console.error(
      "Erro ao sair:",
      erro
    );

    definirCarregamento(
      botaoSair,
      false
    );
  }
}


/*
  Configuração dos eventos.
*/
formularioDados
  ?.addEventListener(
    "submit",
    salvarDados
  );

if (
  !formularioDados &&
  botaoSalvarDados
) {
  botaoSalvarDados
    .addEventListener(
      "click",
      salvarDados
    );
}


formularioSenha
  ?.addEventListener(
    "submit",
    alterarSenha
  );

if (
  !formularioSenha &&
  botaoSalvarSenha
) {
  botaoSalvarSenha
    .addEventListener(
      "click",
      alterarSenha
    );
}


botaoAbrirExclusao
  ?.addEventListener(
    "click",
    abrirModalExclusao
  );


botaoCancelarExclusao
  ?.addEventListener(
    "click",
    fecharModalExclusao
  );


botaoFecharExclusao
  ?.addEventListener(
    "click",
    fecharModalExclusao
  );


botaoConfirmarExclusao
  ?.addEventListener(
    "click",
    excluirConta
  );


campoConfirmacaoExclusao
  ?.addEventListener(
    "input",
    () => {
      limparMensagem(
        caixaExclusao
      );

      if (
        botaoConfirmarExclusao
      ) {
        const confirmado =
          campoConfirmacaoExclusao
            .value
            .trim()
            .toUpperCase() ===
          "EXCLUIR";

        botaoConfirmarExclusao
          .disabled =
            !confirmado;
      }
    }
  );


campoConfirmacaoExclusao
  ?.addEventListener(
    "keydown",
    (evento) => {
      if (
        evento.key === "Enter"
      ) {
        evento.preventDefault();

        excluirConta(
          evento
        );
      }
    }
  );


botaoSair
  ?.addEventListener(
    "click",
    sairDaConta
  );


/*
  Fecha o modal com Escape.
*/
document.addEventListener(
  "keydown",
  (evento) => {
    if (
      evento.key === "Escape" &&
      modalExclusao &&
      !modalExclusao.hidden
    ) {
      fecharModalExclusao(
        evento
      );
    }
  }
);


/*
  Fecha ao clicar no fundo do modal,
  mas não ao clicar em seu conteúdo.
*/
modalExclusao
  ?.addEventListener(
    "click",
    (evento) => {
      if (
        evento.target ===
        modalExclusao
      ) {
        fecharModalExclusao(
          evento
        );
      }
    }
  );


/*
  Redireciona caso o usuário saia
  por outra aba do navegador.
*/
supabase.auth.onAuthStateChange(
  (evento, sessao) => {
    if (
      evento === "SIGNED_OUT" &&
      !exclusaoEmAndamento
    ) {
      window.location.replace(
        "login.html"
      );

      return;
    }

    if (
      evento === "SIGNED_IN" &&
      sessao?.user
    ) {
      usuarioAtual =
        sessao.user;
    }
  }
);


/*
  Estado inicial do botão de exclusão.
*/
if (
  botaoConfirmarExclusao &&
  campoConfirmacaoExclusao
) {
  botaoConfirmarExclusao.disabled =
    campoConfirmacaoExclusao
      .value
      .trim()
      .toUpperCase() !==
    "EXCLUIR";
}


/*
  Carrega a página.
*/
carregarDadosConta()
  .catch((erro) => {
    console.error(
      "Erro ao iniciar gerenciamento da conta:",
      erro
    );

    mostrarMensagem(
      caixaDados,
      "Não foi possível carregar os dados da conta.",
      "erro"
    );
  });
