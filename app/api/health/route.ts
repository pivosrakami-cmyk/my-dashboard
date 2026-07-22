// Health-check для Coolify — без авторизации, всегда 200
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok" });
}
