import { NextRequest, NextResponse } from "next/server";

function isProtectedCustomerPath(pathname: string) {
  return (
    pathname.startsWith("/cart") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/payment") ||
    pathname.startsWith("/orders") ||
    pathname.startsWith("/profile")
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/admin") && pathname !== "/api/admin/login") {
    const adminSession = request.cookies.get("admin_session")?.value;
    if (!adminSession) {
      return NextResponse.json({ ok: false, message: "Unauthorized admin access" }, { status: 401 });
    }
  }

  if (pathname.startsWith("/admin")) {
    if (pathname === "/admin/login" || pathname === "/admin/signup") {
      return NextResponse.next();
    }
    const adminSession = request.cookies.get("admin_session")?.value;
    if (!adminSession) {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  if (isProtectedCustomerPath(pathname)) {
    const customerSession = request.cookies.get("customer_session")?.value;
    if (!customerSession) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*", "/cart/:path*", "/checkout/:path*", "/payment/:path*", "/orders/:path*", "/profile/:path*"],
};
