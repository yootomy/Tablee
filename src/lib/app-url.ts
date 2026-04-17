const LEGACY_BASE_PATH = "/tablee";

function normalizeBaseUrl(baseUrl: string) {
  const trimmed = baseUrl.trim().replace(/\/+$/, "");

  return trimmed.endsWith(LEGACY_BASE_PATH)
    ? trimmed.slice(0, -LEGACY_BASE_PATH.length)
    : trimmed;
}

export function getAppBaseUrl() {
  const configuredBaseUrl = process.env.NEXTAUTH_URL;

  if (!configuredBaseUrl) {
    throw new Error(
      "NEXTAUTH_URL doit être configuré pour générer les URLs absolues de l'application.",
    );
  }

  return normalizeBaseUrl(configuredBaseUrl);
}

export function buildAppUrl(pathname: string) {
  const normalizedPathname = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${getAppBaseUrl()}${normalizedPathname}`;
}
