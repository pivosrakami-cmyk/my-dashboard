"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Shell.module.css";

interface NavProject {
  slug: string;
  name: string;
}

export default function Shell({
  projects,
  children,
}: {
  projects: NavProject[];
  children: React.ReactNode;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("vo-theme") as "light" | "dark" | null;
    if (saved) setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem("vo-theme", theme);
  }, [theme]);

  // Закрываем меню при переходе
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  // Закрываем меню по клику вне него
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <span className={styles.brandText}>Мой дашборд</span>
        </Link>

        <div className={styles.headerActions}>
          <div className={styles.menuWrap} ref={menuRef}>
            <button
              className={styles.menuBtn}
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Проекты"
            >
              <span className={styles.menuBtnText}>Проекты</span>
              <span className={styles.menuIcon}>☰</span>
            </button>
            {menuOpen && (
              <div className={styles.dropdown}>
                {projects.map((p) => {
                  const active = pathname === `/project/${p.slug}`;
                  return (
                    <Link
                      key={p.slug}
                      href={`/project/${p.slug}`}
                      className={`${styles.navLink} ${active ? styles.navLinkActive : ""}`}
                    >
                      {p.name}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          <button
            className={styles.themeToggle}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Переключить тему"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <div className={styles.body}>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
