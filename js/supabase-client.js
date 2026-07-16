import { createClient } from
  "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";


const SUPABASE_URL =
  "https://iahpxnxrapqptzkolckk.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_qUB77LmwZZauQK97p8ZiLw_cP6TS_Jn";

const ATERO_API_URL =
  "https://api.atero.space";

const URL_PADRAO_APOS_LOGIN =
  new URL(
    "conta.html",
    window.location.origin + "/"
  ).href;


/*
  Somente estes domínios podem ser usados como
  retorno depois do login ou da ponte de sessão.

  Isso impede redirecionamentos para sites externos
  por parâmetros manipulados na URL.
*/
const ORIGENS_DE_RETORNO_PERMITIDAS =
  new Set([
    "https://atero.space",
    "https://www.atero.space",
    "https://write.atero.space",
    "https://calc.atero.space",
    "https://study.atero.space",
    "https://workspace.atero.space",
    "https://dev.atero.space",
    "https://files.atero.space",

    "http://localhost:5500",
    "http://127.0.0.1:5500"
  ]);


export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);


let tokenSincronizado = null;
let resultadoSincronizado = null;

let sincronizacaoEmAndamento = null;
let tokenEmSincronizacao = null;

let limpezaEmAndamento = null;


/*
  Tenta ler JSON sem transformar uma resposta
  sem corpo em outro erro.
*/
async function lerJsonSeguro(resposta) {
  try {
    return await resposta.json();
  } catch {
    return null;
  }
}


/*
  Extrai a mensagem padronizada retornada pela
  FastAPI, mas mantém uma mensagem de reserva.
*/
function obterMensagemDaApi(
  dados,
  mensagemPadrao
) {
  return (
    dados?.detail?.message ||
    dados?.message ||
    mensagemPadrao
  );
}


/*
  Valida um destino antes de redirecionar.

  Aceita:
  - URLs absolutas dos subdomínios permitidos;
  - caminhos relativos do próprio atero.space.
*/
export function obterUrlRetornoSegura(
  valor,
  fallback = URL_PADRAO_APOS_LOGIN
) {
  const destinoPadrao =
    new URL(
      fallback,
      window.location.origin + "/"
    );

  if (!valor) {
    return destinoPadrao.href;
  }

  try {
    const destino =
      new URL(
        valor,
        window.location.origin + "/"
      );

    if (
      !ORIGENS_DE_RETORNO_PERMITIDAS
        .has(destino.origin)
    ) {
      return destinoPadrao.href;
    }

    return destino.href;
  } catch {
    return destinoPadrao.href;
  }
}


/*
  Lê tanto o parâmetro novo "return_to"
  quanto o antigo "next".

  Assim os links existentes continuam funcionando.
*/
export function obterRetornoDosParametros(
  fallback = URL_PADRAO_APOS_LOGIN
) {
  const parametros =
    new URLSearchParams(
      window.location.search
    );

  const destino =
    parametros.get("return_to") ||
    parametros.get("next");

  return obterUrlRetornoSegura(
    destino,
    fallback
  );
}


/*
  Cria a URL central de login preservando o
  destino original de forma segura.
*/
export function criarUrlLogin(
  returnTo = window.location.href
) {
  const loginUrl =
    new URL(
      "login.html",
      window.location.origin + "/"
    );

  loginUrl.searchParams.set(
    "return_to",
    obterUrlRetornoSegura(
      returnTo,
      URL_PADRAO_APOS_LOGIN
    )
  );

  return loginUrl.href;
}


/*
  Entrega somente o access token atual à API.

  A API valida o token no Supabase e o armazena
  em um cookie HttpOnly pertencente exclusivamente
  a api.atero.space.

  O refresh token nunca é enviado para a API.
*/
export async function sincronizarSessaoApi(
  accessToken,
  {
    forcar = false
  } = {}
) {
  const token =
    String(accessToken || "").trim();

  if (!token) {
    throw new Error(
      "O Supabase não retornou um access token válido."
    );
  }

  if (
    !forcar &&
    token === tokenSincronizado &&
    resultadoSincronizado
  ) {
    return resultadoSincronizado;
  }

  if (sincronizacaoEmAndamento) {
    if (token === tokenEmSincronizacao) {
      return sincronizacaoEmAndamento;
    }

    try {
      await sincronizacaoEmAndamento;
    } catch {
      /*
        A nova tentativa usa outro token e deve
        prosseguir mesmo se a anterior falhou.
      */
    }
  }

  tokenEmSincronizacao = token;

  sincronizacaoEmAndamento =
    (async () => {
      const resposta =
        await fetch(
          `${ATERO_API_URL}/auth/session`,
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",

            headers: {
              "Accept": "application/json",
              "Content-Type":
                "application/json",
              "X-Atero-Request": "1"
            },

            body: JSON.stringify({
              access_token: token
            })
          }
        );

      const dados =
        await lerJsonSeguro(resposta);

      if (!resposta.ok) {
        const erro =
          new Error(
            obterMensagemDaApi(
              dados,
              "Não foi possível sincronizar a sessão com a Atero API."
            )
          );

        erro.status = resposta.status;
        erro.code =
          dados?.detail?.code ||
          dados?.code ||
          "api_session_error";

        throw erro;
      }

      tokenSincronizado = token;
      resultadoSincronizado = dados;

      return dados;
    })();

  try {
    return await sincronizacaoEmAndamento;
  } finally {
    sincronizacaoEmAndamento = null;
    tokenEmSincronizacao = null;
  }
}


/*
  Obtém a sessão persistida do Supabase.

  getSession() atualiza o access token quando
  necessário. A API recebe apenas o token atual.
*/
export async function sincronizarSessaoAtualApi(
  {
    forcar = false
  } = {}
) {
  const {
    data,
    error
  } = await supabase.auth.getSession();

  if (error) {
    throw error;
  }

  const accessToken =
    data.session?.access_token;

  if (!accessToken) {
    return null;
  }

  return sincronizarSessaoApi(
    accessToken,
    {
      forcar
    }
  );
}


/*
  Apaga o cookie HttpOnly mantido pela API.
*/
export async function limparSessaoApi() {
  if (limpezaEmAndamento) {
    return limpezaEmAndamento;
  }

  limpezaEmAndamento =
    (async () => {
      const resposta =
        await fetch(
          `${ATERO_API_URL}/auth/logout`,
          {
            method: "POST",
            credentials: "include",
            cache: "no-store",

            headers: {
              "Accept": "application/json",
              "X-Atero-Request": "1"
            }
          }
        );

      if (
        !resposta.ok &&
        resposta.status !== 401
      ) {
        const dados =
          await lerJsonSeguro(resposta);

        throw new Error(
          obterMensagemDaApi(
            dados,
            "Não foi possível encerrar a sessão da Atero API."
          )
        );
      }

      tokenSincronizado = null;
      resultadoSincronizado = null;

      return true;
    })();

  try {
    return await limpezaEmAndamento;
  } finally {
    limpezaEmAndamento = null;
  }
}


/*
  Encerra a sessão do Hub e da API.

  Mesmo que a API esteja temporariamente fora do ar,
  o logout local do Supabase ainda é realizado.
*/
export async function sairDaContaAtero(
  {
    scope = "local"
  } = {}
) {
  let erroApi = null;

  try {
    await limparSessaoApi();
  } catch (erro) {
    erroApi = erro;

    console.warn(
      "Não foi possível limpar imediatamente a sessão da API:",
      erro
    );
  }

  const {
    error
  } = await supabase.auth.signOut({
    scope
  });

  if (error) {
    throw error;
  }

  if (erroApi) {
    /*
      O token da API é curto e expirará sozinho.
      O listener abaixo também tentará a limpeza
      novamente quando receber SIGNED_OUT.
    */
    void limparSessaoApi()
      .catch(() => {});
  }
}


/*
  Mantém o cookie da API sincronizado com o token
  atual do Supabase.

  O trabalho assíncrono é adiado para fora do
  callback de onAuthStateChange.
*/
supabase.auth.onAuthStateChange(
  (evento, sessao) => {
    window.setTimeout(
      () => {
        const deveSincronizar =
          evento === "INITIAL_SESSION" ||
          evento === "SIGNED_IN" ||
          evento === "TOKEN_REFRESHED" ||
          evento === "USER_UPDATED";

        if (
          deveSincronizar &&
          sessao?.access_token
        ) {
          void sincronizarSessaoApi(
            sessao.access_token
          ).catch((erro) => {
            console.warn(
              "Não foi possível sincronizar a sessão da API:",
              erro
            );
          });

          return;
        }

        if (evento === "SIGNED_OUT") {
          tokenSincronizado = null;
          resultadoSincronizado = null;

          void limparSessaoApi()
            .catch((erro) => {
              console.warn(
                "Não foi possível limpar a sessão da API:",
                erro
              );
            });
        }
      },

      0
    );
  }
);
