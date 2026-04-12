import { handlers } from "@/lib/auth";
import { NextRequest } from "next/server";

function wrapWithDebug(handler: (req: NextRequest) => Promise<Response>) {
  return async (req: NextRequest) => {
    console.log("[AUTH DEBUG]", {
      url: req.url,
      pathname: new URL(req.url).pathname,
      nextUrl: req.nextUrl?.pathname,
      method: req.method,
    });
    return handler(req);
  };
}

export const GET = wrapWithDebug(handlers.GET);
export const POST = wrapWithDebug(handlers.POST);
