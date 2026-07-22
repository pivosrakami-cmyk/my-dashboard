import Link from "next/link";
import type { Project } from "@/lib/vault";
import styles from "./ProjectCard.module.css";

export default function ProjectCard({ project }: { project: Project }) {
  const total = project.tasks.length;
  const done = project.tasks.filter((t) => t.done).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  return (
    <Link href={`/project/${project.slug}`} className={styles.card}>
      <div className={styles.top}>
        <h2 className={styles.name}>{project.name}</h2>
        {project.stage && <span className={`pill ${styles.stage}`}>{project.stage}</span>}
      </div>

      {project.goalSummary && <p className={styles.summary}>{project.goalSummary}</p>}

      {project.now.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionLabel}>Сейчас</div>
          <ul className={styles.list}>
            {project.now.slice(0, 3).map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.footer}>
        {total > 0 && (
          <div className={styles.progress}>
            <div className={styles.bar}>
              <div className={styles.fill} style={{ width: `${pct}%` }} />
            </div>
            <span className={styles.progressText}>
              {done}/{total} готово
            </span>
          </div>
        )}
        {project.openQuestions.length > 0 && (
          <span className={styles.questions}>
            ❓ {project.openQuestions.length} вопрос{plural(project.openQuestions.length)}
          </span>
        )}
      </div>

      {project.updated && <div className={styles.updated}>обновлено: {project.updated}</div>}
    </Link>
  );
}

function plural(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return "";
  if (d >= 2 && d <= 4 && (dd < 10 || dd >= 20)) return "а";
  return "ов";
}
