import {
  AUTH_COOKIE,
  REFRESH_COOKIE,
  clearCookie,
  cookie,
  errorPage,
  formPage,
  getApp,
  getUser,
  islandPendingPage,
  isAllowedRedirect,
  issueCode,
  parseCookies,
  refreshSession,
  requireEnv,
  signInWithPassword,
  signUpWithPassword,
} from "../_sso.js";

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams);
  const clientId = url.searchParams.get("client_id") ?? "";
  const redirectUri = url.searchParams.get("redirect_uri") ?? "";
  const state = url.searchParams.get("state") ?? "";
  const returnTo = url.searchParams.get("return_to") ?? "/";
  const mode = url.searchParams.get("mode") === "signup" ? "signup" : "signin";
  const app = getApp(env, clientId);

  if (!app) return islandPendingPage({ clientId, redirectUri, returnTo });

  try {
    requireEnv(env);
  } catch (error) {
    return errorPage(error.message, 500);
  }
  if (!state) return errorPage("Missing state.");
  if (!isAllowedRedirect(app, redirectUri)) {
    return errorPage("This app is not allowed to use that redirect URL.");
  }

  if (request.method === "POST") {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const intent = formData.get("intent") === "signup" ? "signup" : "signin";

    try {
      const session = intent === "signup"
        ? await signUpWithPassword(env, email, password)
        : await signInWithPassword(env, email, password);
      return redirectWithCode({
        app,
        clientId,
        env,
        redirectUri,
        returnTo,
        session,
        state,
      });
    } catch (error) {
      return formPage({
        appName: app.name,
        error: error.message,
        mode: intent,
        params,
      });
    }
  }

  const cookies = parseCookies(request);
  const accessToken = cookies[AUTH_COOKIE];
  const refreshToken = cookies[REFRESH_COOKIE];

  if (accessToken && await getUser(env, accessToken)) {
    return redirectWithCode({
      app,
      clientId,
      env,
      redirectUri,
      returnTo,
      session: { access_token: accessToken, refresh_token: refreshToken },
      state,
    });
  }

  if (refreshToken) {
    const session = await refreshSession(env, refreshToken);
    if (session?.access_token && session.refresh_token) {
      return redirectWithCode({
        app,
        clientId,
        env,
        redirectUri,
        returnTo,
        session,
        state,
      });
    }
  }

  return formPage({ appName: app.name, mode, params });
}

async function redirectWithCode({ clientId, env, redirectUri, returnTo, session, state }) {
  const code = await issueCode(env, session, clientId, redirectUri);
  const redirectUrl = new URL(redirectUri);
  redirectUrl.searchParams.set("code", code);
  redirectUrl.searchParams.set("state", state);
  redirectUrl.searchParams.set("return_to", returnTo);
  const headers = new Headers({
    Location: redirectUrl.toString(),
    "Cache-Control": "no-store",
  });
  headers.append("Set-Cookie", cookie(AUTH_COOKIE, session.access_token, 60 * 60));
  headers.append("Set-Cookie", cookie(REFRESH_COOKIE, session.refresh_token, 60 * 60 * 24 * 30));

  return new Response(null, {
    status: 302,
    headers,
  });
}
