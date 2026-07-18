import {
  supabase,
  sairDaContaAtero
} from "./supabase-client.js?v=18";

import {
  configurarBotoesCheckout,
  mostrarAvisoCheckout
} from "./checkout.js?v=18";

import {
  abrirPortalAssinatura
} from "./portal.js?v=18";


const tituloUsuario =
  document.querySelector(
    ".painel-cabecalho h1"
  );

const avatarUsuario =
  document.querySelector(
    ".painel-avatar"
  );


const resumoPlanoValor =
  document.querySelector(
    ".painel-resumo .resumo-item:nth-child(1) .resumo-valor"
  );

const resumoPlanoDetalhe =
  document.querySelector(
    ".painel-resumo .resumo-item:nth-child(1) .resumo-detalhe"
  );

const resumoAppsValor =
  document.querySelector(
    ".painel-resumo .resumo-item:nth-child(2) .resumo-valor"
  );

const resumoAppsDetalhe =
  document.querySelector(
    ".painel-resumo .resumo-item:nth-child(2) .resumo-detalhe"
  );

const resumoContaValor =
  document.querySelector(
    ".painel-resumo .resumo-item:nth-child(3) .resumo-valor"
  );

const resumoContaDetalhe =
  document.querySelector(
    ".painel-resumo .resumo-item:nth-child(3) .resumo-detalhe"
  );


const listaAplicativos =
  document.querySelector(
    ".painel-apps"
  );

const nomePlano =
  document.querySelector(
    ".painel-plano-nome"
  );

const descricaoPlano =
  document.querySelector(
    ".painel-plano > div:first-child p"
  );

const acoesPlano =
  document.querySelector(
    "#acoes-plano, .painel-plano-acoes"
  );

const botaoSair =
  document.querySelector(
    "#botao-sair, .painel-sair"
  );


let usuarioAtual = null;

let carregamentoContaEmAndamento =
  false;


const PLANOS_PADRAO = {
  gratis: {
    id: "gratis",
    name: "Grátis",
    app_limit: 2,
    price_cents: 0
  },

  pro: {
    id: "pro",
    name: "Pro",
    app_limit: 4,
    price_cents: 399
  },

  ultra: {
    id: "ultra",
    name: "Ultra",
    app_limit: null,
    price_cents: 699
  }
};


/*
  URLs oficiais usadas quando o cadastro
  do aplicativo ainda não possui launch_url.
*/
const URLS_APLICATIVOS = {
  calc: "https://calc.atero.space/",
  write: "https://write.atero.space/"
};


/*
  Retorna a URL de abertura do aplicativo.
*/
function obterUrlAplicativo(aplicativo) {
  const urlCadastrada =
    String(
      aplicativo?.launch_url || ""
    ).trim();

  if (urlCadastrada) {
    return urlCadastrada;
  }

  const appId =
    String(
      aplicativo?.id || ""
    )
      .trim()
      .toLowerCase();

  return URLS_APLICATIVOS[appId] || "";
}


/*
  Cria um botão de ação do plano.
*/
function criarBotaoPlano({
  id,
  texto,
  checkoutPlan = null
}) {
  const botao =
    document.createElement(
      "button"
    );

  botao.id = id;

  botao.className =
    "painel-botao-principal";

  botao.type = "button";
  botao.textContent = texto;
  botao.hidden = true;


  if (checkoutPlan) {
    botao.dataset.checkoutPlan =
      checkoutPlan;
  }


  return botao;
}


/*
  Garante que os controles de pagamento
  existam, mesmo que ainda não tenham sido
  colocados manualmente no conta.html.
*/
function garantirControlesPlano() {
  if (!acoesPlano) {
    return {
      botaoAssinarPro: null,
      botaoAssinarUltra: null,
      botaoGerenciarAssinatura: null,
      mensagemPlanoPago: null
    };
  }


  const linkAntigoAlterarPlano =
    acoesPlano.querySelector(
      'a.painel-botao-principal[href*="#planos"]'
    );


  if (linkAntigoAlterarPlano) {
    linkAntigoAlterarPlano.hidden =
      true;
  }


  let botaoAssinarPro =
    document.querySelector(
      "#botao-assinar-pro"
    );


  if (!botaoAssinarPro) {
    botaoAssinarPro =
      criarBotaoPlano({
        id: "botao-assinar-pro",
        texto: "Assinar Pro",
        checkoutPlan: "pro"
      });


    acoesPlano.prepend(
      botaoAssinarPro
    );
  }


  let botaoAssinarUltra =
    document.querySelector(
      "#botao-assinar-ultra"
    );


  if (!botaoAssinarUltra) {
    botaoAssinarUltra =
      criarBotaoPlano({
        id: "botao-assinar-ultra",
        texto: "Assinar Ultra",
        checkoutPlan: "ultra"
      });


    botaoAssinarPro
      .insertAdjacentElement(
        "afterend",
        botaoAssinarUltra
      );
  }


  let botaoGerenciarAssinatura =
    document.querySelector(
      "#botao-gerenciar-assinatura"
    );


  if (!botaoGerenciarAssinatura) {
    botaoGerenciarAssinatura =
      criarBotaoPlano({
        id:
          "botao-gerenciar-assinatura",

        texto:
          "Gerenciar assinatura"
      });


    botaoAssinarUltra
      .insertAdjacentElement(
        "afterend",
        botaoGerenciarAssinatura
      );
  }


  let mensagemPlanoPago =
    document.querySelector(
      "#mensagem-plano-pago"
    );


  if (!mensagemPlanoPago) {
    mensagemPlanoPago =
      document.createElement(
        "span"
      );

    mensagemPlanoPago.id =
      "mensagem-plano-pago";

    mensagemPlanoPago.className =
      "painel-plano-status";

    mensagemPlanoPago.hidden =
      true;


    botaoGerenciarAssinatura
      .insertAdjacentElement(
        "afterend",
        mensagemPlanoPago
      );
  }


  return {
    botaoAssinarPro,
    botaoAssinarUltra,
    botaoGerenciarAssinatura,
    mensagemPlanoPago
  };
}


const {
  botaoAssinarPro,
  botaoAssinarUltra,
  botaoGerenciarAssinatura,
  mensagemPlanoPago
} = garantirControlesPlano();


/*
  Algumas relações do Supabase podem
  chegar como objeto ou como array.
*/
function normalizarRelacao(valor) {
  if (Array.isArray(valor)) {
    return valor[0] || null;
  }

  return valor || null;
}


/*
  Retorna somente o primeiro nome.
*/
function obterPrimeiroNome(
  nomeCompleto
) {
  const nome =
    String(nomeCompleto || "")
      .trim();


  if (!nome) {
    return "Usuário";
  }


  return nome.split(/\s+/)[0];
}


/*
  Retorna a inicial usada no avatar.
*/
function obterInicial(
  nomeCompleto,
  email
) {
  const base =
    String(
      nomeCompleto ||
      email ||
      "U"
    )
      .trim()
      .charAt(0)
      .toUpperCase();


  return base || "U";
}


/*
  Converte o valor armazenado em centavos
  para reais.
*/
function formatarPrecoPlano(plano) {
  const centavos =
    Number(
      plano?.price_cents || 0
    );


  if (centavos <= 0) {
    return "Grátis";
  }


  return new Intl.NumberFormat(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL"
    }
  ).format(
    centavos / 100
  );
}


/*
  Retorna o limite de aplicativos
  em formato legível.
*/
function obterDescricaoLimite(
  limite
) {
  if (
    limite === null ||
    limite === undefined
  ) {
    return "Todos os aplicativos";
  }


  const numero = Number(limite);


  if (numero === 1) {
    return "Até 1 aplicativo";
  }


  return `Até ${numero} aplicativos`;
}


/*
  Traduz o status da assinatura.
*/
function obterStatusAssinatura(
  status
) {
  const estados = {
    active: "Ativa",
    trialing: "Período de teste",
    past_due: "Pagamento pendente",
    incomplete:
      "Pagamento incompleto",
    incomplete_expired:
      "Pagamento expirado",
    paused: "Pausada",
    canceled: "Cancelada",
    unpaid: "Não paga"
  };


  return estados[status] || "Ativa";
}


/*
  Monta a descrição do plano atual.
*/
function obterDescricaoPlano(
  plano,
  assinatura
) {
  const limite =
    obterDescricaoLimite(
      plano?.app_limit
    );


  if (
    assinatura?.cancel_at_period_end
  ) {
    return (
      `${limite}. ` +
      "A assinatura será encerrada ao fim do período atual."
    );
  }


  if (
    assinatura?.status ===
    "past_due"
  ) {
    return (
      `${limite}. ` +
      "Existe um pagamento pendente na assinatura."
    );
  }


  if (
    assinatura?.status ===
    "trialing"
  ) {
    return (
      `${limite}. ` +
      "Seu período de teste está ativo."
    );
  }


  if (plano?.id === "ultra") {
    return (
      "Acesso a todos os aplicativos " +
      "e recursos premium do Ecossistema Atero."
    );
  }


  if (plano?.id === "pro") {
    return (
      "Você pode escolher até quatro aplicativos " +
      "e usar os recursos completos do Ecossistema Atero."
    );
  }


  return (
    "Você pode escolher até dois aplicativos " +
    "do Ecossistema Atero."
  );
}


/*
  Cria o card de um aplicativo.
*/
function criarCardAplicativo(
  aplicativo
) {
  const artigo =
    document.createElement(
      "article"
    );

  artigo.className =
    "painel-app";


  const imagem =
    document.createElement(
      "img"
    );

  imagem.src =
    aplicativo.icon_path ||
    "assets/logos/favicon.png";

  imagem.alt =
    `Ícone do ${
      aplicativo.name ||
      "aplicativo"
    }`;

  imagem.loading = "lazy";


  const informacoes =
    document.createElement(
      "div"
    );

  informacoes.className =
    "painel-app-info";


  const titulo =
    document.createElement(
      "h3"
    );

  titulo.textContent =
    aplicativo.name ||
    "Aplicativo Atero";


  const descricao =
    document.createElement(
      "p"
    );

  descricao.textContent =
    aplicativo.description ||
    "Aplicativo conectado ao Ecossistema Atero.";


  const status =
    document.createElement(
      "span"
    );

  status.className =
    "painel-app-status";

  status.textContent =
    aplicativo.active === false
      ? "Indisponível"
      : "Ativo";


  informacoes.append(
    titulo,
    descricao,
    status
  );


  const link =
    document.createElement(
      "a"
    );

  link.className =
    "painel-app-botao";

  link.textContent =
    aplicativo.active === false
      ? "Indisponível"
      : "Abrir";

  link.setAttribute(
    "aria-label",
    `Abrir ${
      aplicativo.name ||
      "aplicativo"
    }`
  );


  const urlAplicativo =
    obterUrlAplicativo(
      aplicativo
    );


  if (
    aplicativo.active === false ||
    !urlAplicativo
  ) {
    link.href = "#";

    link.setAttribute(
      "aria-disabled",
      "true"
    );


    link.addEventListener(
      "click",
      (evento) => {
        evento.preventDefault();
      }
    );
  } else {
    link.href =
      urlAplicativo;
  }


  artigo.append(
    imagem,
    informacoes,
    link
  );


  return artigo;
}


/*
  Exibe os aplicativos selecionados
  pelo usuário.
*/
function renderizarAplicativos(
  aplicativos
) {
  if (!listaAplicativos) {
    return;
  }


  listaAplicativos
    .replaceChildren();


  if (!aplicativos.length) {
    const vazio =
      document.createElement(
        "div"
      );

    vazio.className =
      "painel-vazio";


    const titulo =
      document.createElement(
        "h3"
      );

    titulo.textContent =
      "Nenhum aplicativo selecionado";


    const texto =
      document.createElement(
        "p"
      );

    texto.textContent =
      "Escolha seus aplicativos para começar a usar o Ecossistema Atero.";


    const link =
      document.createElement(
        "a"
      );

    link.className =
      "painel-botao-principal";

    link.href =
      "selecionar-apps.html";

    link.textContent =
      "Escolher aplicativos";


    vazio.append(
      titulo,
      texto,
      link
    );

    listaAplicativos.append(
      vazio
    );


    return;
  }


  const fragmento =
    document
      .createDocumentFragment();


  aplicativos.forEach(
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
  Atualiza os cards de resumo da conta
  e a seção do plano.
*/
function atualizarResumoPlano(
  plano,
  assinatura,
  quantidadeApps
) {
  const nome =
    plano?.name ||
    "Grátis";

  const limite =
    plano?.app_limit;

  const preco =
    formatarPrecoPlano(
      plano
    );


  if (resumoPlanoValor) {
    resumoPlanoValor.textContent =
      nome;
  }


  if (resumoPlanoDetalhe) {
    resumoPlanoDetalhe.textContent =
      preco === "Grátis"
        ? obterDescricaoLimite(
            limite
          )
        : (
            `${preco}/mês · ` +
            obterDescricaoLimite(
              limite
            )
          );
  }


  if (resumoAppsValor) {
    resumoAppsValor.textContent =
      limite === null ||
      limite === undefined
        ? String(
            quantidadeApps
          )
        : (
            `${quantidadeApps} ` +
            `de ${limite}`
          );
  }


  if (resumoAppsDetalhe) {
    if (
      limite === null ||
      limite === undefined
    ) {
      resumoAppsDetalhe.textContent =
        "Sem limite de aplicativos";
    } else if (
      quantidadeApps >=
      Number(limite)
    ) {
      resumoAppsDetalhe.textContent =
        "Limite do plano atingido";
    } else {
      const restantes =
        Math.max(
          Number(limite) -
          quantidadeApps,
          0
        );


      resumoAppsDetalhe.textContent =
        restantes === 1
          ? (
              "Você ainda pode escolher " +
              "1 aplicativo"
            )
          : (
              "Você ainda pode escolher " +
              `${restantes} aplicativos`
            );
    }
  }


  if (nomePlano) {
    nomePlano.textContent =
      `Plano ${nome}`;
  }


  if (descricaoPlano) {
    descricaoPlano.textContent =
      obterDescricaoPlano(
        plano,
        assinatura
      );
  }
}


/*
  Oculta todas as ações de pagamento
  antes de escolher quais serão exibidas.
*/
function esconderAcoesPagamento() {
  if (botaoAssinarPro) {
    botaoAssinarPro.hidden =
      true;
  }


  if (botaoAssinarUltra) {
    botaoAssinarUltra.hidden =
      true;
  }


  if (
    botaoGerenciarAssinatura
  ) {
    botaoGerenciarAssinatura.hidden =
      true;
  }


  if (mensagemPlanoPago) {
    mensagemPlanoPago.hidden =
      true;

    mensagemPlanoPago.textContent =
      "";
  }
}


/*
  Define quais botões serão mostrados.

  Plano grátis:
  - Assinar Pro
  - Assinar Ultra

  Plano pago:
  - Gerenciar assinatura
*/
function atualizarAcoesPagamento(
  assinatura
) {
  esconderAcoesPagamento();


  const planoId =
    String(
      assinatura?.plan_id ||
      "gratis"
    ).toLowerCase();


  const status =
    String(
      assinatura?.status ||
      "active"
    ).toLowerCase();


  const possuiClienteStripe =
    Boolean(
      assinatura
        ?.stripe_customer_id
    );


  const assinaturaPaga =
    planoId === "pro" ||
    planoId === "ultra";


  const statusGerenciavel = [
    "active",
    "trialing",
    "past_due",
    "incomplete",
    "paused",
    "unpaid"
  ].includes(status);


  /*
    Usuário grátis pode iniciar
    uma assinatura nova.
  */
  if (!assinaturaPaga) {
    if (botaoAssinarPro) {
      botaoAssinarPro.hidden =
        false;
    }


    if (botaoAssinarUltra) {
      botaoAssinarUltra.hidden =
        false;
    }


    return;
  }


  /*
    Usuário pago usa o portal da Stripe
    para trocar de plano ou cancelar.
  */
  if (
    possuiClienteStripe &&
    statusGerenciavel
  ) {
    if (
      botaoGerenciarAssinatura
    ) {
      botaoGerenciarAssinatura.hidden =
        false;
    }


    if (mensagemPlanoPago) {
      mensagemPlanoPago.hidden =
        false;


      mensagemPlanoPago.textContent =
        assinatura
          ?.cancel_at_period_end
          ? (
              "Cancelamento agendado. " +
              "Você ainda pode gerenciar a assinatura."
            )
          : (
              "Troque de plano, atualize o cartão " +
              "ou cancele pelo gerenciamento da assinatura."
            );
    }


    return;
  }


  if (mensagemPlanoPago) {
    mensagemPlanoPago.hidden =
      false;

    mensagemPlanoPago.textContent =
      "A assinatura está sendo atualizada. " +
      "Recarregue a página em alguns instantes.";
  }
}


/*
  Preenche visualmente a página.
*/
function preencherConta({
  usuario,
  perfil,
  assinatura,
  plano,
  aplicativos
}) {
  const nomeCompleto =
    perfil?.display_name ||
    usuario.user_metadata
      ?.display_name ||
    usuario.email ||
    "Usuário";


  const primeiroNome =
    obterPrimeiroNome(
      nomeCompleto
    );


  if (tituloUsuario) {
    const ponto =
      document.createElement(
        "span"
      );

    ponto.textContent = ".";


    tituloUsuario.replaceChildren(
      document.createTextNode(
        `Olá, ${primeiroNome}`
      ),

      ponto
    );
  }


  if (avatarUsuario) {
    avatarUsuario.textContent =
      obterInicial(
        nomeCompleto,
        usuario.email
      );
  }


  if (resumoContaValor) {
    resumoContaValor.textContent =
      obterStatusAssinatura(
        assinatura?.status ||
        "active"
      );
  }


  if (resumoContaDetalhe) {
    resumoContaDetalhe.textContent =
      usuario.email ||
      "Conta Atero";
  }


  renderizarAplicativos(
    aplicativos
  );


  atualizarResumoPlano(
    plano,
    assinatura,
    aplicativos.length
  );


  atualizarAcoesPagamento(
    assinatura
  );
}


/*
  Busca o usuário atual validando a sessão
  no Supabase.
*/
async function obterUsuarioAtual() {
  const {
    data,
    error
  } = await supabase.auth
    .getUser();


  if (error) {
    console.error(
      "Erro ao verificar usuário:",
      error
    );

    return null;
  }


  return data.user || null;
}


/*
  Busca perfil, assinatura, plano
  e aplicativos do usuário.
*/
async function carregarDadosConta(
  usuario
) {
  const [
    resultadoPerfil,
    resultadoAssinatura,
    resultadoApps
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "display_name"
      )
      .eq(
        "id",
        usuario.id
      )
      .maybeSingle(),

    supabase
      .from("subscriptions")
      .select(`
        plan_id,
        status,
        stripe_customer_id,
        stripe_subscription_id,
        current_period_end,
        cancel_at_period_end
      `)
      .eq(
        "user_id",
        usuario.id
      )
      .maybeSingle(),

    supabase
      .from("user_apps")
      .select(`
        app_id,
        apps (
          id,
          name,
          description,
          icon_path,
          launch_url,
          sort_order,
          active
        )
      `)
      .eq(
        "user_id",
        usuario.id
      )
  ]);


  if (resultadoPerfil.error) {
    console.warn(
      "Não foi possível carregar o perfil:",
      resultadoPerfil.error
    );
  }


  if (
    resultadoAssinatura.error
  ) {
    throw resultadoAssinatura.error;
  }


  if (resultadoApps.error) {
    throw resultadoApps.error;
  }


  const assinatura =
    resultadoAssinatura.data ||
    {
      plan_id: "gratis",
      status: "active",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      current_period_end: null,
      cancel_at_period_end: false
    };


  const planoId =
    String(
      assinatura.plan_id ||
      "gratis"
    ).toLowerCase();


  const resultadoPlano =
    await supabase
      .from("plans")
      .select(
        "id, name, app_limit, price_cents"
      )
      .eq(
        "id",
        planoId
      )
      .maybeSingle();


  if (resultadoPlano.error) {
    console.warn(
      "Não foi possível carregar o plano:",
      resultadoPlano.error
    );
  }


  const plano =
    resultadoPlano.data ||
    PLANOS_PADRAO[planoId] ||
    PLANOS_PADRAO.gratis;


  const aplicativos =
    (
      resultadoApps.data ||
      []
    )
      .map(
        (item) =>
          normalizarRelacao(
            item.apps
          )
      )
      .filter(Boolean)
      .sort(
        (a, b) => {
          const ordemA =
            Number(
              a.sort_order ||
              0
            );

          const ordemB =
            Number(
              b.sort_order ||
              0
            );


          if (
            ordemA !== ordemB
          ) {
            return (
              ordemA -
              ordemB
            );
          }


          return String(
            a.name || ""
          ).localeCompare(
            String(
              b.name || ""
            ),

            "pt-BR"
          );
        }
      );


  return {
    usuario,
    perfil:
      resultadoPerfil.data,
    assinatura,
    plano,
    aplicativos
  };
}


/*
  Exibe erros de carregamento.
*/
function mostrarErro(
  mensagem
) {
  console.error(mensagem);


  mostrarAvisoCheckout(
    typeof mensagem === "string"
      ? mensagem
      : (
          "Não foi possível " +
          "carregar sua conta."
        ),

    "erro"
  );


  if (listaAplicativos) {
    listaAplicativos
      .replaceChildren();


    const erro =
      document.createElement(
        "p"
      );

    erro.className =
      "painel-erro";

    erro.textContent =
      "Não foi possível carregar seus aplicativos. " +
      "Recarregue a página.";


    listaAplicativos.append(
      erro
    );
  }
}


/*
  Espera o webhook da Stripe atualizar
  o banco após o pagamento.
*/
function esperar(
  milissegundos
) {
  return new Promise(
    (resolver) => {
      window.setTimeout(
        resolver,
        milissegundos
      );
    }
  );
}


/*
  Remove os parâmetros de checkout
  do endereço sem recarregar a página.
*/
function limparParametrosCheckout() {
  const url =
    new URL(
      window.location.href
    );


  url.searchParams.delete(
    "checkout"
  );

  url.searchParams.delete(
    "session_id"
  );


  window.history.replaceState(
    {},
    document.title,
    (
      `${url.pathname}` +
      `${url.search}` +
      `${url.hash}`
    )
  );
}


/*
  Processa o retorno do Stripe Checkout.
*/
async function tratarRetornoCheckout() {
  const parametros =
    new URLSearchParams(
      window.location.search
    );


  const estadoCheckout =
    parametros.get(
      "checkout"
    );


  if (
    estadoCheckout ===
      "cancelado" ||
    estadoCheckout ===
      "canceled"
  ) {
    mostrarAvisoCheckout(
      "Pagamento cancelado. Nenhuma cobrança foi feita."
    );


    limparParametrosCheckout();

    return;
  }


  if (
    estadoCheckout !==
      "sucesso" &&
    estadoCheckout !==
      "success"
  ) {
    return;
  }


  mostrarAvisoCheckout(
    "Pagamento aprovado. Atualizando seu plano...",
    "sucesso"
  );


  for (
    let tentativa = 0;
    tentativa < 8;
    tentativa += 1
  ) {
    if (!usuarioAtual) {
      break;
    }


    try {
      const dados =
        await carregarDadosConta(
          usuarioAtual
        );


      preencherConta(
        dados
      );


      if (
        dados.assinatura
          .plan_id !== "gratis"
      ) {
        mostrarAvisoCheckout(
          (
            `Seu plano ` +
            `${dados.plano.name} ` +
            "está ativo."
          ),

          "sucesso"
        );


        limparParametrosCheckout();

        return;
      }
    } catch (erro) {
      console.warn(
        "Aguardando atualização do webhook:",
        erro
      );
    }


    await esperar(1250);
  }


  mostrarAvisoCheckout(
    (
      "O pagamento foi recebido, mas o plano " +
      "ainda está sendo atualizado. Recarregue " +
      "a página em alguns instantes."
    )
  );


  limparParametrosCheckout();
}


/*
  Encerra a sessão do usuário.
*/
async function sairDaConta(
  evento
) {
  evento?.preventDefault();


  if (botaoSair) {
    botaoSair.setAttribute(
      "aria-busy",
      "true"
    );
  }


  try {
    await sairDaContaAtero();

    window.location.replace(
      "login.html"
    );
  } catch (erro) {
    console.error(
      "Erro ao sair:",
      erro
    );


    mostrarAvisoCheckout(
      "Não foi possível sair da conta.",
      "erro"
    );


    if (botaoSair) {
      botaoSair.removeAttribute(
        "aria-busy"
      );
    }
  }
}


/*
  Inicia a página.
*/
async function iniciarPaginaConta() {
  if (
    carregamentoContaEmAndamento
  ) {
    return;
  }


  carregamentoContaEmAndamento =
    true;


  try {
    usuarioAtual =
      await obterUsuarioAtual();


    if (!usuarioAtual) {
      const destino =
        encodeURIComponent(
          "conta.html"
        );


      window.location.replace(
        `login.html?next=${destino}`
      );

      return;
    }


    const dados =
      await carregarDadosConta(
        usuarioAtual
      );


    preencherConta(
      dados
    );


    await tratarRetornoCheckout();
  } catch (erro) {
    console.error(
      "Erro ao iniciar a página da conta:",
      erro
    );


    mostrarErro(
      "Não foi possível carregar sua conta."
    );
  } finally {
    carregamentoContaEmAndamento =
      false;
  }
}


/*
  Configura o botão do Stripe
  Customer Portal.
*/
if (
  botaoGerenciarAssinatura &&
  botaoGerenciarAssinatura
    .dataset
    .portalConfigurado !==
    "true"
) {
  botaoGerenciarAssinatura
    .dataset
    .portalConfigurado =
      "true";


  botaoGerenciarAssinatura
    .addEventListener(
      "click",
      () => {
        abrirPortalAssinatura(
          botaoGerenciarAssinatura
        );
      }
    );
}


/*
  Configura o botão de sair.
*/
botaoSair?.addEventListener(
  "click",
  sairDaConta
);


/*
  Configura os botões Pro e Ultra
  criados nesta página.
*/
configurarBotoesCheckout(
  document
);


/*
  Observa mudanças na autenticação.
*/
supabase.auth.onAuthStateChange(
  (evento, sessao) => {
    window.setTimeout(
      () => {
        if (
          evento ===
          "SIGNED_OUT"
        ) {
          window.location.replace(
            "login.html"
          );

          return;
        }


        if (
          evento ===
            "SIGNED_IN" &&
          sessao?.user
        ) {
          usuarioAtual =
            sessao.user;
        }
      },

      0
    );
  }
);


/*
  Executa a página.
*/
iniciarPaginaConta();
