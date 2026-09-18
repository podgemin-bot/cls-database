import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";

const PROTECTED_PREFIXES = [
  "/rooms",
  "/locations",
  "/floorplan",
  "/engineering",
  "/profile",
  "/admin",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname === "/login" || pathname === "/signup") {
    if (hasSession) {
      const url = new URL("/", request.url);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  const isProtected =
    pathname === "/" ||
    PROTECTED_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    const callback = pathname + request.nextUrl.search;
    if (callback.startsWith("/") && !callback.startsWith("//")) {
      loginUrl.searchParams.set("callbackURL", callback);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};