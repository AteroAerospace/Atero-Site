import { supabase } from "./supabase-client.js";


const pagina =
  document.querySelector(
    "#pagina-gerenciar-conta"
  );

const formularioPerfil =
  document.querySelector(
    "#form-dados-pessoais"
  );

const campoNome =
  document.querySelector("#nome");

const campoEmail =
  document.querySelector("#email");

const avatarUsuario =
  document.querySelector("#avatar-usuario");

const statusConta =
  document.querySelector("#status-conta");

const dataCriacao =
  document.querySelector("#data-criacao");

const ultimoAcesso =
  document.querySelector("#ultimo-acesso");

const statusEmail =
  document.querySelector("#status-email");

const mensagemPerfil =
  document.querySelector("#mensagem-perfil");

const botaoSalvarPerfil =
  document.querySelector(
    "#botao-salvar-perfil"
  );


const modalExclusao =
  document.querySelector("#modal-exclusao");

const fundoModalExclusao =
  document.querySelector(
    "#fundo-modal-exclusao"
  );

const botaoAbrirExclusao =
  document.querySelector(
    "#botao-abrir-exclusao"
  );

const botaoCancelarExclusao =
  document.querySelector(
    "#botao-cancelar-exclusao"
  );

const botaoConfirmarExclusao =
  document.querySelector(
    "#botao-confirmar-exclusao"
  );

const campoConfirmacaoExclusao =
  document.querySelector(
    "#confirmacao-exclusao"
  );

const mensagemExclusao =
  document.querySelector(
    "#mensagem-exclusao"
  );


let usuarioAtual = null;
let nomeOriginal = "";
let excluindoConta = false;


/*
  Redireciona usuários sem sessão.
*/
function redirecionarParaLogin() {
  const destino =
    encodeURIComponent(
      "gerenciar-conta.html"
    );

  window.location.replace(
    `login.html?next=${destino}`
  );
}


/*
  Exibe uma mensagem dentro de um elemento.
*/
function mostrarMensagem(
  elemento,
  texto,
  tipo = "sucesso"
) {
  elemento.hidden = false;
  elemento.textContent = texto;

  elemento.classList.remove(
    "auth-mensagem-sucesso",
    "auth-mensagem-erro"
  );

  elemento.classList.add(
    tipo === "erro"
      ? "auth-mensagem-erro"
      : "auth-mensagem-sucesso"
  );
}


/*
  Esconde uma mensagem anterior.
*/
function esconderMensagem(elemento) {
  elemento.hidden = true;
  elemento.textContent = "";

  elemento.classList.remove(
    "auth-mensagem-sucesso",
    "auth-mensagem-erro"
  );
}


/*
  Formata datas retornadas pelo Supabase.
*/
function formatarData(data) {
  if (!data) {
    return "Não disponível";
  }

  const objetoData =
    new Date(data);

  if (
    Number.isNaN(
      objetoData.getTime()
    )
  ) {
    return "Não disponível";
  }

  return objetoData.toLocaleString(
    "pt-BR",
    {
      dateStyle: "long",
      timeStyle: "short"
    }
  );
}


/*
  Retorna a primeira letra do nome.
*/
function obterInicial(nome) {
  const nomeLimpo =
    nome?.trim() || "";

  if (!nomeLimpo) {
    return "U";
  }

  return nomeLimpo
    .charAt(0)
    .toUpperCase();
}


/*
  Controla o estado do botão de perfil.
*/
function atualizarBotaoPerfil() {
  const nomeAtual =
    campoNome.value.trim();

  botaoSalvarPerfil.disabled =
    nomeAtual.length < 2 ||
    nomeAtual === nomeOriginal;
}


/*
  Busca o usuário autenticado e o perfil.
*/
async function carregarConta() {
  const {
    data: dadosUsuario,
    error: erroUsuario
  } = await supabase.auth.getUser();


  if (
    erroUsuario ||
    !dadosUsuario.user
  ) {
    redirecionarParaLogin();
    return;
  }


  usuarioAtual =
    dadosUsuario.user;


  const {
    data: perfil,
    error: erroPerfil
  } = await supabase
    .from("profiles")
    .select(`
      display_name,
      created_at,
      updated_at
    `)
    .eq("id", usuarioAtual.id)
    .single();


  if (erroPerfil) {
    console.error(
      "Erro ao carregar perfil:",
      erroPerfil
    );

    mostrarMensagem(
      mensagemPerfil,
      "Não foi possível carregar os dados da conta.",
      "erro"
    );

    pagina.setAttribute(
      "aria-busy",
      "false"
    );

    return;
  }


  nomeOriginal =
    perfil.display_name?.trim() ||
    usuarioAtual.email?.split("@")[0] ||
    "Usuário";


  campoNome.value =
    nomeOriginal;

  campoEmail.value =
    usuarioAtual.email || "";

  avatarUsuario.textContent =
    obterInicial(nomeOriginal);

  statusConta.textContent =
    "Ativa";

  dataCriacao.textContent =
    formatarData(
      usuarioAtual.created_at ||
      perfil.created_at
    );

  ultimoAcesso.textContent =
    formatarData(
      usuarioAtual.last_sign_in_at
    );

  statusEmail.textContent =
    usuarioAtual.email_confirmed_at
      ? "Confirmado"
      : "Aguardando confirmação";


  pagina.setAttribute(
    "aria-busy",
    "false"
  );

  atualizarBotaoPerfil();
}


/*
  Salva o novo nome na tabela profiles
  e também na metadata do Auth.
*/
async function salvarPerfil(evento) {
  evento.preventDefault();

  esconderMensagem(
    mensagemPerfil
  );


  const novoNome =
    campoNome.value.trim();


  if (novoNome.length < 2) {
    mostrarMensagem(
      mensagemPerfil,
      "O nome precisa ter pelo menos 2 caracteres.",
      "erro"
    );

    campoNome.focus();
    return;
  }


  if (novoNome.length > 80) {
    mostrarMensagem(
      mensagemPerfil,
      "O nome não pode ultrapassar 80 caracteres.",
      "erro"
    );

    campoNome.focus();
    return;
  }


  botaoSalvarPerfil.disabled = true;
  botaoSalvarPerfil.textContent =
    "Salvando...";


  const {
    error: erroPerfil
  } = await supabase
    .from("profiles")
    .update({
      display_name: novoNome
    })
    .eq("id", usuarioAtual.id);


  if (erroPerfil) {
    console.error(
      "Erro ao atualizar perfil:",
      erroPerfil
    );

    mostrarMensagem(
      mensagemPerfil,
      "Não foi possível salvar o nome.",
      "erro"
    );

    restaurarBotaoPerfil();
    return;
  }


  /*
    Atualiza também a metadata para manter
    o nome consistente no Supabase Auth.
  */
  const {
    error: erroMetadata
  } = await supabase.auth.updateUser({
    data: {
      display_name: novoNome
    }
  });


  if (erroMetadata) {
    /*
      O perfil principal já foi salvo.
      Não revertemos o nome apenas porque
      a metadata secundária falhou.
    */
    console.warn(
      "O perfil foi salvo, mas a metadata não:",
      erroMetadata
    );
  }


  nomeOriginal = novoNome;

  avatarUsuario.textContent =
    obterInicial(novoNome);


  mostrarMensagem(
    mensagemPerfil,
    "Nome atualizado com sucesso."
  );


  restaurarBotaoPerfil();
}


/*
  Restaura o conteúdo do botão de perfil.
*/
function restaurarBotaoPerfil() {
  botaoSalvarPerfil.innerHTML = `
    Salvar alterações
    <span aria-hidden="true">→</span>
  `;

  atualizarBotaoPerfil();
}


/*
  Abre o modal de exclusão.
*/
function abrirModalExclusao() {
  esconderMensagem(
    mensagemExclusao
  );

  campoConfirmacaoExclusao.value = "";

  botaoConfirmarExclusao.disabled = true;

  modalExclusao.hidden = false;

  document.body.classList.add(
    "modal-aberto"
  );

  window.setTimeout(
    () => {
      campoConfirmacaoExclusao.focus();
    },
    50
  );
}


/*
  Fecha o modal.
*/
function fecharModalExclusao() {
  if (excluindoConta) {
    return;
  }

  modalExclusao.hidden = true;

  document.body.classList.remove(
    "modal-aberto"
  );

  campoConfirmacaoExclusao.value = "";

  esconderMensagem(
    mensagemExclusao
  );
}


/*
  Verifica a palavra de confirmação.
*/
function atualizarConfirmacaoExclusao() {
  const confirmacao =
    campoConfirmacaoExclusao
      .value
      .trim()
      .toUpperCase();

  botaoConfirmarExclusao.disabled =
    confirmacao !== "EXCLUIR" ||
    excluindoConta;
}


/*
  Solicita a exclusão à Edge Function.
*/
async function excluirConta() {
  if (excluindoConta) {
    return;
  }


  const confirmacao =
    campoConfirmacaoExclusao
      .value
      .trim()
      .toUpperCase();


  if (confirmacao !== "EXCLUIR") {
    mostrarMensagem(
      mensagemExclusao,
      "Digite EXCLUIR para confirmar.",
      "erro"
    );

    return;
  }


  excluindoConta = true;

  botaoConfirmarExclusao.disabled = true;
  botaoConfirmarExclusao.textContent =
    "Excluindo conta...";

  botaoCancelarExclusao.disabled = true;
  campoConfirmacaoExclusao.disabled = true;


  const {
    data,
    error
  } = await supabase.functions.invoke(
    "delete-account",
    {
      body: {
        confirmation: "EXCLUIR"
      }
    }
  );


  if (error) {
    console.error(
      "Erro ao excluir conta:",
      error
    );

    mostrarMensagem(
      mensagemExclusao,
      "Não foi possível excluir a conta. Tente novamente.",
      "erro"
    );

    restaurarExclusao();
    return;
  }


  if (!data?.success) {
    mostrarMensagem(
      mensagemExclusao,
      data?.error ||
      "A exclusão da conta não foi concluída.",
      "erro"
    );

    restaurarExclusao();
    return;
  }


  /*
    A conta já não existe mais no servidor.
    Limpamos a sessão local.
  */
  await supabase.auth.signOut({
    scope: "local"
  });


  window.location.replace(
    "index.html?conta=excluida"
  );
}


/*
  Restaura o formulário após uma falha.
*/
function restaurarExclusao() {
  excluindoConta = false;

  botaoConfirmarExclusao.textContent =
    "Excluir definitivamente";

  botaoCancelarExclusao.disabled = false;
  campoConfirmacaoExclusao.disabled = false;

  atualizarConfirmacaoExclusao();
}


formularioPerfil.addEventListener(
  "submit",
  salvarPerfil
);


campoNome.addEventListener(
  "input",
  () => {
    esconderMensagem(
      mensagemPerfil
    );

    atualizarBotaoPerfil();
  }
);


botaoAbrirExclusao.addEventListener(
  "click",
  abrirModalExclusao
);


botaoCancelarExclusao.addEventListener(
  "click",
  fecharModalExclusao
);


fundoModalExclusao.addEventListener(
  "click",
  fecharModalExclusao
);


campoConfirmacaoExclusao.addEventListener(
  "input",
  atualizarConfirmacaoExclusao
);


botaoConfirmarExclusao.addEventListener(
  "click",
  excluirConta
);


document.addEventListener(
  "keydown",
  evento => {
    if (
      evento.key === "Escape" &&
      !modalExclusao.hidden
    ) {
      fecharModalExclusao();
    }
  }
);


supabase.auth.onAuthStateChange(
  evento => {
    if (evento === "SIGNED_OUT") {
      redirecionarParaLogin();
    }
  }
);


carregarConta();
