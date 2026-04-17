import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const LEGACY_BASE_PATH = "/tablee";
const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/register",
  "/manifest.webmanifest",
  "/favicon.ico",
  "/logo-tablee-nobg.png",
  "/file.svg",
  "/globe.svg",
  "/next.svg",
  "/vercel.svg",
  "/window.svg",
]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === LEGACY_BASE_PATH || pathname.startsWith(`${LEGACY_BASE_PATH}/`)) {
    const redirectPath = pathname.slice(LEGACY_BASE_PATH.length) || "/";
    const redirectUrl = new URL(redirectPath, request.nextUrl.origin);
    redirectUrl.search = request.nextUrl.search;
    return NextResponse.redirect(redirectUrl, 308);
  }

  if (
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/stripe/webhook") ||
    PUBLIC_PATHS.has(pathname)
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (!token) {
    const loginUrl = new URL("/login", request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
