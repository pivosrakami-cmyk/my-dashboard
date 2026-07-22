import { getProject, getProjects } from "@/lib/vault";
import { notFound } from "next/navigation";
import Link from "next/link";
import { marked } from "marked";
import Collapsible from "@/components/Collapsible";
import TaskManager, { ManagedTask } from "@/components/TaskManager";
import styles from "./project.module.css";

export const dynamic = "force-dynamic";

// Порядок статусов: активные сверху, готовые вниз
const ORDER = ["вопрос", "работе", "проверк", "доработ", "новы", "заблок", "готов", "отклон"];
function rank(status: string): number {
  const s = status.toLowerCase();
  const i = ORDER.findIndex((k) => s.includes(k));
  return i === -1 ? ORDER.length : i;
}

function md(src: string): string {
  return marked.parse(src, { async: false }) as string;
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  // Задачи (вопросы уже среди них со статусом «Вопрос»), отсортированы по статусу.
  // column — реальная колонка Kanban / «Вопрос» (для пилюли и дропдауна)
  const items: ManagedTask[] = project.tasks
    .map((t) => ({
      text: t.text,
      column: t.status || (t.done ? "Готово" : "Новые"),
      done: t.done,
    }))
    .sort((a, b) => rank(a.column) - rank(b.column));

  const hasWorklog = project.worklogV || project.worklogD;

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.back}>
        ← Все задачи
      </Link>

      <div className={styles.header}>
        <h1 className={styles.name}>{project.name}</h1>
        <div className={styles.meta}>
          {project.stage && <span className={`pill ${styles.stage}`}>{project.stage}</span>}
          {project.updated && (
            <span className={styles.updated}>обновлено: {project.updated}</span>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        {/* Задачи (задачи + вопросы) */}
        <section className={`${styles.block} ${styles.tasks}`}>
          <h2 className={styles.blockTitle}>Задачи</h2>
          <Collapsible maxHeight={320}>
            <TaskManager items={items} slug={slug} />
          </Collapsible>
        </section>

        {/* Worklog: сначала V-Claude, потом D-Claude */}
        <section className={`${styles.block} ${styles.worklog}`}>
          <h2 className={styles.blockTitle}>Worklog</h2>
          {hasWorklog ? (
            <Collapsible maxHeight={320}>
              {project.worklogV && (
                <div className={styles.wlEntry}>
                  <div className={styles.wlAuthor}>V-Claude</div>
                  <div className={styles.md} dangerouslySetInnerHTML={{ __html: md(project.worklogV) }} />
                </div>
              )}
              {project.worklogD && (
                <div className={styles.wlEntry}>
                  <div className={styles.wlAuthor}>D-Claude</div>
                  <div className={styles.md} dangerouslySetInnerHTML={{ __html: md(project.worklogD) }} />
                </div>
              )}
            </Collapsible>
          ) : (
            <p className={styles.emptyBlock}>Записей нет</p>
          )}
        </section>

        {/* GOAL */}
        <section className={`${styles.block} ${styles.goal}`}>
          <h2 className={styles.blockTitle}>Goal</h2>
          <Collapsible maxHeight={220}>
            <div className={styles.md} dangerouslySetInnerHTML={{ __html: md(project.goalRaw) }} />
          </Collapsible>
        </section>

        {/* STATUS */}
        <section className={`${styles.block} ${styles.status}`}>
          <h2 className={styles.blockTitle}>Status</h2>
          <Collapsible maxHeight={220}>
            <div className={styles.md} dangerouslySetInnerHTML={{ __html: md(project.statusRaw) }} />
          </Collapsible>
        </section>
      </div>
    </div>
  );
}

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}
