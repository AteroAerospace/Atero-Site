import {
  supabase
} from "./supabase-client.js?v=18";


const paginaSelecao =
  document.querySelector(
    "#pagina-selecao"
  );

const listaAplicativos =
  document.querySelector(
    "#lista-aplicativos"
  );

const nomePlano =
  document.querySelector(
    "#nome-plano"
  );

const limitePlano =
  document.querySelector(
    "#limite-plano"
  );

const contadorApps =
  document.querySelector(
    "#contador-apps"
  );

const barraProgresso =
  document.querySelector(
    "#barra-progresso"
  );

const mensagemSelecao =
  document.querySelector(
    "#mensagem-selecao"
  );

const botaoSalvar =
  document.querySelector(
    "#botao-salvar"
  );


let usuarioAtual = null;
let assinaturaAtual = null;
let planoAtual = null;

let catalogoAplicativos = [];
let aplicativosOriginais = [];
let aplicativosSelecionados = [];

let salvamentoEmAndamento = false;
let edicaoPermitida = true;


const APLICATIVOS_PADRAO = [
  {
    id: "calendar",
    name: "Atero Calendar",
    description:
      "Calendário conectado para organizar eventos, " +
      "compromissos, lembretes e rotinas.",
    icon_path: "assets/logos/calendar.png",
    category: "produtividade",
    sort_order: 3
  },

  {
    id: "floor",
    name: "Atero Floor",
    description:
      "Crie, edite e organize plantas baixas " +
      "diretamente no Ecossistema Atero.",
    icon_path: "assets/logos/floor.png",
    category: "design",
    sort_order: 4
  }
];


const PLANOS_PADRAO = {
  gratis: {
    id: "gratis",
    name: "Grátis",
    app_limit: 2
  },

  pro: {
    id: "pro",
    name: "Pro",
    app_limit: 4
  },

  ultra: {
    id: "ultra",
    name: "Ultra",
    app_limit: null
  }
};


/*
  Mantém os aplicativos padrão visíveis mesmo
  enquanto o catálogo remoto é atualizado.
*/
function incluirAplicativosPadraoNoCatalogo(
  catalogo = []
) {
  const idsExistentes =
    new Set(
      catalogo.map(
        (aplicativo) =>
          aplicativo.id
      )
    );

  const aplicativosAusentes =
    APLICATIVOS_PADRAO.filter(
      (aplicativo) =>
        !idsExistentes.has(
          aplicativo.id
        )
    );

  return [
    ...catalogo,
    ...aplicativosAusentes
  ].sort(
    (aplicativoA, aplicativoB) => {
      const ordemA =
        Number(
          aplicativoA.sort_order
        ) || 0;

      const ordemB =
        Number(
          aplicativoB.sort_order
        ) || 0;

      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }

      return String(
        aplicativoA.name || ""
      ).localeCompare(
        String(
          aplicativoB.name || ""
        ),
        "pt-BR"
      );
    }
  );
}


/*
  Converte uma lista de IDs em uma lista
  ordenada e sem itens repetidos.
*/
function normalizarIds(ids = []) {
  return Array.from(
    new Set(
      ids
        .map((id) =>
          String(id || "").trim()
        )
        .filter(Boolean)
    )
  ).sort();
}


/*
  Compara duas seleções de aplicativos.
*/
function listasIguais(
  listaA,
  listaB
) {
  const a =
    normalizarIds(listaA);

  const b =
    normalizarIds(listaB);

  if (a.length !== b.length) {
    return false;
  }

  return a.every(
    (item, indice) =>
      item === b[indice]
  );
}


/*
  Calcula quais aplicativos foram
  adicionados e removidos.
*/
function calcularDiferencas(
  original,
  novaSelecao
) {
  const antigos =
    new Set(original);

  const novos =
    new Set(novaSelecao);

  const adicionados =
    novaSelecao.filter(
      (id) =>
        !antigos.has(id)
    );

  const removidos =
    original.filter(
      (id) =>
        !novos.has(id)
    );

  return {
    adicionados,
    removidos,
    quantidadeAdicionada:
      adicionados.length,
    quantidadeRemovida:
      removidos.length
  };
}


/*
  Formata datas para o padrão brasileiro.
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
      dateStyle: "long",
      timeStyle: "short"
    }
  ).format(objetoData);
}


/*
  Mostra uma mensagem na parte inferior
  da página.
*/
function mostrarMensagem(
  texto,
  alerta = false
) {
  if (!mensagemSelecao) {
    return;
  }

  mensagemSelecao.textContent =
    texto;

  mensagemSelecao.classList.toggle(
    "selecao-mensagem-alerta",
    alerta
  );
}


/*
  Mostra um erro dentro da área
  dos aplicativos.
*/
function mostrarErroAplicativos(
  mensagem
) {
  if (!listaAplicativos) {
    return;
  }

  const elemento =
    document.createElement("p");

  elemento.className =
    "selecao-erro-carregamento";

  elemento.setAttribute(
    "role",
    "alert"
  );

  elemento.textContent =
    mensagem;

  listaAplicativos.replaceChildren(
    elemento
  );
}


/*
  Verifica se esta é a primeira configuração
  feita dentro do plano atual.
*/
function possuiContextoNovoDePlano() {
  return (
    !assinaturaAtual
      ?.app_selection_initialized_at ||
    assinaturaAtual
      ?.app_change_plan_id !==
      planoAtual?.id
  );
}


/*
  Retorna o bloqueio temporal atual.
*/
function obterBloqueioAtual() {
  if (
    !assinaturaAtual ||
    !planoAtual
  ) {
    return {
      bloqueado: false,
      data: null
    };
  }

  if (
    assinaturaAtual
      .app_change_plan_id !==
    planoAtual.id
  ) {
    return {
      bloqueado: false,
      data: null
    };
  }

  const data =
    assinaturaAtual
      .app_change_available_at;

  if (!data) {
    return {
      bloqueado: false,
      data: null
    };
  }

  const objetoData =
    new Date(data);

  if (
    Number.isNaN(
      objetoData.getTime()
    )
  ) {
    return {
      bloqueado: false,
      data: null
    };
  }

  return {
    bloqueado:
      objetoData.getTime() >
      Date.now(),

    data: objetoData
  };
}


/*
  Retorna o limite visual usado
  na barra de progresso.
*/
function obterLimiteVisual() {
  if (
    planoAtual?.app_limit === null ||
    planoAtual?.app_limit === undefined
  ) {
    return catalogoAplicativos.length;
  }

  return Number(
    planoAtual.app_limit
  );
}


/*
  Retorna a descrição das regras
  de cada plano.
*/
function obterDescricaoRegra() {
  if (!planoAtual) {
    return "";
  }

  if (planoAtual.id === "gratis") {
    return (
      "Até 2 aplicativos · " +
      "uma troca mensal"
    );
  }

  if (planoAtual.id === "pro") {
    return (
      "Até 4 aplicativos · " +
      "um app por dia"
    );
  }

  return (
    "Todos os aplicativos · " +
    "trocas ilimitadas"
  );
}


/*
  Retorna a mensagem padrão da seleção.
*/
function obterMensagemPadrao(
  possuiAlteracao = false
) {
  if (!planoAtual) {
    return "";
  }

  if (!edicaoPermitida) {
    return (
      "Sua assinatura não permite alterar " +
      "aplicativos neste momento."
    );
  }

  const bloqueio =
    obterBloqueioAtual();

  if (bloqueio.bloqueado) {
    const dataFormatada =
      formatarData(
        bloqueio.data
      );

    if (planoAtual.id === "gratis") {
      return (
        "Sua seleção está bloqueada até " +
        `${dataFormatada}.`
      );
    }

    if (planoAtual.id === "pro") {
      return (
        "Você poderá alterar outro aplicativo em " +
        `${dataFormatada}.`
      );
    }
  }

  const primeiraConfiguracao =
    possuiContextoNovoDePlano();

  if (planoAtual.id === "gratis") {
    if (primeiraConfiguracao) {
      return (
        "Escolha até dois aplicativos. " +
        "Depois de salvar, você poderá trocar " +
        "novamente em um mês."
      );
    }

    return possuiAlteracao
      ? (
          "Ao salvar, sua próxima troca ficará " +
          "disponível em um mês."
        )
      : (
          "Você pode trocar os dois aplicativos " +
          "nesta alteração mensal."
        );
  }

  if (planoAtual.id === "pro") {
    if (primeiraConfiguracao) {
      return (
        "Escolha até quatro aplicativos. " +
        "Depois de salvar, a próxima alteração " +
        "estará disponível em um dia."
      );
    }

    return possuiAlteracao
      ? (
          "Ao salvar, a próxima alteração estará " +
          "disponível em um dia."
        )
      : (
          "Você pode adicionar, remover ou " +
          "substituir um aplicativo."
        );
  }

  return (
    "O plano Ultra permite alterar seus " +
    "aplicativos sem limite."
  );
}


/*
  Valida a seleção atual.
*/
function validarSelecao() {
  if (
    !planoAtual ||
    !assinaturaAtual
  ) {
    return {
      valida: false,
      mudou: false,
      mensagem:
        "Carregando seu plano..."
    };
  }

  if (!edicaoPermitida) {
    return {
      valida: false,
      mudou: false,
      mensagem:
        "Sua assinatura não permite alterar " +
        "aplicativos neste momento."
    };
  }

  const quantidade =
    aplicativosSelecionados.length;

  const limite =
    planoAtual.app_limit;

  const mudou =
    !listasIguais(
      aplicativosOriginais,
      aplicativosSelecionados
    );

  if (quantidade === 0) {
    return {
      valida: false,
      mudou,
      mensagem:
        "Escolha pelo menos um aplicativo."
    };
  }

  if (
    limite !== null &&
    limite !== undefined &&
    quantidade > Number(limite)
  ) {
    return {
      valida: false,
      mudou,
      mensagem:
        `O plano ${planoAtual.name} permite ` +
        `até ${limite} aplicativos.`
    };
  }

  const bloqueio =
    obterBloqueioAtual();

  if (
    mudou &&
    bloqueio.bloqueado
  ) {
    return {
      valida: false,
      mudou,
      mensagem:
        obterMensagemPadrao()
    };
  }

  if (
    mudou &&
    planoAtual.id === "pro" &&
    !possuiContextoNovoDePlano()
  ) {
    const diferencas =
      calcularDiferencas(
        aplicativosOriginais,
        aplicativosSelecionados
      );

    if (
      Math.max(
        diferencas.quantidadeAdicionada,
        diferencas.quantidadeRemovida
      ) > 1
    ) {
      return {
        valida: false,
        mudou,
        mensagem:
          "No plano Pro, você pode alterar " +
          "apenas um aplicativo por dia."
      };
    }
  }

  if (!mudou) {
    return {
      valida: true,
      mudou: false,
      mensagem:
        obterMensagemPadrao()
    };
  }

  return {
    valida: true,
    mudou: true,
    mensagem:
      obterMensagemPadrao(true)
  };
}


/*
  Cria o card de um aplicativo.
*/
function criarCardAplicativo(
  aplicativo
) {
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

  card.setAttribute(
    "aria-label",
    `Selecionar ${aplicativo.name}`
  );


  const imagem =
    document.createElement("img");

  imagem.className =
    "selecao-app-icone";

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
    aplicativo.name ||
    "Aplicativo Atero";


  const descricao =
    document.createElement("p");

  descricao.textContent =
    aplicativo.description ||
    "Aplicativo conectado ao Ecossistema Atero.";


  const marcador =
    document.createElement("span");

  marcador.className =
    "selecao-app-marcador";

  marcador.setAttribute(
    "aria-hidden",
    "true"
  );

  marcador.textContent = "✓";


  informacoes.append(
    titulo,
    descricao
  );

  card.append(
    imagem,
    informacoes,
    marcador
  );

  return card;
}


/*
  Renderiza o catálogo retornado
  pela tabela public.apps.
*/
function renderizarAplicativos() {
  if (!listaAplicativos) {
    throw new Error(
      "A área de aplicativos não foi encontrada."
    );
  }

  listaAplicativos.replaceChildren();

  if (!catalogoAplicativos.length) {
    const mensagem =
      document.createElement("p");

    mensagem.textContent =
      "Nenhum aplicativo está disponível no momento.";

    listaAplicativos.append(
      mensagem
    );

    return;
  }

  const fragmento =
    document.createDocumentFragment();

  catalogoAplicativos.forEach(
    (aplicativo) => {
      fragmento.append(
        criarCardAplicativo(
          aplicativo
        )
      );
    }
  );

  listaAplicativos.append(
    fragmento
  );
}


/*
  Atualiza o estado visual dos cards.
*/
function atualizarCards() {
  const cards =
    listaAplicativos
      ?.querySelectorAll(
        ".selecao-app-card[data-app]"
      ) || [];

  cards.forEach((card) => {
    const appId =
      card.dataset.app;

    const selecionado =
      aplicativosSelecionados
        .includes(appId);

    card.classList.toggle(
      "selecionado",
      selecionado
    );

    card.setAttribute(
      "aria-checked",
      String(selecionado)
    );

    card.classList.toggle(
      "desabilitado",
      !edicaoPermitida
    );

    card.setAttribute(
      "aria-disabled",
      String(!edicaoPermitida)
    );
  });
}


/*
  Atualiza todo o estado visual
  da página.
*/
function atualizarInterface() {
  if (
    !planoAtual ||
    !assinaturaAtual
  ) {
    return;
  }

  const quantidade =
    aplicativosSelecionados.length;

  const limiteVisual =
    obterLimiteVisual();

  if (nomePlano) {
    nomePlano.textContent =
      planoAtual.name;
  }

  if (limitePlano) {
    limitePlano.textContent =
      obterDescricaoRegra();
  }

  if (contadorApps) {
    contadorApps.textContent =
      planoAtual.app_limit === null
        ? (
            `${quantidade} de ` +
            `${catalogoAplicativos.length}`
          )
        : (
            `${quantidade} de ` +
            `${planoAtual.app_limit}`
          );
  }

  if (barraProgresso) {
    const porcentagem =
      limiteVisual > 0
        ? (
            quantidade /
            limiteVisual
          ) * 100
        : 0;

    barraProgresso.style.width =
      `${Math.min(porcentagem, 100)}%`;
  }

  const validacao =
    validarSelecao();

  mostrarMensagem(
    validacao.mensagem,
    !validacao.valida
  );

  if (botaoSalvar) {
    botaoSalvar.disabled =
      salvamentoEmAndamento ||
      !validacao.valida ||
      !validacao.mudou;
  }

  atualizarCards();
}


/*
  Verifica se uma nova seleção temporária
  pode ser aplicada.
*/
function podeAplicarSelecaoTemporaria(
  novaSelecao
) {
  if (!edicaoPermitida) {
    mostrarMensagem(
      "Sua assinatura não permite alterar " +
      "aplicativos neste momento.",
      true
    );

    return false;
  }

  const limite =
    planoAtual?.app_limit;

  if (
    limite !== null &&
    limite !== undefined &&
    novaSelecao.length >
      Number(limite)
  ) {
    mostrarMensagem(
      `O plano ${planoAtual.name} permite ` +
      `até ${limite} aplicativos.`,
      true
    );

    return false;
  }

  const bloqueio =
    obterBloqueioAtual();

  if (bloqueio.bloqueado) {
    mostrarMensagem(
      obterMensagemPadrao(),
      true
    );

    return false;
  }

  if (
    planoAtual?.id === "pro" &&
    !possuiContextoNovoDePlano()
  ) {
    const diferencas =
      calcularDiferencas(
        aplicativosOriginais,
        novaSelecao
      );

    if (
      Math.max(
        diferencas.quantidadeAdicionada,
        diferencas.quantidadeRemovida
      ) > 1
    ) {
      mostrarMensagem(
        "No plano Pro, você pode alterar " +
        "apenas um aplicativo por dia.",
        true
      );

      return false;
    }
  }

  return true;
}


/*
  Seleciona ou desseleciona
  um aplicativo.
*/
function alternarAplicativo(card) {
  if (
    salvamentoEmAndamento ||
    !planoAtual ||
    !edicaoPermitida
  ) {
    return;
  }

  const appId =
    card.dataset.app;

  if (!appId) {
    return;
  }

  const novaSelecao =
    [...aplicativosSelecionados];

  const indice =
    novaSelecao.indexOf(appId);

  if (indice >= 0) {
    novaSelecao.splice(
      indice,
      1
    );
  } else {
    novaSelecao.push(
      appId
    );
  }

  if (
    !podeAplicarSelecaoTemporaria(
      novaSelecao
    )
  ) {
    return;
  }

  aplicativosSelecionados =
    normalizarIds(
      novaSelecao
    );

  atualizarInterface();
}


/*
  Trata clique nos cards usando
  delegação de eventos.
*/
listaAplicativos?.addEventListener(
  "click",
  (evento) => {
    const card =
      evento.target.closest(
        ".selecao-app-card[data-app]"
      );

    if (!card) {
      return;
    }

    alternarAplicativo(card);
  }
);


/*
  Permite selecionar usando Enter
  ou barra de espaço.
*/
listaAplicativos?.addEventListener(
  "keydown",
  (evento) => {
    if (
      evento.key !== "Enter" &&
      evento.key !== " "
    ) {
      return;
    }

    const card =
      evento.target.closest(
        ".selecao-app-card[data-app]"
      );

    if (!card) {
      return;
    }

    evento.preventDefault();

    alternarAplicativo(card);
  }
);


/*
  Lê o resultado retornado pela RPC,
  independentemente de ser objeto ou array.
*/
function normalizarResultadoRpc(data) {
  if (Array.isArray(data)) {
    return data[0] || {};
  }

  return data || {};
}


/*
  Salva a seleção usando a RPC protegida.
*/
async function salvarAplicativos() {
  if (
    salvamentoEmAndamento ||
    !botaoSalvar
  ) {
    return;
  }

  const validacao =
    validarSelecao();

  if (
    !validacao.valida ||
    !validacao.mudou
  ) {
    mostrarMensagem(
      validacao.mensagem,
      !validacao.valida
    );

    return;
  }

  salvamentoEmAndamento = true;

  botaoSalvar.disabled = true;

  botaoSalvar.setAttribute(
    "aria-busy",
    "true"
  );

  const textoOriginal =
    botaoSalvar.innerHTML;

  botaoSalvar.textContent =
    "Salvando...";

  try {
    const {
      data,
      error
    } = await supabase.rpc(
      "replace_user_apps",
      {
        selected_app_ids:
          aplicativosSelecionados
      }
    );

    if (error) {
      throw error;
    }

    const resultado =
      normalizarResultadoRpc(data);

    aplicativosOriginais =
      normalizarIds(
        aplicativosSelecionados
      );

    assinaturaAtual
      .app_selection_initialized_at =
        assinaturaAtual
          .app_selection_initialized_at ||
        new Date().toISOString();

    assinaturaAtual
      .app_change_plan_id =
        planoAtual.id;

    assinaturaAtual
      .app_change_available_at =
        resultado.next_change_at ||
        resultado.app_change_available_at ||
        null;

    mostrarMensagem(
      "Aplicativos atualizados com sucesso."
    );

    atualizarInterface();

    window.setTimeout(
      () => {
        window.location.assign(
          "conta.html"
        );
      },
      1000
    );
  } catch (erro) {
    console.error(
      "Erro ao salvar aplicativos:",
      erro
    );

    mostrarMensagem(
      erro?.message ||
      "Não foi possível salvar os aplicativos.",
      true
    );
  } finally {
    salvamentoEmAndamento = false;

    botaoSalvar.removeAttribute(
      "aria-busy"
    );

    botaoSalvar.innerHTML =
      textoOriginal;

    atualizarInterface();
  }
}


/*
  Carrega usuário, assinatura,
  plano, seleção atual e catálogo.
*/
async function carregarPagina() {
  try {
    const {
      data: dadosUsuario,
      error: erroUsuario
    } = await supabase.auth
      .getUser();

    if (
      erroUsuario ||
      !dadosUsuario.user
    ) {
      window.location.replace(
        "login.html?next=selecionar-apps.html"
      );

      return;
    }

    usuarioAtual =
      dadosUsuario.user;


    const [
      resultadoAssinatura,
      resultadoAppsUsuario,
      resultadoCatalogo
    ] = await Promise.all([
      supabase
        .from("subscriptions")
        .select(`
          plan_id,
          status,
          app_selection_initialized_at,
          app_last_changed_at,
          app_change_available_at,
          app_change_plan_id
        `)
        .eq(
          "user_id",
          usuarioAtual.id
        )
        .maybeSingle(),

      supabase
        .from("user_apps")
        .select("app_id")
        .eq(
          "user_id",
          usuarioAtual.id
        ),

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
        .eq(
          "active",
          true
        )
        .order(
          "sort_order",
          {
            ascending: true
          }
        )
        .order(
          "name",
          {
            ascending: true
          }
        )
    ]);


    if (
      resultadoAssinatura.error ||
      !resultadoAssinatura.data
    ) {
      throw (
        resultadoAssinatura.error ||
        new Error(
          "Assinatura não encontrada para esta conta."
        )
      );
    }

    if (resultadoAppsUsuario.error) {
      throw resultadoAppsUsuario.error;
    }

    if (resultadoCatalogo.error) {
      throw resultadoCatalogo.error;
    }


    assinaturaAtual =
      resultadoAssinatura.data;

    catalogoAplicativos =
      incluirAplicativosPadraoNoCatalogo(
        resultadoCatalogo.data ||
        []
      );


    if (!catalogoAplicativos.length) {
      throw new Error(
        "Nenhum aplicativo ativo foi encontrado no banco."
      );
    }


    edicaoPermitida =
      [
        "active",
        "trialing"
      ].includes(
        assinaturaAtual.status
      );


    const resultadoPlano =
      await supabase
        .from("plans")
        .select(
          "id, name, app_limit"
        )
        .eq(
          "id",
          assinaturaAtual.plan_id
        )
        .maybeSingle();


    if (resultadoPlano.error) {
      console.warn(
        "Plano não encontrado no banco. " +
        "Usando configuração padrão:",
        resultadoPlano.error
      );
    }


    planoAtual =
      resultadoPlano.data ||
      PLANOS_PADRAO[
        assinaturaAtual.plan_id
      ] ||
      PLANOS_PADRAO.gratis;


    const idsDisponiveis =
      new Set(
        catalogoAplicativos.map(
          (aplicativo) =>
            aplicativo.id
        )
      );


    aplicativosOriginais =
      normalizarIds(
        (
          resultadoAppsUsuario.data ||
          []
        )
          .map(
            (item) =>
              item.app_id
          )
          .filter(
            (appId) =>
              idsDisponiveis.has(appId)
          )
      );


    aplicativosSelecionados =
      [...aplicativosOriginais];


    renderizarAplicativos();

    atualizarInterface();
  } catch (erro) {
    console.error(
      "Erro ao carregar seleção:",
      erro
    );

    const mensagem =
      erro?.message ||
      "Não foi possível carregar seus aplicativos.";

    mostrarMensagem(
      mensagem,
      true
    );

    mostrarErroAplicativos(
      mensagem
    );
  } finally {
    paginaSelecao?.setAttribute(
      "aria-busy",
      "false"
    );
  }
}


botaoSalvar?.addEventListener(
  "click",
  salvarAplicativos
);


supabase.auth.onAuthStateChange(
  (evento) => {
    if (evento === "SIGNED_OUT") {
      window.location.replace(
        "login.html"
      );
    }
  }
);


carregarPagina();
