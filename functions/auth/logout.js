import {
  AUTH_COOKIE,
  REFRESH_COOKIE,
  clearCookie,
  getApp,
  safeReturnTo,
} from "../_sso.js";

export function onRequest({ request, env }) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") ?? "tutorial";
  const app = getApp(env, clientId) ?? getApp(env, "tutorial");
  const returnTo = safeReturnTo(app, url.searchParams.get("return_to"));
  const headers = new Headers({
    Location: returnTo,
    "Cache-Control": "no-store",
  });

  headers.append("Set-Cookie", clearCookie(AUTH_COOKIE));
  headers.append("Set-Cookie", clearCookie(REFRESH_COOKIE));

  return new Response(null, {
    status: 302,
    headers,
  });
}
