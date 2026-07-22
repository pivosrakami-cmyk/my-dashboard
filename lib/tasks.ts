import { promises as fs } from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// Готовые статусы → чекбокс [x]
function isDoneColumn(col: string): boolean {
  return /готов|отклон/i.test(col);
}

// Текст задачи без чекбокса и markdown-разметки — для сравнения с текстом от фронтенда
// (там текст уже прошёл через cleanInline в lib/vault.ts, разметки в нём нет).
// Убирая ❓, смена статуса вопроса превращает его в обычную задачу (вопрос «отвечен»).
function normText(s: string): string {
  return s
    .replace(/^\s*[-*]\s+\[[ xX]\]\s+/, "")
    .replace(/^❓\s*/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[\[(.+?)\]\]/g, "$1")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/[_*]+$/, "")
    .trim();
}

// Перемещает задачу с текстом text в колонку toColumn. Возвращает новый markdown.
function moveInKanban(md: string, text: string, toColumn: string): string {
  const lines = md.split(/\r?\n/);
  const target = normText(text);

  // 1. Находим и вырезаем строку задачи (в любой колонке)
  let taskLine: string | null = null;
  let col = "";
  const kept: string[] = [];
  for (const line of lines) {
    const h = line.match(/^##\s+(.*)$/);
    if (h) col = h[1].trim();
    const li = line.match(/^\s*[-*]\s+\[[ xX]\]\s+(.*)$/);
    if (li && col && normText(line) === target) {
      taskLine = line; // нашли — не добавляем в kept (вырезаем)
      continue;
    }
    kept.push(line);
  }
  if (!taskLine) return md; // задача не найдена — не трогаем

  // 2. Формируем строку с нужным чекбоксом
  const checkbox = isDoneColumn(toColumn) ? "[x]" : "[ ]";
  const newLine = `- ${checkbox} ${target}`;

  // 3. Вставляем в конец секции toColumn (перед следующим ## или блоком settings)
  const out: string[] = [];
  let inserted = false;
  let curCol = "";
  for (let i = 0; i < kept.length; i++) {
    const line = kept[i];
    const h = line.match(/^##\s+(.*)$/);

    // Достигли следующего заголовка или settings-блока — вставляем перед ним, если были в целевой колонке
    if ((h || /^%%/.test(line)) && curCol === toColumn && !inserted) {
      out.push(newLine, "");
      inserted = true;
    }
    if (h) curCol = h[1].trim();
    out.push(line);
  }
  // Если целевая колонка была последней — добавляем в конец
  if (!inserted && curCol === toColumn) {
    out.push(newLine);
    inserted = true;
  }
  // Колонки toColumn нет вовсе — создаём её в конце
  if (!inserted) {
    out.push("", `## ${toColumn}`, "", newLine);
  }

  return out.join("\n");
}

async function isGitRepo(dir: string): Promise<boolean> {
  try {
    await fs.access(path.join(dir, ".git"));
    return true;
  } catch {
    return false;
  }
}

// Коммит + push изменённого TASKS.md (если вольт — git-репо). Возвращает статус.
async function gitSync(vaultPath: string, folder: string): Promise<string> {
  if (!(await isGitRepo(vaultPath))) return "skip-not-git-repo";
  const rel = `${folder}/TASKS.md`;
  const opts = { cwd: vaultPath };
  const author = '-c user.email=dashboard@tochtonado -c user.name="VO Dashboard"';
  try {
    await execAsync(`git config --global --add safe.directory "${vaultPath}"`, opts).catch(() => {});
    await execAsync(`git ${author} pull --no-rebase --quiet`, opts).catch(() => {});
    await execAsync(`git add "${rel}"`, opts);
    await execAsync(`git ${author} commit -m "dashboard: смена статуса задачи"`, opts);
    await execAsync(`git push`, opts);
    return "pushed";
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return `git-error: ${msg}`;
  }
}

// Добавляет новую задачу в колонку toColumn файла TASKS.md
function addToKanban(md: string, text: string, toColumn: string): string {
  const checkbox = isDoneColumn(toColumn) ? "[x]" : "[ ]";
  const newLine = `- ${checkbox} ${text.trim()}`;
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let inserted = false;
  let curCol = "";
  for (const line of lines) {
    const h = line.match(/^##\s+(.*)$/);
    if ((h || /^%%/.test(line)) && curCol === toColumn && !inserted) {
      out.push(newLine, "");
      inserted = true;
    }
    if (h) curCol = h[1].trim();
    out.push(line);
  }
  if (!inserted && curCol === toColumn) {
    out.push(newLine);
    inserted = true;
  }
  if (!inserted) out.push("", `## ${toColumn}`, "", newLine);
  return out.join("\n");
}

// Создаёт задачу в проекте (ассистент)
export async function addTask(
  vaultPath: string,
  folder: string,
  text: string,
  toColumn: string
): Promise<{ git: string }> {
  const file = path.join(vaultPath, folder, "TASKS.md");
  const md = await fs.readFile(file, "utf-8");
  const updated = addToKanban(md, text, toColumn);
  await fs.writeFile(file, updated, "utf-8");
  const git = await gitSync(vaultPath, folder);
  return { git };
}

// Основная операция: сменить статус задачи (переместить между колонками)
export async function moveTaskStatus(
  vaultPath: string,
  folder: string,
  text: string,
  toColumn: string
): Promise<{ changed: boolean; git: string }> {
  const file = path.join(vaultPath, folder, "TASKS.md");
  const md = await fs.readFile(file, "utf-8");
  const updated = moveInKanban(md, text, toColumn);
  if (updated === md) return { changed: false, git: "no-change" };
  await fs.writeFile(file, updated, "utf-8");
  const git = await gitSync(vaultPath, folder);
  return { changed: true, git };
}
