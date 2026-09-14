import { promises as fs } from "fs";
import path from "path";
import { marked } from "marked";
import Collapsible from "@/components/Collapsible";
import styles from "./karta.module.css";

export const dynamic = "force-dynamic";

// Папка «Карта жизни» в корне данных (рядом с папками проектов)
function vaultPath(): string {
  return process.env.VAULT_PATH || path.join(process.cwd(), "..", "my-dashboard-data");
}

async function readIfExists(p: string): Promise<string | null> {
  try {
    return await fs.readFile(p, "utf8");
  } catch {
    return null;
  }
}

// [[Ссылка|Текст]] → Текст, [[Ссылка]] → Ссылка (вики-ссылки Obsidian в HTML не ведут)
function md(src: string): string {
  const clean = src
    .replace(/\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$2")
    .replace(/\[\[([^\]]+)\]\]/g, "$1");
  return marked.parse(clean, { async: false }) as string;
}

const FILES = [
  { file: "Карта жизни.md", title: "🗺️ Карта жизни", open: true },
  { file: "Север (10 лет).md", title: "🧭 Север (10 лет)", open: false },
  { file: "2026–2027 Годовые цели.md", title: "🎯 Годовые цели 2026–2027", open: false },
];

export default async function KartaPage() {
  const dir = path.join(vaultPath(), "Карта жизни");
  const docs = await Promise.all(
    FILES.map(async (f) => ({
      ...f,
      html: await readIfExists(path.join(dir, f.file)).then((s) => (s ? md(s) : null)),
    }))
  );

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.title}>Карта жизни</h1>
        <a
          className={styles.ext}
          href="https://karta.bloompedia.app"
          target="_blank"
          rel="noreferrer"
        >
          чек-листы недель ↗
        </a>
      </div>

      {docs.every((d) => !d.html) && (
        <p className={styles.empty}>
          Файлы карты не найдены. Проверь папку «Карта жизни» в данных дашборда.
        </p>
      )}

      {docs.map(
        (d) =>
          d.html && (
            <section key={d.file} className={styles.block}>
              <h2 className={styles.blockTitle}>{d.title}</h2>
              <Collapsible maxHeight={d.open ? 10000 : 240}>
                <div
                  className={`md ${styles.md}`}
                  dangerouslySetInnerHTML={{ __html: d.html }}
                />
              </Collapsible>
            </section>
          )
      )}
    </div>
  );
}
