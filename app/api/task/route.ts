import { NextRequest } from "next/server";
import { getProject } from "@/lib/vault";
import { moveTaskStatus } from "@/lib/tasks";

export const dynamic = "force-dynamic";

// Смена статуса задачи: перемещает её в другую колонку TASKS.md + git push
export async function POST(req: NextRequest) {
  try {
    const { slug, text, to } = await req.json();
    if (!slug || !text || !to) {
      return Response.json({ error: "нужны slug, text, to" }, { status: 400 });
    }
    const project = await getProject(slug);
    if (!project) return Response.json({ error: "проект не найден" }, { status: 404 });

    const vault = process.env.VAULT_PATH || "";
    const result = await moveTaskStatus(vault, project.folder, text, to);
    return Response.json({ ok: true, ...result });
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 500 });
  }
}
