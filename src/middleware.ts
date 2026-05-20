import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const protectedPaths = [
  "/perfil",
  "/perfil/update",
  "/perfil/update_password",
  "/perfil/orders",
  "/carrito/envio",
];

export async function middleware(request: NextRequest) {
  const token: any = await getToken({ req: request });
  const pathname = request.nextUrl.pathname;
  let signInUrl;
  const nextUrl = request.nextUrl;

  if (token?.user) {
    if (
      (token?.user?.role === "manager" ||
        token?.user?.role === "director" ||
        token?.user?.role === "super_admin") &&
      !pathname.includes("admin")
    ) {
      signInUrl = new URL("/admin", request.url);
      return NextResponse.redirect(signInUrl);
    }
    if (token?.user?.role === "organizer" && !pathname.includes("admin")) {
      signInUrl = new URL("/admin/evento", request.url);
      return NextResponse.redirect(signInUrl);
    }
    // POS / sucursal roles → redirect to POS module on login
    if (
      (token?.user?.role === "sucursal" || token?.user?.role === "pos") &&
      !pathname.startsWith("/puntodeventa")
    ) {
      signInUrl = new URL("/puntodeventa", request.url);
      return NextResponse.redirect(signInUrl);
    }
    if (
      token?.user?.role === "cliente" &&
      !nextUrl.pathname.includes("perfil")
    ) {
      const callbackUrl = nextUrl.searchParams.get("callbackUrl");

      if (callbackUrl) {
        const callbackUrlString = callbackUrl?.toString();
        // Redirect to the callbackUrl
        return NextResponse.redirect(new URL(callbackUrlString, request.url));
      }
    }
  }

  if (pathname.includes("admin")) {
    //if admin user is not logged in
    if (!token) {
      signInUrl = new URL("/api/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    // Routes restricted to super_admin only
    const superAdminOnlyPaths = [
      "/admin/evento",
      "/admin/productos/inventario",
      "/admin/inventario-inicial",
      "/admin/sucursales",
    ];
    if (superAdminOnlyPaths.some((p) => pathname.startsWith(p))) {
      if (token?.user?.role !== "super_admin") {
        signInUrl = new URL("/no-autorizado", request.url);
        return NextResponse.redirect(signInUrl);
      }
    }

    // Allow organizer to access only /admin/evento and /admin/evento/scanner
    // (organizer is now blocked above since /admin/evento requires super_admin)
    if (token?.user?.role === "organizer") {
      if (!pathname.startsWith("/admin/evento")) {
        signInUrl = new URL("/admin/evento", request.url);
        return NextResponse.redirect(signInUrl);
      }
    } else if (
      token?.user?.role !== "manager" &&
      token?.user?.role !== "director" &&
      token?.user?.role !== "super_admin"
    ) {
      signInUrl = new URL("/no-autorizado", request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  if (pathname.includes("perfil")) {
    //if admin user is not logged in
    if (!token) {
      signInUrl = new URL("/api/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (token?.user?.role !== "cliente") {
      signInUrl = new URL("/no-autorizado", request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  // POS module protection
  if (pathname.startsWith("/puntodeventa")) {
    if (!token) {
      signInUrl = new URL("/api/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
    const posAllowedRoles = [
      "manager",
      "sucursal",
      "pos",
      "organizer",
      "super_admin",
    ];
    if (!posAllowedRoles.includes(token?.user?.role)) {
      signInUrl = new URL("/no-autorizado", request.url);
      return NextResponse.redirect(signInUrl);
    }
  }

  if (pathname.includes("perfil")) {
    //if afiliado user is not logged in
    let signInUrl;
    if (!token) {
      signInUrl = new URL("/api/auth/signin", request.url);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }

    if (token?.user?.role === "afiliado") {
      signInUrl = new URL("/afiliado", request.url);
      return NextResponse.redirect(signInUrl);
    }
    if (
      token?.user?.role === "manager" ||
      token?.user?.role === "super_admin"
    ) {
      signInUrl = new URL("/admin", request.url);
      return NextResponse.redirect(signInUrl);
    }
    if (token?.user?.role === "sucursal") {
      signInUrl = new URL("/puntodeventa", request.url);
      return NextResponse.redirect(signInUrl);
    }
  }
  // Check if 'alink' is present in the URL search parameters
  const affParam = request.nextUrl.searchParams.get("alink");
  if (affParam) {
    try {
      // Attempt to get the client's IP address

      const userAgent = request.headers.get("user-agent"); // User agent string
      const res = await fetch(
        `${process.env.NEXTAUTH_URL}/api/affiliate/createevent`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          method: "POST",
          body: JSON.stringify({
            affParam,
            userAgent,
          }),
        },
      );

      if (res.ok) {
        console.log("Affiliate referral EVENT created successfully");
      }
    } catch (error) {
      console.error("Error creating referral event:", error);
    }
  }
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|icons|logos|covers).*)",
  ],
};
