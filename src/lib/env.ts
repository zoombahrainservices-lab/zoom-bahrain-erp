export function getAppUrl() {
  if (process.env.APP_URL) {
    return process.env.APP_URL.replace(/\/$/, "");
  }

  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return "http://localhost:3000";
}

export function getGoogleRedirectUri() {
  return (
    process.env.GOOGLE_REDIRECT_URI ??
    `${getAppUrl()}/api/integrations/google/callback`
  );
}

export function getGoogleConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    return null;
  }

  return {
    clientId,
    clientSecret,
    redirectUri: getGoogleRedirectUri(),
  };
}

function missingEnv(name: string) {
  return new Error(
    `Missing ${name}. Set it in .env.local (dev) or Vercel Environment Variables (production).`,
  );
}

export function getDatabaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw missingEnv("DATABASE_URL");
  }
  return url;
}

export function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (secret) {
    return secret;
  }

  if (process.env.NODE_ENV === "production") {
    throw missingEnv("SESSION_SECRET");
  }

  return "local-dev-only-not-for-production";
}

export function getSeedAdminPassword() {
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!password) {
    throw missingEnv("SEED_ADMIN_PASSWORD");
  }
  return password;
}

export function getSeedAdminUsername() {
  return process.env.SEED_ADMIN_USERNAME?.trim() || "admin";
}

export type EnvStatus = {
  database: boolean;
  session: boolean;
  appUrl: string;
  google: boolean;
  seed: boolean;
};

export function getEnvStatus(): EnvStatus {
  return {
    database: Boolean(process.env.DATABASE_URL),
    session: Boolean(process.env.SESSION_SECRET),
    appUrl: getAppUrl(),
    google: Boolean(
      process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
    ),
    seed: Boolean(process.env.SEED_ADMIN_PASSWORD),
  };
}
