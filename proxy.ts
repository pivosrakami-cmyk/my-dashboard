import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Basic Auth для витрины. Пароль — в env DASH_PASSWORD (задаётся в Coolify).
// Если пароль не задан (локальная разработка) — пропускаем без проверки.
export function proxy(request: NextRequest) {
  // Health-check Coolify — всегда пропускаем без пароля
  if (request.nextUrl.pathname === "/api/health") return NextResponse.next();

  const password = process.env.DASH_PASSWORD;
  if (!password) return NextResponse.next();

  const user = process.env.DASH_USER || "office";
  const header = request.headers.get("authorization");

  if (header?.startsWith("Basic ")) {
    const decoded = atob(header.slice(6));
    const sep = decoded.indexOf(":");
    const u = decoded.slice(0, sep);
    const p = decoded.slice(sep + 1);
    if (u === user && p === password) return NextResponse.next();
  }

  return new NextResponse("Требуется авторизация", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="Virtual Office"' },
  });
}

// Не проверяем статику и служебные пути
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|fonts/|.*\\.webp).*)"],
};
