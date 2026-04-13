import { headers } from "next/headers";

function firstForwardedValue(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value
    .split(",")
    .map((entry) => entry.trim())
    .find(Boolean) ?? null;
}

function parseForwardedHeader(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const forwardedFor = value
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.toLowerCase().startsWith("for="));

  if (!forwardedFor) {
    return null;
  }

  return forwardedFor
    .slice(4)
    .replace(/^"|"$/g, "")
    .replace(/^\[|\]$/g, "")
    .trim();
}

function normalizeIp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (trimmed === "::1") {
    return "127.0.0.1";
  }

  if (trimmed.startsWith("::ffff:")) {
    return trimmed.slice(7);
  }

  return trimmed;
}

export function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

export function getClientIpFromHeaders(
  source:
    | Headers
    | {
        get(name: string): string | null;
      },
) {
  return (
    normalizeIp(firstForwardedValue(source.get("x-forwarded-for"))) ??
    normalizeIp(source.get("x-real-ip")) ??
    normalizeIp(source.get("cf-connecting-ip")) ??
    normalizeIp(parseForwardedHeader(source.get("forwarded"))) ??
    "unknown"
  );
}

export function getClientIpFromRequest(request: Request) {
  return getClientIpFromHeaders(request.headers);
}

export async function getClientIpFromCurrentRequest() {
  const headerStore = await headers();
  return getClientIpFromHeaders(headerStore);
}
