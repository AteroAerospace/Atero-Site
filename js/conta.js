import { supabase } from "./supabase-client.js";


const painelConta =
  document.querySelector("#painel-conta");

const nomeUsuario =
  document.querySelector("#nome-usuario");

const avatarUsuario =
  document.querySelector("#avatar-usuario");

const emailUsuario =
  document.querySelector("#email-usuario");

const resumoPlano =
  document.querySelector("#resumo-plano");

const resumoLimitePlano =
  document.querySelector("#resumo-limite-plano");

const resumoAplicativos =
  document.querySelector("#resumo-aplicativos");

const resumoAplicativosDetalhe =
  document.querySelector(
    "#resumo-aplicativos-detalhe"
  );

const resumoStatusConta =
  document.querySelector(
    "#resumo-status-conta"
  );

const listaAplicativos =
  document.querySelector("#lista-aplicativos");

const nomePlano =
  document.querySelector("#nome-plano");

const descricaoPlano =
  document.querySelector("#descricao-plano");

const botaoSair =
  document.querySelector("#botao-sair");


/*
  Algumas consultas do Supabase podem retornar
  uma relação como objeto ou como array.

  Esta função garante que trabalharemos sempre
  com um objeto.
*/
function normalizarRelacao(relacao) {
  if (Array.isArray(relacao)) {
    return relacao[0] ?? null;
  }

  return relacao ?? null;
}


/*
  Retorna a primeira letra útil do nome.
*/
function obterInicial(nome) {
  const nomeLimpo =
    typeof nome === "string"
      ? nome.trim()
      : "";

  if (!nomeLimpo) {
    return "U";
  }

  return nomeLimpo
    .charAt(0)
    .toUpperCase();
}


/*
  Converte o estado interno da assinatura
  para uma informação amigável.
*/
function obterStatusAssinatura(status) {
  const statusDisponiveis = {
    active: {
      nome: "Ativa",
      permiteAcesso: true
    },

    trialing: {
      nome: "Período de teste",
      permiteAcesso: true
    },

    past_due: {
      nome: "Pagamento pendente",
      permiteAcesso: false
    },

    canceled: {
      nome: "Cancelada",
      permiteAcesso: false
    },

    incomplete: {
      nome: "Incompleta",
      permiteAcesso: false
    }
  };

  return (
    statusDisponiveis[status] ?? {
      nome: "Indisponível",
      permiteAcesso: false
    }
  );
}


/*
  Produz a descrição do limite do plano.
*/
function obterDescricaoLimite(limite) {
  if (limite === null || limite === undefined) {
    return "Todos os aplicativos";
  }

  if (limite === 1) {
    return "Até 1 aplicativo";
  }

  return `Até ${limite} aplicativos`;
}


/*
  Produz o texto principal da assinatura.
*/
function obterDescricaoPlano(nome, limite) {
  if (limite === null || limite === undefined) {
    return (
      `O Plano ${nome} oferece acesso a todos os ` +
      "aplicativos disponíveis no Ecossistema Atero."
    );
  }

  const palavra =
    limite === 1
      ? "aplicativo"
      : "aplicativos";

  return (
    `O Plano ${nome} permite escolher até ` +
    `${limite} ${palavra} do Ecossistema Atero.`
  );
}


/*
  Cria um card de aplicativo sem inserir
  HTML recebido do banco diretamente na página.
*/
function criarCardAplicativo(aplicativo) {
  const card =
    document.createElement("article");

  card.className = "painel-app";


  const imagem =
    document.createElement("img");

  imagem.src =
    aplicativo.icon_path ||
    "assets/logos/favicon.png";

  imagem.alt =
    `Ícone do ${aplicativo.name}`;

  imagem.loading = "lazy";


  const areaInformacoes =
    document.createElement("div");

  areaInformacoes.className =
    "painel-app-info";


  const titulo =
    document.createElement("h3");

  titulo.textContent =
    aplicativo.name ||
    "Aplicativo Atero";


  const descricao =
    document.createElement("p");

  descricao.textContent =
    aplicativo.description ||
    "Aplicativo do Ecossistema Atero.";


  const status =
    document.createElement("span");

  status.className =
    "painel-app-status";

  status.textContent = "Ativo";


  const botaoAbrir =
    document.createElement("a");

  botaoAbrir.className =
    "painel-app-botao";

  botaoAbrir.textContent = "Abrir";

  botaoAbrir.setAttribute(
    "aria-label",
    `Abrir ${aplicativo.name}`
  );


  if (aplicativo.launch_url) {
    botaoAbrir.href =
      aplicativo.launch_url;
  } else {
    botaoAbrir.href = "#";

    botaoAbrir.setAttribute(
      "aria-disabled",
      "true"
    );

    botaoAbrir.title =
      "Este aplicativo ainda não está disponível.";

    botaoAbrir.addEventListener(
      "click",
      evento => {
        evento.preventDefault();

        alert(
          "Este aplicativo ainda não está disponível."
        );
      }
    );
  }


  areaInformacoes.append(
    titulo,
    descricao,
    status
  );

  card.append(
    imagem,
    areaInformacoes,
    botaoAbrir
  );

  return card;
}


/*
  Mostra os aplicativos vinculados à conta.
*/
function renderizarAplicativos(
  linhasAplicativos
) {
  listaAplicativos.replaceChildren();

  const aplicativos =
    linhasAplicativos
      .map(linha =>
        normalizarRelacao(linha.app)
      )
      .filter(Boolean);


  if (aplicativos.length === 0) {
    const mensagem =
      document.createElement("p");

    mensagem.textContent =
      "Você ainda não selecionou nenhum aplicativo.";

    listaAplicativos.append(mensagem);

    return;
  }


  aplicativos.forEach(aplicativo => {
    const card =
      criarCardAplicativo(aplicativo);

    listaAplicativos.append(card);
  });
}


/*
  Atualiza os números e textos relacionados
  ao plano e aos aplicativos.
*/
function atualizarResumoPlano({
  plano,
  status,
  quantidadeAplicativos
}) {
  const nome =
    plano?.name || "Grátis";

  const limite =
    plano?.app_limit ?? null;

  const statusFormatado =
    obterStatusAssinatura(status);


  resumoPlano.textContent = nome;

  resumoLimitePlano.textContent =
    obterDescricaoLimite(limite);

  nomePlano.textContent =
    `Plano ${nome}`;

  descricaoPlano.textContent =
    obterDescricaoPlano(nome, limite);

  resumoStatusConta.textContent =
    statusFormatado.nome;


  if (limite === null) {
    resumoAplicativos.textContent =
      `${quantidadeAplicativos}`;

    resumoAplicativosDetalhe.textContent =
      quantidadeAplicativos === 1
        ? "1 aplicativo ativo"
        : `${quantidadeAplicativos} aplicativos ativos`;

    return;
  }


  resumoAplicativos.textContent =
    `${quantidadeAplicativos} de ${limite}`;

  const restantes =
    Math.max(
      limite - quantidadeAplicativos,
      0
    );


  if (quantidadeAplicativos >= limite) {
    resumoAplicativosDetalhe.textContent =
      "Limite do plano atingido";

    return;
  }


  if (restantes === 1) {
    resumoAplicativosDetalhe.textContent =
      "Você ainda pode escolher 1 aplicativo";

    return;
  }


  resumoAplicativosDetalhe.textContent =
    `Você ainda pode escolher ${restantes} aplicativos`;
}


/*
  Redireciona o usuário para o login.
*/
function redirecionarParaLogin() {
  const destino =
    encodeURIComponent("conta.html");

  window.location.replace(
    `login.html?next=${destino}`
  );
}


/*
  Obtém o usuário autenticado diretamente
  do servidor do Supabase.
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
  Busca as informações necessárias para
  preencher o painel.
*/
async function carregarDadosConta(usuario) {
  const [
    resultadoPerfil,
    resultadoAssinatura,
    resultadoAplicativos
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("display_name")
      .eq("id", usuario.id)
      .single(),

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
      .eq("user_id", usuario.id)
      .single(),

    supabase
      .from("user_apps")
      .select(`
        app_id,
        app:apps (
          id,
          name,
          description,
          icon_path,
          launch_url,
          sort_order
        )
      `)
      .eq("user_id", usuario.id)
  ]);


  if (resultadoPerfil.error) {
    throw new Error(
      "Não foi possível carregar o perfil."
    );
  }


  if (resultadoAssinatura.error) {
    throw new Error(
      "Não foi possível carregar a assinatura."
    );
  }


  if (resultadoAplicativos.error) {
    throw new Error(
      "Não foi possível carregar os aplicativos."
    );
  }


  return {
    perfil:
      resultadoPerfil.data,

    assinatura:
      resultadoAssinatura.data,

    aplicativos:
      resultadoAplicativos.data ?? []
  };
}


/*
  Preenche visualmente a página.
*/
function preencherConta(
  usuario,
  dados
) {
  const nome =
    dados.perfil?.display_name?.trim() ||
    usuario.email?.split("@")[0] ||
    "Usuário";

  const assinatura =
    dados.assinatura;

  const plano =
    normalizarRelacao(
      assinatura.plan
    );


  nomeUsuario.textContent = nome;

  avatarUsuario.textContent =
    obterInicial(nome);

  emailUsuario.textContent =
    usuario.email || "E-mail indisponível";


  const aplicativosOrdenados =
    [...dados.aplicativos].sort(
      (primeiro, segundo) => {
        const primeiroApp =
          normalizarRelacao(
            primeiro.app
          );

        const segundoApp =
          normalizarRelacao(
            segundo.app
          );

        return (
          (primeiroApp?.sort_order ?? 0) -
          (segundoApp?.sort_order ?? 0)
        );
      }
    );


  atualizarResumoPlano({
    plano,
    status: assinatura.status,
    quantidadeAplicativos:
      aplicativosOrdenados.length
  });


  renderizarAplicativos(
    aplicativosOrdenados
  );


  painelConta.setAttribute(
    "aria-busy",
    "false"
  );
}


/*
  Exibe um estado simples de erro no painel.
*/
function mostrarErro(mensagem) {
  painelConta.setAttribute(
    "aria-busy",
    "false"
  );

  resumoPlano.textContent =
    "Indisponível";

  resumoLimitePlano.textContent =
    "Não foi possível carregar o plano";

  resumoAplicativos.textContent =
    "—";

  resumoAplicativosDetalhe.textContent =
    "Não foi possível carregar os aplicativos";

  resumoStatusConta.textContent =
    "Erro";

  nomePlano.textContent =
    "Plano indisponível";

  descricaoPlano.textContent =
    mensagem;

  listaAplicativos.replaceChildren();

  const textoErro =
    document.createElement("p");

  textoErro.textContent = mensagem;

  listaAplicativos.append(textoErro);
}


/*
  Encerra a sessão.
*/
async function sairDaConta() {
  botaoSair.disabled = true;
  botaoSair.textContent = "Saindo...";

  const { error } =
    await supabase.auth.signOut();

  if (error) {
    console.error(
      "Erro ao sair:",
      error
    );

    alert(
      "Não foi possível sair da conta. Tente novamente."
    );

    botaoSair.disabled = false;
    botaoSair.textContent = "Sair";

    return;
  }

  window.location.replace(
    "login.html"
  );
}


/*
  Inicialização do painel.
*/
async function iniciarPaginaConta() {
  try {
    const usuario =
      await obterUsuarioAtual();

    if (!usuario) {
      redirecionarParaLogin();
      return;
    }

    const dados =
      await carregarDadosConta(
        usuario
      );

    preencherConta(
      usuario,
      dados
    );
  } catch (erro) {
    console.error(
      "Erro ao carregar a conta:",
      erro
    );

    mostrarErro(
      erro.message ||
      "Não foi possível carregar sua conta."
    );
  }
}


botaoSair.addEventListener(
  "click",
  sairDaConta
);


/*
  Se a sessão for encerrada em outra aba,
  esta página também volta ao login.
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


iniciarPaginaConta();
