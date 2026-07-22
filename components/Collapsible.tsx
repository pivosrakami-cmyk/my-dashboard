"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./Collapsible.module.css";

// Сворачивает длинный контент до maxHeight, показывает кнопку «Больше/Меньше»
export default function Collapsible({
  children,
  maxHeight = 180,
}: {
  children: React.ReactNode;
  maxHeight?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflowing, setOverflowing] = useState(false);

  // Проверяем, превышает ли контент порог (тогда нужна кнопка)
  useEffect(() => {
    const el = ref.current;
    if (el) setOverflowing(el.scrollHeight > maxHeight + 8);
  }, [maxHeight, children]);

  return (
    <div className={styles.wrap}>
      <div
        ref={ref}
        className={styles.content}
        style={{ maxHeight: expanded ? "none" : maxHeight }}
      >
        {children}
        {overflowing && !expanded && <div className={styles.fade} />}
      </div>
      {overflowing && (
        <button className={styles.toggle} onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Меньше" : "Больше"}
        </button>
      )}
    </div>
  );
}
