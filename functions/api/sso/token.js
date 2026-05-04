import {
  getApp,
  getClientSecret,
  isAllowedRedirect,
  json,
  readCode,
  requireEnv,
} from "../../_sso.js";

export async function onRequestPost({ request, env }) {
  try {
    requireEnv(env);
  } catch (error) {
    return json({ error: error.message }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON." }, { status: 400 });
  }

  const clientId = String(body.client_id ?? "");
  const clientSecret = String(body.client_secret ?? "");
  const code = String(body.code ?? "");
  const redirectUri = String(body.redirect_uri ?? "");
  const app = getApp(env, clientId);

  if (!app || !getClientSecret(env, app) || clientSecret !== getClientSecret(env, app)) {
    return json({ error: "Invalid client credentials." }, { status: 401 });
  }
  if (!isAllowedRedirect(app, redirectUri)) {
    return json({ error: "Invalid redirect URI." }, { status: 400 });
  }

  let payload;
  try {
    payload = await readCode(env, code);
  } catch {
    return json({ error: "Invalid authorization code." }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    payload.client_id !== clientId ||
    payload.redirect_uri !== redirectUri ||
    !payload.access_token ||
    !payload.refresh_token ||
    !payload.exp ||
    payload.exp < now
  ) {
    return json({ error: "Expired or invalid authorization code." }, { status: 400 });
  }

  return json({
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    token_type: "bearer",
  });
}

export function onRequest() {
  return json({ error: "Method not allowed." }, { status: 405 });
}
