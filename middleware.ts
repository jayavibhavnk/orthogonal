import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { USER_COOKIE } from "@/lib/auth";

export function middleware(request: NextRequest) {
  const userId = request.cookies.get(USER_COOKIE)?.value;
  const { pathname } = request.nextUrl;

  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isAuthApi = pathname.startsWith("/api/auth");

  if (isAuthPage || isAuthApi) {
    if (userId && isAuthPage) {
      return NextResponse.redirect(new URL("/chat/new", request.url));
    }
    return NextResponse.next();
  }

  const isProtected =
    pathname.startsWith("/chat") ||
    pathname.startsWith("/api/chat") ||
    pathname.startsWith("/api/chats") ||
    pathname.startsWith("/api/artifacts");

  if (isProtected && !userId) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
