"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { COLUMNS } from "@/lib/columns";
import styles from "./TasksBoard.module.css";

export interface TaskItem {
  text: string;
  status: string;
  done: boolean;
  project: string;
  slug: string;
}

// Цвет пилюли по статусу
function statusClass(status: string): string {
  const s = status.toLowerCase();
  if (/вопрос/.test(s)) return styles.stQ;
  if (/готов/.test(s)) return styles.stDone;
  if (/отклон/.test(s)) return styles.stRejected;
  if (/работе/.test(s)) return styles.stWork;
  if (/доработ/.test(s)) return styles.stRework;
  if (/проверк/.test(s)) return styles.stReview;
  if (/заблок/.test(s)) return styles.stBlocked;
  return styles.stNew;
}

export default function TasksBoard({ items }: { items: TaskItem[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<number | null>(null);

  async function change(i: number, slug: string, text: string, to: string) {
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

  return (
    <div className={styles.wrap}>
      <div className={styles.list}>
        {items.map((t, i) => (
          <div key={i} className={styles.row}>
            <span className={`pill ${statusClass(t.status)}`}>{t.status}</span>
            <Link href={`/project/${t.slug}`} className={styles.text}>
              {t.text}
            </Link>
            <span className={styles.project}>{t.project}</span>
            <select
              className={styles.select}
              value={COLUMNS.includes(t.status) ? t.status : ""}
              disabled={busy === i}
              onChange={(e) => e.target.value && change(i, t.slug, t.text, e.target.value)}
            >
              {!COLUMNS.includes(t.status) && (
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
          </div>
        ))}
      </div>
    </div>
  );
}
