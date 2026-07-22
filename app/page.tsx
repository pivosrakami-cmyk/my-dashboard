import { getProjects } from "@/lib/vault";
import TasksBoard, { TaskItem } from "@/components/TasksBoard";
import styles from "./page.module.css";

// Данные читаем из файлов при каждом запросе (витрина «живая»)
export const dynamic = "force-dynamic";

// Порядок статусов: активные сверху, готовые/отклонённые вниз
const ORDER = ["вопрос", "работе", "проверк", "доработ", "новы", "заблок", "готов", "отклон"];
function rank(status: string): number {
  const s = status.toLowerCase();
  const i = ORDER.findIndex((k) => s.includes(k));
  return i === -1 ? ORDER.length : i;
}

export default async function Home() {
  const projects = await getProjects();

  // Собираем задачи всех проектов. Готовые/отклонённые на главной не показываем —
  // они видны только в карточке проекта.
  const items: TaskItem[] = projects.flatMap((p) =>
    p.tasks
      .filter((t) => !t.done)
      .map((t) => ({
        text: t.text,
        status: t.status || "Новые",
        done: t.done,
        project: p.name,
        slug: p.slug,
      }))
  );

  items.sort((a, b) => rank(a.status) - rank(b.status));

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Задачи</h1>
        <span className={styles.count}>{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>Задач нет. Проверь TASKS.md в папках проектов.</p>
      ) : (
        <TasksBoard items={items} />
      )}
    </div>
  );
}
