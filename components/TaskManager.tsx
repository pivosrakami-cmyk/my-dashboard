"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { COLUMNS } from "@/lib/columns";
import styles from "./TaskManager.module.css";

export interface ManagedTask {
  text: string;
  column: string; // колонка Kanban, где сейчас задача
  done: boolean;
}

// Цвет пилюли по статусу
function statusClass(col: string): string {
  const s = col.toLowerCase();
  if (/вопрос/.test(s)) return styles.stQ;
  if (/готов/.test(s)) return styles.stDone;
  if (/отклон/.test(s)) return styles.stRejected;
  if (/работе/.test(s)) return styles.stWork;
  if (/доработ/.test(s)) return styles.stRework;
  if (/проверк/.test(s)) return styles.stReview;
  if (/заблок/.test(s)) return styles.stBlocked;
  return styles.stNew;
}

export default function TaskManager({ items, slug }: { items: ManagedTask[]; slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  async function change(i: number, text: string, to: string) {
    setBusy(i);
    try {
      const res = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, text, to }),
      });
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!items.length) return <p className={styles.empty}>Задач нет</p>;

  return (
    <ul className={styles.list}>
      {items.map((t, i) => (
        <li key={i} className={styles.task}>
          <span className={`pill ${statusClass(t.column)}`}>{t.column}</span>
          <span className={t.done ? styles.textDone : styles.text}>{t.text}</span>
          <select
            className={styles.select}
            value={COLUMNS.includes(t.column) ? t.column : ""}
            disabled={busy === i}
            onChange={(e) => e.target.value && change(i, t.text, e.target.value)}
          >
            {!COLUMNS.includes(t.column) && (
              <option value="" disabled>
                — статус —
              </option>
            )}
            {COLUMNS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </li>
      ))}
    </ul>
  );
}
