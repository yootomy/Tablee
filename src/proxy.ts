import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APP_BASE_PATH = "/tablee";
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

function stripBasePath(pathname: string) {
  if (pathname === APP_BASE_PATH) {
    return "/";
  }

  return pathname.startsWith(APP_BASE_PATH)
    ? pathname.slice(APP_BASE_PATH.length) || "/"
    : pathname;
}

function withBasePath(pathname: string) {
  if (pathname === "/") {
    return `${APP_BASE_PATH}/`;
  }

  return pathname.startsWith(APP_BASE_PATH) ? pathname : `${APP_BASE_PATH}${pathname}`;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const normalizedPathname = stripBasePath(pathname);

  if (
    normalizedPathname.startsWith("/api/auth") ||
    normalizedPathname.startsWith("/api/stripe/webhook") ||
    PUBLIC_PATHS.has(normalizedPathname)
  ) {
    return NextResponse.next();
  }

  const token =
    request.cookies.get("authjs.session-token") ??
    request.cookies.get("__Secure-authjs.session-token");

  if (!token) {
    const loginUrl = new URL(withBasePath("/login"), request.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", withBasePath(normalizedPathname));
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
