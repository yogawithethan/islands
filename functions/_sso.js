export const AUTH_COOKIE = "islands_access_token";
export const REFRESH_COOKIE = "islands_refresh_token";

const defaultApps = {
  tutorial: {
    name: "The User Manual",
    secretEnv: "ISLANDS_CLIENT_TUTORIAL_SECRET",
    redirectUris: [
      "https://tutorial.yoga-e65.workers.dev/auth/islands/callback",
      "https://tutorial.yogawithethan.com/auth/islands/callback",
      "https://tutorial-8pu.pages.dev/auth/islands/callback",
      "http://localhost:3002/auth/islands/callback",
    ],
    returnOrigins: [
      "https://tutorial.yoga-e65.workers.dev",
      "https://tutorial.yogawithethan.com",
      "https://tutorial-8pu.pages.dev",
      "http://localhost:3002",
    ],
  },
};

export function getApp(env, clientId) {
  const apps = env.ISLANDS_SSO_APPS
    ? JSON.parse(env.ISLANDS_SSO_APPS)
    : defaultApps;
  return apps[clientId] ?? null;
}

export function getClientSecret(env, app) {
  return env[app.secretEnv] ?? "";
}

export function requireEnv(env) {
  const missing = [];
  if (!env.SUPABASE_URL) missing.push("SUPABASE_URL");
  if (!env.SUPABASE_PUBLISHABLE_KEY) missing.push("SUPABASE_PUBLISHABLE_KEY");
  if (!env.ISLANDS_SSO_CODE_SECRET) missing.push("ISLANDS_SSO_CODE_SECRET");
  if (missing.length > 0) {
    throw new Error(`Missing Islands SSO env: ${missing.join(", ")}`);
  }
}

export function isAllowedRedirect(app, redirectUri) {
  return app.redirectUris.includes(redirectUri);
}

export function appOrigin(app) {
  return app.returnOrigins?.[0] ?? new URL(app.redirectUris[0]).origin;
}

export function safeReturnTo(app, value) {
  if (!value) return appOrigin(app);

  try {
    const url = new URL(value);
    return app.returnOrigins?.includes(url.origin) ? url.toString() : appOrigin(app);
  } catch {
    if (value.startsWith("/") && !value.startsWith("//")) {
      return `${appOrigin(app)}${value}`;
    }
  }

  return appOrigin(app);
}

export function parseCookies(request) {
  const header = request.headers.get("Cookie") ?? "";
  return Object.fromEntries(
    header
      .split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf("=");
        if (index === -1) return [part, ""];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      }),
  );
}

export function cookie(name, value, maxAge) {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function clearCookie(name) {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

export function html(body, init = {}) {
  return new Response(body, {
    ...init,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      ...(init.headers ?? {}),
    },
  });
}

export function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...(init.headers ?? {}),
    },
  });
}

export function formPage({ appName, error, mode, params }) {
  const isSignup = mode === "signup";
  const title = isSignup ? "Create your Islands account" : "Sign in with Islands";
  const alternateMode = isSignup ? "signin" : "signup";
  const alternateLabel = isSignup
    ? "Already have an account? Sign in"
    : "New here? Create an account";
  const query = new URLSearchParams(params);
  query.set("mode", alternateMode);
  const resetQuery = new URLSearchParams(params);
  resetQuery.set("return_to", params.return_to ?? "/profile");

  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
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
    input:focus { border-color: #111; }
    button, a.switch {
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
    a.switch {
      display: flex;
      align-items: center;
      justify-content: center;
      color: #111;
      text-decoration: none;
    }
    .error {
      margin-top: 18px;
      border-radius: 16px;
      background: #fff1f2;
      padding: 12px 14px;
      color: #a3152a;
      font-weight: 750;
      text-align: left;
    }
    .footer { margin-top: 18px; font-size: 12px; font-weight: 800; letter-spacing: .14em; text-transform: uppercase; }
  </style>
</head>
<body>
  <main>
    <div class="brand"><img src="/islands-word.png" alt="Islands"></div>
    <h1>${escapeHtml(title)}</h1>
    <p>Continue to ${escapeHtml(appName)} with one account across Ethan's apps.</p>
    ${error ? `<div class="error">${escapeHtml(error)}</div>` : ""}
    <form method="post" action="/auth/authorize?${escapeHtml(new URLSearchParams(params).toString())}">
      <input name="email" type="email" autocomplete="email" inputmode="email" placeholder="Email address" required>
      <input name="password" type="password" autocomplete="${isSignup ? "new-password" : "current-password"}" placeholder="Password" minlength="8" required>
      <input name="intent" type="hidden" value="${isSignup ? "signup" : "signin"}">
      <button type="submit">${isSignup ? "Create Islands account" : "Sign in with Islands"}</button>
    </form>
    <a class="switch" href="/auth/reset-password?${escapeHtml(resetQuery.toString())}">Forgot password?</a>
    <a class="switch" href="/auth/authorize?${escapeHtml(query.toString())}">${escapeHtml(alternateLabel)}</a>
    <p class="footer">Powered by Islands</p>
  </main>
</body>
</html>`);
}

export function errorPage(message, status = 400) {
  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Islands sign-in</title>
  <link rel="preload" as="image" href="/islands-bg-optimized.jpg">
  <link rel="preload" as="image" href="/islands-word_white.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="about-body">
  <a class="skip-link" href="#auth-error-title">Skip to content</a>
  <div class="about-bg" aria-hidden="true"></div>
  <header class="about-nav">
    <a class="about-brand" href="/" aria-label="islands home"><img src="/islands-word_white.png" alt="islands"></a>
    <a href="/">Home</a>
  </header>
  <main class="not-found-page island-pending-page" aria-labelledby="auth-error-title">
    <p class="about-kicker">sign-in paused</p>
    <h1 id="auth-error-title">Islands sign-in could not continue.</h1>
    <p>${escapeHtml(message)}</p>
    <a class="about-button" href="/">Return home</a>
  </main>
</body>
</html>`, { status });
}

export function islandPendingPage({ clientId, redirectUri, returnTo }) {
  const appName = clientId ? clientId.replace(/[-_]+/g, " ") : "this app";
  const fallbackUrl = safeExternalUrl(redirectUri) ?? safeExternalUrl(returnTo);

  return html(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>This island is still forming — islands</title>
  <meta name="description" content="This island has not been created yet.">
  <link rel="preload" as="image" href="/islands-bg-optimized.jpg">
  <link rel="preload" as="image" href="/islands-word_white.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Newsreader:opsz,wght@6..72,500;6..72,600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/styles.css">
</head>
<body class="about-body">
  <a class="skip-link" href="#pending-island-title">Skip to content</a>
  <div class="about-bg" aria-hidden="true"></div>
  <header class="about-nav">
    <a class="about-brand" href="/" aria-label="islands home"><img src="/islands-word_white.png" alt="islands"></a>
    <a href="/">Home</a>
  </header>
  <main class="not-found-page island-pending-page" aria-labelledby="pending-island-title">
    <p class="about-kicker">island not found</p>
    <h1 id="pending-island-title">This island is still forming.</h1>
    <p>
      The sign-in request for <strong>${escapeHtml(appName)}</strong> reached islands, but that island
      has not been created or connected yet.
    </p>
    <div class="pending-island-actions">
      <a class="about-button" href="/">Return home</a>
      ${fallbackUrl ? `<a class="about-home-link" href="${escapeHtml(fallbackUrl)}">Go back to the app</a>` : ""}
    </div>
    <dl class="pending-island-meta" aria-label="Sign-in request details">
      <div>
        <dt>Requested island</dt>
        <dd>${escapeHtml(clientId || "unknown")}</dd>
      </div>
      <div>
        <dt>Status</dt>
        <dd>not created yet</dd>
      </div>
    </dl>
  </main>
</body>
</html>`, { status: 404 });
}

function safeExternalUrl(value) {
  if (!value) return "";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : "";
  } catch {
    return "";
  }
}

export async function signInWithPassword(env, email, password) {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: supabaseHeaders(env),
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.msg ?? payload.message ?? "Could not sign in.");
  }
  return payload;
}

export async function signUpWithPassword(env, email, password) {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/signup`, {
    method: "POST",
    headers: supabaseHeaders(env),
    body: JSON.stringify({ email, password }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.msg ?? payload.message ?? "Could not create account.");
  }
  if (!payload.access_token || !payload.refresh_token) {
    throw new Error("Check your email to confirm your account, then sign in.");
  }
  return payload;
}

export async function sendPasswordRecovery(env, email, redirectTo) {
  const url = new URL(`${env.SUPABASE_URL}/auth/v1/recover`);
  url.searchParams.set("redirect_to", redirectTo);
  const response = await fetch(url, {
    method: "POST",
    headers: supabaseHeaders(env),
    body: JSON.stringify({ email }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error_description ?? payload.msg ?? payload.message ?? "Could not send reset email.");
  }
  return payload;
}

export async function refreshSession(env, refreshToken) {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: supabaseHeaders(env),
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) return null;
  return response.json();
}

export async function getUser(env, accessToken) {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
    headers: {
      ...supabaseHeaders(env),
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (!response.ok) return null;
  return response.json();
}

export function supabaseHeaders(env) {
  return {
    apikey: env.SUPABASE_PUBLISHABLE_KEY,
    Authorization: `Bearer ${env.SUPABASE_PUBLISHABLE_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function issueCode(env, session, clientId, redirectUri) {
  const payload = {
    access_token: session.access_token,
    refresh_token: session.refresh_token,
    client_id: clientId,
    redirect_uri: redirectUri,
    exp: Math.floor(Date.now() / 1000) + 60,
  };
  return encryptJson(env.ISLANDS_SSO_CODE_SECRET, payload);
}

export async function readCode(env, code) {
  return decryptJson(env.ISLANDS_SSO_CODE_SECRET, code);
}

async function encryptJson(secret, payload) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await codeKey(secret);
  const encoded = new TextEncoder().encode(JSON.stringify(payload));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return `${base64url(iv)}.${base64url(new Uint8Array(ciphertext))}`;
}

async function decryptJson(secret, code) {
  const [ivPart, ciphertextPart] = code.split(".");
  if (!ivPart || !ciphertextPart) throw new Error("Invalid code.");
  const key = await codeKey(secret);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromBase64url(ivPart) },
    key,
    fromBase64url(ciphertextPart),
  );
  return JSON.parse(new TextDecoder().decode(plaintext));
}

async function codeKey(secret) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function fromBase64url(value) {
  const padded = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
