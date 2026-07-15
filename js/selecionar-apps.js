import {
  supabase
} from "./supabase-client.js?v=16";


const cards = Array.from(
  document.querySelectorAll(
    ".selecao-app-card[data-app]"
  )
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

let aplicativosOriginais = [];
let aplicativosSelecionados = [];

let salvamentoEmAndamento = false;


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
  Normaliza relações retornadas
  pelo Supabase.
*/
function normalizarRelacao(valor) {
  if (Array.isArray(valor)) {
    return valor[0] || null;
  }

  return valor || null;
}


/*
  Retorna os IDs ordenados e sem duplicação.
*/
function normalizarIds(ids) {
  return Array.from(
    new Set(
      ids
        .map((id) =>
          String(id).trim()
        )
        .filter(Boolean)
    )
  ).sort();
}


/*
  Compara duas listas de IDs.
*/
function listasIguais(listaA, listaB) {
  const a = normalizarIds(listaA);
  const b = normalizarIds(listaB);

  if (a.length !== b.length) {
    return false;
  }

  return a.every(
    (item, indice) =>
      item === b[indice]
  );
}


/*
  Calcula quantos apps foram adicionados
  e removidos.
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
      (id) => !antigos.has(id)
    );

  const removidos =
    original.filter(
      (id) => !novos.has(id)
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
  Formata uma data no horário brasileiro.
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
  Verifica se a regra armazenada pertence
  ao plano atual.

  Ao trocar de plano, o usuário recebe uma
  nova configuração imediatamente.
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
  Verifica se ainda existe bloqueio de tempo.
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

  const bloqueado =
    !Number.isNaN(
      objetoData.getTime()
    ) &&
    objetoData.getTime() >
      Date.now();

  return {
    bloqueado,
    data: objetoData
  };
}


/*
  Mostra uma mensagem na área de seleção.
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
  Retorna o limite numérico usado
  pela interface.

  No Ultra, o limite visual é a quantidade
  total de cards.
*/
function obterLimiteVisual() {
  if (
    planoAtual?.app_limit ===
      null ||
    planoAtual?.app_limit ===
      undefined
  ) {
    return cards.length;
  }

  return Number(
    planoAtual.app_limit
  );
}


/*
  Retorna a descrição da regra do plano.
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
  Atualiza visualmente os cards.
*/
function atualizarCards() {
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
  });
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
      mensagem:
        "Carregando seu plano..."
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

  const bloqueio =
    obterBloqueioAtual();

  const diferencas =
    calcularDiferencas(
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
        `O plano ${planoAtual.name} permite até ${limite} aplicativos.`
    };
  }


  if (
    mudou &&
    bloqueio.bloqueado
  ) {
    const dataFormatada =
      formatarData(
        bloqueio.data
      );

    return {
      valida: false,
      mudou,
      mensagem:
        planoAtual.id === "gratis"
          ? (
              "Sua próxima troca mensal estará disponível em " +
              `${dataFormatada}.`
            )
          : (
              "Você poderá alterar outro aplicativo em " +
              `${dataFormatada}.`
            )
    };
  }


  if (
    mudou &&
    planoAtual.id === "pro" &&
    !possuiContextoNovoDePlano() &&
    Math.max(
      diferencas.quantidadeAdicionada,
      diferencas.quantidadeRemovida
    ) > 1
  ) {
    return {
      valida: false,
      mudou,
      mensagem:
        "No plano Pro, você pode alterar apenas um aplicativo por dia."
    };
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
  Gera a mensagem principal da página.
*/
function obterMensagemPadrao(
  possuiAlteracao = false
) {
  if (!planoAtual) {
    return "";
  }

  const bloqueio =
    obterBloqueioAtual();

  const primeiraConfiguracao =
    possuiContextoNovoDePlano();


  if (bloqueio.bloqueado) {
    const data =
      formatarData(
        bloqueio.data
      );

    if (planoAtual.id === "gratis") {
      return (
        "Sua seleção está bloqueada até " +
        `${data}.`
      );
    }

    if (planoAtual.id === "pro") {
      return (
        "Você poderá alterar outro aplicativo em " +
        `${data}.`
      );
    }
  }


  if (planoAtual.id === "gratis") {
    if (primeiraConfiguracao) {
      return (
        "Escolha até dois aplicativos. " +
        "Depois de salvar, você poderá trocar novamente em um mês."
      );
    }

    return possuiAlteracao
      ? (
          "Ao salvar, sua próxima troca ficará disponível em um mês."
        )
      : (
          "Você pode trocar os dois aplicativos nesta alteração mensal."
        );
  }


  if (planoAtual.id === "pro") {
    if (primeiraConfiguracao) {
      return (
        "Escolha até quatro aplicativos. " +
        "Depois de salvar, a próxima alteração estará disponível em um dia."
      );
    }

    return possuiAlteracao
      ? (
          "Ao salvar, a próxima alteração estará disponível em um dia."
        )
      : (
          "Você pode adicionar, remover ou substituir um aplicativo."
        );
  }


  return (
    "O plano Ultra permite alterar seus aplicativos sem limite."
  );
}


/*
  Atualiza contador, progresso,
  mensagem e botão.
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
            `${quantidade} de ${cards.length}`
          )
        : (
            `${quantidade} de ${planoAtual.app_limit}`
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
  pode ser feita pela interface.
*/
function podeAplicarSelecaoTemporaria(
  novaSelecao
) {
  const limite =
    planoAtual?.app_limit;

  if (
    limite !== null &&
    limite !== undefined &&
    novaSelecao.length >
      Number(limite)
  ) {
    mostrarMensagem(
      `O plano ${planoAtual.name} permite até ${limite} aplicativos.`,
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
        "No plano Pro, você pode alterar apenas um aplicativo por dia.",
        true
      );

      return false;
    }
  }

  return true;
}


/*
  Seleciona ou desseleciona um card.
*/
function alternarAplicativo(card) {
  if (
    salvamentoEmAndamento ||
    !planoAtual
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
  Salva usando a RPC protegida.
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
        data?.next_change_at ||
        null;

    mostrarMensagem(
      planoAtual.id === "ultra"
        ? (
            "Aplicativos atualizados com sucesso."
          )
        : (
            "Aplicativos atualizados. " +
            obterMensagemPadrao()
          )
    );

    window.setTimeout(
      () => {
        window.location.assign(
          "conta.html"
        );
      },
      1200
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
  plano e seleção atual.
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
      resultadoApps
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
        )
    ]);


    if (
      resultadoAssinatura.error ||
      !resultadoAssinatura.data
    ) {
      throw (
        resultadoAssinatura.error ||
        new Error(
          "Assinatura não encontrada."
        )
      );
    }


    if (resultadoApps.error) {
      throw resultadoApps.error;
    }


    assinaturaAtual =
      resultadoAssinatura.data;


    if (
      ![
        "active",
        "trialing"
      ].includes(
        assinaturaAtual.status
      )
    ) {
      mostrarMensagem(
        "Sua assinatura não permite alterar aplicativos neste momento.",
        true
      );

      return;
    }


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
        "Plano não encontrado no banco:",
        resultadoPlano.error
      );
    }


    planoAtual =
      resultadoPlano.data ||
      PLANOS_PADRAO[
        assinaturaAtual.plan_id
      ] ||
      PLANOS_PADRAO.gratis;


    aplicativosOriginais =
      normalizarIds(
        (
          resultadoApps.data ||
          []
        ).map(
          (item) =>
            item.app_id
        )
      );


    aplicativosSelecionados =
      [...aplicativosOriginais];


    atualizarInterface();
  } catch (erro) {
    console.error(
      "Erro ao carregar seleção:",
      erro
    );

    mostrarMensagem(
      erro?.message ||
      "Não foi possível carregar seus aplicativos.",
      true
    );
  }
}


/*
  Eventos dos cards.
*/
cards.forEach((card) => {
  card.addEventListener(
    "click",
    () => {
      alternarAplicativo(card);
    }
  );

  card.addEventListener(
    "keydown",
    (evento) => {
      if (
        evento.key === "Enter" ||
        evento.key === " "
      ) {
        evento.preventDefault();

        alternarAplicativo(
          card
        );
      }
    }
  );
});


botaoSalvar?.addEventListener(
  "click",
  salvarAplicativos
);


supabase.auth.onAuthStateChange(
  (evento) => {
    if (
      evento === "SIGNED_OUT"
    ) {
      window.location.replace(
        "login.html"
      );
    }
  }
);


carregarPagina();
