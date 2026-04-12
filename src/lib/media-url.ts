const BASE_PATH = "/tablee";

function hasProtocol(value: string) {
  return /^https?:\/\//i.test(value) || value.startsWith("data:");
}

export function resolveMediaUrl(value: string | null | undefined) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (hasProtocol(trimmed) || trimmed.startsWith(BASE_PATH)) {
    return trimmed;
  }

  if (trimmed.startsWith("/")) {
    return `${BASE_PATH}${trimmed}`;
  }

  return `${BASE_PATH}/${trimmed.replace(/^\/+/, "")}`;
}
