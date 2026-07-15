import { supabase } from "./supabase-client.js";


const paginaSelecao =
  document.querySelector("#pagina-selecao");

const nomePlano =
  document.querySelector("#nome-plano");

const limitePlano =
  document.querySelector("#limite-plano");

const contadorApps =
  document.querySelector("#contador-apps");

const barraProgresso =
  document.querySelector("#barra-progresso");

const listaAplicativos =
  document.querySelector("#lista-aplicativos");

const mensagemSelecao =
  document.querySelector("#mensagem-selecao");

const botaoSalvar =
  document.querySelector("#botao-salvar");


let usuarioAtual = null;

let planoAtual = null;

let aplicativosDisponiveis = [];

let aplicativosSelecionados = [];

let selecaoOriginal = [];

let paginaCarregada = false;

let salvando = false;


/*
  Algumas relações do Supabase podem chegar
  como objeto ou como array, dependendo da
  consulta e das relações detectadas.
*/
function normalizarRelacao(relacao) {
  if (Array.isArray(relacao)) {
    return relacao[0] ?? null;
  }

  return relacao ?? null;
}


/*
  Redireciona para o login preservando
  a página que o usuário queria acessar.
*/
function redirecionarParaLogin() {
  const destino =
    encodeURIComponent(
      "selecionar-apps.html"
    );

  window.location.replace(
    `login.html?next=${destino}`
  );
}


/*
  Compara duas listas de identificadores
  independentemente da ordem.
*/
function listasSaoIguais(
  primeiraLista,
  segundaLista
) {
  if (
    primeiraLista.length !==
    segundaLista.length
  ) {
    return false;
  }

  const primeiraOrdenada =
    [...primeiraLista].sort();

  const segundaOrdenada =
    [...segundaLista].sort();

  return primeiraOrdenada.every(
    (item, indice) =>
      item === segundaOrdenada[indice]
  );
}


/*
  Obtém o limite numérico do plano.

  app_limit null representa acesso a todos
  os aplicativos disponíveis.
*/
function obterLimiteEfetivo() {
  if (!planoAtual) {
    return 0;
  }

  if (
    planoAtual.app_limit === null ||
    planoAtual.app_limit === undefined
  ) {
    return aplicativosDisponiveis.length;
  }

  return planoAtual.app_limit;
}


/*
  Produz o texto mostrado abaixo do nome
  do plano.
*/
function obterDescricaoLimite() {
  if (!planoAtual) {
    return "Plano indisponível";
  }

  if (
    planoAtual.app_limit === null ||
    planoAtual.app_limit === undefined
  ) {
    return "Todos os aplicativos";
  }

  if (planoAtual.app_limit === 1) {
    return "Até 1 aplicativo";
  }

  return (
    `Até ${planoAtual.app_limit} aplicativos`
  );
}


/*
  Marca visualmente um card conforme
  seu estado atual.
*/
function atualizarEstadoCard(card) {
  const appId =
    card.dataset.app;

  const estaSelecionado =
    aplicativosSelecionados.includes(
      appId
    );

  card.classList.toggle(
    "selecionado",
    estaSelecionado
  );

  card.setAttribute(
    "aria-checked",
    String(estaSelecionado)
  );
}


/*
  Atualiza contador, progresso, mensagens
  e estado do botão de salvar.
*/
function atualizarInterface() {
  if (!paginaCarregada || !planoAtual) {
    botaoSalvar.disabled = true;
    return;
  }

  const quantidade =
    aplicativosSelecionados.length;

  const limite =
    obterLimiteEfetivo();

  const planoSemLimite =
    planoAtual.app_limit === null ||
    planoAtual.app_limit === undefined;

  if (planoSemLimite) {
    contadorApps.textContent =
      `${quantidade} selecionados`;
  } else {
    contadorApps.textContent =
      `${quantidade} de ${limite}`;
  }

  let porcentagem = 0;

  if (limite > 0) {
    porcentagem =
      (quantidade / limite) * 100;
  }

  barraProgresso.style.width =
    `${Math.min(porcentagem, 100)}%`;

  const selecaoFoiAlterada =
    !listasSaoIguais(
      aplicativosSelecionados,
      selecaoOriginal
    );

  botaoSalvar.disabled =
    salvando ||
    quantidade === 0 ||
    !selecaoFoiAlterada;

  mensagemSelecao.classList.remove(
    "selecao-mensagem-alerta"
  );

  if (quantidade === 0) {
    mensagemSelecao.textContent =
      "Escolha pelo menos um aplicativo para continuar.";

    return;
  }

  if (!selecaoFoiAlterada) {
    mensagemSelecao.textContent =
      "Sua seleção já está salva.";

    return;
  }

  if (
    !planoSemLimite &&
    quantidade >= limite
  ) {
    mensagemSelecao.textContent =
      "Você atingiu o limite do seu plano.";

    mensagemSelecao.classList.add(
      "selecao-mensagem-alerta"
    );

    return;
  }

  if (planoSemLimite) {
    mensagemSelecao.textContent =
      "Seu plano permite selecionar todos os aplicativos.";

    return;
  }

  const restantes =
    Math.max(
      limite - quantidade,
      0
    );

  if (restantes === 1) {
    mensagemSelecao.textContent =
      "Você ainda pode escolher 1 aplicativo.";

    return;
  }

  mensagemSelecao.textContent =
    `Você ainda pode escolher ${restantes} aplicativos.`;
}


/*
  Alterna um aplicativo na seleção.
*/
function alternarAplicativo(card) {
  if (
    !paginaCarregada ||
    salvando ||
    !planoAtual
  ) {
    return;
  }

  const appId =
    card.dataset.app;

  const estaSelecionado =
    aplicativosSelecionados.includes(
      appId
    );

  if (estaSelecionado) {
    aplicativosSelecionados =
      aplicativosSelecionados.filter(
        id => id !== appId
      );

    atualizarEstadoCard(card);
    atualizarInterface();

    return;
  }

  const limite =
    obterLimiteEfetivo();

  if (
    aplicativosSelecionados.length >=
    limite
  ) {
    mensagemSelecao.textContent =
      `O plano ${planoAtual.name} permite ` +
      `até ${limite} aplicativos.`;

    mensagemSelecao.classList.add(
      "selecao-mensagem-alerta"
    );

    return;
  }

  aplicativosSelecionados.push(
    appId
  );

  atualizarEstadoCard(card);
  atualizarInterface();
}


/*
  Produz um card usando os dados presentes
  na tabela public.apps.
*/
function criarCardAplicativo(aplicativo) {
  const card =
    document.createElement("article");

  card.className =
    "selecao-app-card";

  card.dataset.app =
    aplicativo.id;

  card.tabIndex = 0;

  card.setAttribute(
    "role",
    "checkbox"
  );

  card.setAttribute(
    "aria-checked",
    "false"
  );


  const check =
    document.createElement("div");

  check.className =
    "selecao-app-check";

  check.setAttribute(
    "aria-hidden",
    "true"
  );

  check.textContent = "✓";


  const imagem =
    document.createElement("img");

  imagem.src =
    aplicativo.icon_path ||
    "assets/logos/favicon.png";

  imagem.alt =
    `Ícone do ${aplicativo.name}`;

  imagem.loading = "lazy";


  const informacoes =
    document.createElement("div");

  informacoes.className =
    "selecao-app-info";


  const titulo =
    document.createElement("h2");

  titulo.textContent =
    aplicativo.name;


  const descricao =
    document.createElement("p");

  descricao.textContent =
    aplicativo.description ||
    "Aplicativo do Ecossistema Atero.";


  const categoria =
    document.createElement("span");

  categoria.textContent =
    aplicativo.category ||
    "Aplicativo Atero";


  informacoes.append(
    titulo,
    descricao,
    categoria
  );

  card.append(
    check,
    imagem,
    informacoes
  );


  card.addEventListener(
    "click",
    () => {
      alternarAplicativo(card);
    }
  );


  card.addEventListener(
    "keydown",
    evento => {
      if (
        evento.key === "Enter" ||
        evento.key === " "
      ) {
        evento.preventDefault();

        alternarAplicativo(card);
      }
    }
  );


  return card;
}


/*
  Monta os cards de todos os aplicativos
  ativos retornados pelo banco.
*/
function renderizarAplicativos() {
  listaAplicativos.replaceChildren();

  if (
    aplicativosDisponiveis.length === 0
  ) {
    const mensagem =
      document.createElement("p");

    mensagem.textContent =
      "Nenhum aplicativo está disponível no momento.";

    listaAplicativos.append(
      mensagem
    );

    return;
  }

  aplicativosDisponiveis.forEach(
    aplicativo => {
      const card =
        criarCardAplicativo(
          aplicativo
        );

      listaAplicativos.append(
        card
      );

      atualizarEstadoCard(card);
    }
  );
}


/*
  Busca o usuário autenticado.
*/
async function obterUsuarioAtual() {
  const {
    data,
    error
  } = await supabase.auth.getUser();

  if (error) {
    console.error(
      "Erro ao verificar usuário:",
      error
    );

    return null;
  }

  return data.user;
}


/*
  Busca plano, aplicativos disponíveis
  e seleção atual simultaneamente.
*/
async function carregarDados() {
  const [
    resultadoAssinatura,
    resultadoApps,
    resultadoSelecao
  ] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(`
        status,
        plan_id,
        plan:plans (
          id,
          name,
          app_limit
        )
      `)
      .eq(
        "user_id",
        usuarioAtual.id
      )
      .single(),

    supabase
      .from("apps")
      .select(`
        id,
        name,
        description,
        icon_path,
        category,
        sort_order
      `)
      .eq("active", true)
      .order(
        "sort_order",
        {
          ascending: true
        }
      ),

    supabase
      .from("user_apps")
      .select("app_id")
      .eq(
        "user_id",
        usuarioAtual.id
      )
  ]);


  if (resultadoAssinatura.error) {
    throw new Error(
      "Não foi possível carregar sua assinatura."
    );
  }

  if (resultadoApps.error) {
    throw new Error(
      "Não foi possível carregar os aplicativos."
    );
  }

  if (resultadoSelecao.error) {
    throw new Error(
      "Não foi possível carregar sua seleção."
    );
  }


  const assinatura =
    resultadoAssinatura.data;

  if (
    !["active", "trialing"].includes(
      assinatura.status
    )
  ) {
    throw new Error(
      "Sua assinatura não está ativa."
    );
  }


  planoAtual =
    normalizarRelacao(
      assinatura.plan
    );

  if (!planoAtual) {
    throw new Error(
      "O plano da conta não foi encontrado."
    );
  }


  aplicativosDisponiveis =
    resultadoApps.data ?? [];


  const idsDisponiveis =
    new Set(
      aplicativosDisponiveis.map(
        aplicativo => aplicativo.id
      )
    );


  aplicativosSelecionados =
    (resultadoSelecao.data ?? [])
      .map(item => item.app_id)
      .filter(appId =>
        idsDisponiveis.has(appId)
      );


  /*
    Caso o plano tenha sido reduzido e a
    seleção anterior ultrapasse o limite,
    mantemos somente os primeiros apps.
  */
  const limite =
    obterLimiteEfetivo();

  if (
    aplicativosSelecionados.length >
    limite
  ) {
    aplicativosSelecionados =
      aplicativosSelecionados.slice(
        0,
        limite
      );
  }


  selecaoOriginal =
    [...aplicativosSelecionados];
}


/*
  Preenche a interface depois que todos
  os dados forem carregados.
*/
function preencherPagina() {
  nomePlano.textContent =
    planoAtual.name;

  limitePlano.textContent =
    obterDescricaoLimite();

  renderizarAplicativos();

  paginaCarregada = true;

  paginaSelecao.setAttribute(
    "aria-busy",
    "false"
  );

  atualizarInterface();
}


/*
  Converte alguns erros do Supabase em
  mensagens mais compreensíveis.
*/
function obterMensagemErroSalvar(erro) {
  const mensagem =
    erro?.message?.toLowerCase() ||
    "";

  if (
    mensagem.includes(
      "limite"
    ) ||
    mensagem.includes(
      "excede"
    )
  ) {
    return (
      "A seleção excede o limite do seu plano."
    );
  }

  if (
    mensagem.includes(
      "assinatura"
    )
  ) {
    return (
      "Sua assinatura não permite essa alteração."
    );
  }

  if (
    mensagem.includes(
      "autenticado"
    )
  ) {
    return (
      "Sua sessão expirou. Entre novamente."
    );
  }

  return (
    "Não foi possível salvar os aplicativos. " +
    "Tente novamente."
  );
}


/*
  Salva a seleção inteira por meio da
  função transacional criada no Supabase.
*/
async function salvarAplicativos() {
  if (
    salvando ||
    !paginaCarregada
  ) {
    return;
  }

  if (
    aplicativosSelecionados.length === 0
  ) {
    mensagemSelecao.textContent =
      "Escolha pelo menos um aplicativo.";

    mensagemSelecao.classList.add(
      "selecao-mensagem-alerta"
    );

    return;
  }

  salvando = true;

  botaoSalvar.disabled = true;
  botaoSalvar.textContent =
    "Salvando...";

  mensagemSelecao.textContent =
    "Salvando sua seleção...";

  mensagemSelecao.classList.remove(
    "selecao-mensagem-alerta"
  );


  const { error } =
    await supabase.rpc(
      "replace_user_apps",
      {
        selected_app_ids:
          aplicativosSelecionados
      }
    );


  if (error) {
    console.error(
      "Erro ao salvar aplicativos:",
      error
    );

    const mensagem =
      obterMensagemErroSalvar(
        error
      );

    mensagemSelecao.textContent =
      mensagem;

    mensagemSelecao.classList.add(
      "selecao-mensagem-alerta"
    );

    salvando = false;

    botaoSalvar.innerHTML =
      'Salvar aplicativos ' +
      '<span aria-hidden="true">→</span>';

    atualizarInterface();

    return;
  }


  selecaoOriginal =
    [...aplicativosSelecionados];

  mensagemSelecao.textContent =
    "Aplicativos salvos com sucesso.";

  salvando = false;

  botaoSalvar.innerHTML =
    'Salvar aplicativos ' +
    '<span aria-hidden="true">→</span>';

  atualizarInterface();


  window.setTimeout(
    () => {
      window.location.href =
        "conta.html";
    },
    500
  );
}


/*
  Exibe um estado de erro sem deixar a
  página aparentemente travada.
*/
function mostrarErro(mensagem) {
  paginaCarregada = false;

  paginaSelecao.setAttribute(
    "aria-busy",
    "false"
  );

  nomePlano.textContent =
    "Indisponível";

  limitePlano.textContent =
    "Não foi possível consultar o plano";

  contadorApps.textContent = "—";

  barraProgresso.style.width = "0%";

  botaoSalvar.disabled = true;

  mensagemSelecao.textContent =
    mensagem;

  mensagemSelecao.classList.add(
    "selecao-mensagem-alerta"
  );

  listaAplicativos.replaceChildren();

  const texto =
    document.createElement("p");

  texto.textContent = mensagem;

  listaAplicativos.append(texto);
}


/*
  Inicializa a página.
*/
async function iniciarPagina() {
  try {
    usuarioAtual =
      await obterUsuarioAtual();

    if (!usuarioAtual) {
      redirecionarParaLogin();
      return;
    }

    await carregarDados();

    preencherPagina();
  } catch (erro) {
    console.error(
      "Erro ao carregar seleção:",
      erro
    );

    mostrarErro(
      erro.message ||
      "Não foi possível carregar a página."
    );
  }
}


botaoSalvar.addEventListener(
  "click",
  salvarAplicativos
);


/*
  Caso a conta seja desconectada em outra
  aba, esta página também volta ao login.
*/
supabase.auth.onAuthStateChange(
  evento => {
    if (evento === "SIGNED_OUT") {
      window.location.replace(
        "login.html"
      );
    }
  }
);


iniciarPagina();
