import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const APP_BASE_PATH = "/tablee";
const PUBLIC_FILE_PATTERN = /\.[^/]+$/;

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
    normalizedPathname.startsWith("/login") ||
    normalizedPathname.startsWith("/register") ||
    normalizedPathname.startsWith("/api/auth") ||
    normalizedPathname === "/" ||
    PUBLIC_FILE_PATTERN.test(normalizedPathname)
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
