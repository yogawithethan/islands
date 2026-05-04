import {
  appOrigin,
  errorPage,
  getApp,
  html,
  safeReturnTo,
  sendPasswordRecovery,
} from "../_sso.js";

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const clientId = url.searchParams.get("client_id") ?? "tutorial";
  const app = getApp(env, clientId);

  if (!app) return errorPage("This island does not exist yet.", 404);

  const returnTo = safeReturnTo(app, url.searchParams.get("return_to") ?? "/profile");

  if (request.method === "POST") {
    const formData = await request.formData();
    const email = String(formData.get("email") ?? "").trim();

    if (!email) {
      return resetPage({ app, clientId, error: "Enter your email address.", returnTo });
    }

    try {
      const callback = new URL("/auth/supabase/callback", appOrigin(app));
      callback.searchParams.set("next", "/profile");
      await sendPasswordRecovery(env, email, callback.toString());
      return resetPage({
        app,
        clientId,
        message: "If that email has an Islands account, a reset link has been sent.",
        returnTo,
      });
    } catch (error) {
      return resetPage({ app, clientId, error: error.message, returnTo });
    }
  }

  return resetPage({ app, clientId, returnTo });
}

function resetPage({ app, clientId, error, message, returnTo }) {
  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Reset Islands password</title>
  <style>
    * { box-sizing: border-box; }
    body {
      min-height: 100dvh;
      margin: 0;
      display: grid;
      place-items: center;
      padding: 32px 18px;
      background: #f5f3eb;
      color: #111;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      width: min(430px, 100%);
      border: 1px solid rgba(17,17,17,.12);
      border-radius: 30px;
      background: rgba(255,255,255,.86);
      padding: 28px;
      box-shadow: 0 28px 80px rgba(17,17,17,.14);
    }
    .brand { display: flex; justify-content: center; margin-bottom: 22px; }
    .brand img { width: 128px; height: auto; }
    h1 { margin: 0; text-align: center; font-family: Georgia, "Times New Roman", serif; font-size: 34px; line-height: .95; }
    p { margin: 10px 0 0; text-align: center; color: #5d5a50; line-height: 1.5; }
    form { display: grid; gap: 13px; margin-top: 24px; }
    input {
      width: 100%;
      height: 52px;
      border: 1px solid rgba(17,17,17,.14);
      border-radius: 17px;
      padding: 0 15px;
      background: #fff;
      color: #111;
      font: inherit;
      font-weight: 650;
      outline: none;
    }
    button, a {
      min-height: 52px;
      border-radius: 999px;
      font: inherit;
      font-weight: 800;
    }
    button {
      border: 0;
      background: #111;
      color: #fff;
      cursor: pointer;
    }
    a {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #111;
      text-decoration: none;
    }
    .notice {
      margin-top: 18px;
      border-radius: 16px;
      padding: 12px 14px;
      font-weight: 750;
      text-align: left;
    }
    .error { background: #fff1f2; color: #a3152a; }
    .message { background: #eefdf3; color: #17603a; }
  </style>
</head>
<body>
  <main>
    <div class="brand"><img src="/islands-word.png" alt="Islands"></div>
    <h1>Reset password</h1>
    <p>This updates your Islands login for ${escapeHtml(app.name)} and connected apps.</p>
    ${error ? `<div class="notice error">${escapeHtml(error)}</div>` : ""}
    ${message ? `<div class="notice message">${escapeHtml(message)}</div>` : ""}
    <form method="post" action="/auth/reset-password?client_id=${escapeHtml(clientId)}&return_to=${encodeURIComponent(returnTo)}">
      <input name="email" type="email" autocomplete="email" inputmode="email" placeholder="Email address" required>
      <button type="submit">Send reset link</button>
    </form>
    <a href="${escapeHtml(appSignInUrl(app, returnTo))}">Back to sign in</a>
  </main>
</body>
</html>`);
}

function appSignInUrl(app, returnTo) {
  const returnPath = new URL(returnTo).pathname;
  const url = new URL("/auth/islands", appOrigin(app));
  url.searchParams.set("next", returnPath);
  url.searchParams.set("mode", "signin");
  return url.toString();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
