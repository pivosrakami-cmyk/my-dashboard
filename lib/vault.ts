import { promises as fs } from "fs";
import path from "path";

// Одна задача. status — колонка Kanban (В работе, Готово…) или "" для старого формата
export interface Task {
  text: string;
  done: boolean;
  status: string;
}

// Секция markdown: заголовок (## …) и её пункты-строки
export interface Section {
  heading: string;
  items: string[];
}

// Проект = папка вольта с GOAL.md и STATUS.md
export interface Project {
  slug: string;
  name: string;
  folder: string;
  stage: string | null; // «Этап: …»
  updated: string | null; // «Обновлено: …»
  goalSummary: string | null; // первый абзац «что делаем»
  now: string[]; // пункты «Сейчас»
  next: string[]; // пункты «Дальше / Следующий шаг»
  openQuestions: string[]; // «Открытые вопросы»
  tasks: Task[]; // все чеклист-пункты
  goalRaw: string;
  statusRaw: string;
  goalSections: Section[];
  statusSections: Section[];
  worklogV: string | null; // последняя запись V-Claude
  worklogD: string | null; // последняя запись D-Claude
}

// Транслитерация имени папки в slug для URL
function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9а-яё]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

// Разбивает markdown на секции по заголовкам ## / ###
function parseSections(md: string): Section[] {
  const lines = md.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section | null = null;

  for (const line of lines) {
    const h = line.match(/^#{2,3}\s+(.*)$/);
    if (h) {
      current = { heading: cleanInline(h[1]), items: [] };
      sections.push(current);
      continue;
    }
    // Пункт списка: -, *, - [ ], - [x]
    const li = line.match(/^\s*[-*]\s+(.*)$/);
    if (li && current) {
      current.items.push(cleanInline(li[1]));
    }
  }
  return sections;
}

// Убирает markdown-разметку из строки для чистого отображения
function cleanInline(s: string): string {
  return s
    .replace(/^\[[ xX]\]\s*/, "") // чекбокс в начале
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1") // _курсив_
    .replace(/`(.+?)`/g, "$1")
    .replace(/\[\[(.+?)\]\]/g, "$1") // wikilink
    .replace(/\[(.+?)\]\(.+?\)/g, "$1") // md-ссылка
    .replace(/[_*]+$/, "") // висячие маркеры в конце
    .trim();
}

// Извлекает чеклист-пункты из markdown (старый формат — без статусов)
function parseTasks(md: string): Task[] {
  const tasks: Task[] = [];
  for (const line of md.split(/\r?\n/)) {
    const m = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (m) {
      tasks.push({ done: m[1].toLowerCase() === "x", text: cleanInline(m[2]), status: "" });
    }
  }
  return tasks;
}

// Парсит TASKS.md (Kanban): колонки ## = статусы, пункты = задачи.
// Вопрос — обычная задача с пометкой ❓ в тексте, отдельного статуса «Вопрос» НЕТ —
// статус задачи всегда равен её реальной колонке. Старая колонка «Вопросы» (легаси)
// сворачивается в «Новые».
function parseKanban(md: string): { tasks: Task[]; questions: string[] } {
  const tasks: Task[] = [];
  const questions: string[] = [];
  let column = "";
  for (const raw of md.split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (/^%%/.test(line) || /kanban-plugin/.test(line)) continue; // служебное
    const h = line.match(/^##\s+(.*)$/);
    if (h) {
      column = cleanInline(h[1]);
      continue;
    }
    const li = line.match(/^\s*[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (!li || !column) continue;
    const text = cleanInline(li[2]);
    if (!text) continue;

    const inQuestionsCol = /вопрос/i.test(column); // старая колонка (легаси) — сворачиваем в «Новые»
    const status = inQuestionsCol ? "Новые" : column;
    const done = li[1].toLowerCase() === "x" || /готов|отклон/i.test(status);
    tasks.push({ text, done, status });
    if (/^❓/.test(text) || inQuestionsCol) questions.push(text.replace(/^❓\s*/, ""));
  }
  return { tasks, questions };
}

// Ищет секцию, чей заголовок содержит одно из ключевых слов
function findSection(sections: Section[], keywords: string[]): Section | null {
  for (const s of sections) {
    const h = s.heading.toLowerCase();
    if (keywords.some((k) => h.includes(k))) return s;
  }
  return null;
}

// Первый содержательный абзац после первого заголовка (для «что делаем»)
function firstParagraph(md: string): string | null {
  const lines = md.split(/\r?\n/);
  const buf: string[] = [];
  let seenHeading = false;
  for (const line of lines) {
    if (/^#\s/.test(line)) {
      seenHeading = true;
      continue;
    }
    if (!seenHeading) continue;
    if (/^#{1,6}\s/.test(line)) {
      if (buf.length) break;
      continue;
    }
    const t = line.trim();
    if (t === "") {
      if (buf.length) break;
      continue;
    }
    if (t.startsWith(">")) continue; // цитата — пропускаем
    if (t.startsWith("---")) continue; // разделитель
    // строки-метки (Обновлено:/Этап:/Дата:) — не описание
    if (/^\*?\*?(обновлено|этап|дата|last update|updated|создано|status)\b/i.test(t)) continue;
    buf.push(t);
  }
  const text = cleanInline(buf.join(" "));
  return text || null;
}

// Аккуратное имя из названия папки (rhmi → RHMI)
function prettyFolder(folder: string): string {
  if (folder === folder.toLowerCase()) return folder.toUpperCase();
  return folder;
}

// Ищет строку по префиксу-метке (напр. «Этап:», «Обновлено:»)
function findLabel(md: string, labels: string[]): string | null {
  for (const line of md.split(/\r?\n/)) {
    const clean = cleanInline(line);
    for (const label of labels) {
      const re = new RegExp(`${label}\\s*:?\\s*(.+)`, "i");
      const m = clean.match(re);
      if (m && m[1].trim()) return m[1].trim();
    }
  }
  return null;
}

async function readIfExists(p: string): Promise<string> {
  try {
    return await fs.readFile(p, "utf-8");
  } catch {
    return "";
  }
}

// Последняя запись worklog заданного автора (V-Claude / D-Claude) из папки Worklog/
async function latestWorklog(dir: string, prefix: string): Promise<string | null> {
  try {
    const files = (await fs.readdir(path.join(dir, "Worklog")))
      .filter((f) => f.startsWith(prefix) && f.endsWith(".md"))
      .sort(); // имена вида Автор-ГГГГ-ММ-ДД.md сортируются по дате
    const last = files[files.length - 1];
    if (!last) return null;
    return (await readIfExists(path.join(dir, "Worklog", last))) || null;
  } catch {
    return null;
  }
}

// Собирает один проект из папки
async function loadProject(vaultPath: string, folder: string): Promise<Project | null> {
  const dir = path.join(vaultPath, folder);
  const goalRaw = await readIfExists(path.join(dir, "GOAL.md"));
  const statusRaw = await readIfExists(path.join(dir, "STATUS.md"));
  const tasksRaw = await readIfExists(path.join(dir, "TASKS.md"));
  if (!goalRaw && !statusRaw && !tasksRaw) return null;

  const worklogV = await latestWorklog(dir, "V-Claude");
  const worklogD = await latestWorklog(dir, "D-Claude");

  const goalSections = parseSections(goalRaw);
  const statusSections = parseSections(statusRaw);

  // Название — из первого # заголовка GOAL (обрезав хвост «— …»),
  // но если заголовок служебный (GOAL/STATUS/цель) — берём имя папки
  const nameMatch = goalRaw.match(/^#\s+(.*)$/m) || statusRaw.match(/^#\s+(.*)$/m);
  let name = prettyFolder(folder);
  if (nameMatch) {
    const candidate = cleanInline(nameMatch[1]).replace(/\s*[—–-]\s*(цель|статус|goal|status).*$/i, "").trim();
    const isService = /^(goal|status|цель|статус)\b/i.test(candidate);
    if (candidate && !isService) name = candidate;
  }

  // Этап — короткая метка; длинные совпадения (описания) игнорируем
  const stageRaw = findLabel(statusRaw, ["Этап", "Stage"]);
  const stage = stageRaw && stageRaw.length <= 50 ? stageRaw : null;
  const updated = findLabel(statusRaw, ["Обновлено", "Last update", "Updated"]);

  // Задачи и вопросы: приоритет — TASKS.md (Kanban). Иначе фолбэк на чеклисты GOAL/STATUS.
  let tasks: Task[];
  let openQuestions: string[];
  let now: string[];
  if (tasksRaw.trim()) {
    const k = parseKanban(tasksRaw);
    tasks = k.tasks;
    openQuestions = k.questions;
    // «Сейчас» на карточке — задачи в работе
    now = tasks.filter((t) => /работе/i.test(t.status)).map((t) => t.text);
  } else {
    const nowSec = findSection(statusSections, ["сейчас", "где мы", "current", "what", "в работе"]);
    const questionsSec =
      findSection(goalSections, ["вопрос", "question"]) ||
      findSection(statusSections, ["вопрос", "question"]);
    tasks = [...parseTasks(goalRaw), ...parseTasks(statusRaw)];
    openQuestions = questionsSec?.items ?? [];
    now = nowSec?.items ?? [];
  }

  const nextSec = findSection(statusSections, ["дальше", "следующий", "next", "next step"]);

  return {
    slug: slugify(folder),
    name,
    folder,
    stage,
    updated,
    goalSummary: firstParagraph(goalRaw),
    now,
    next: nextSec?.items ?? [],
    openQuestions,
    tasks,
    goalRaw,
    statusRaw,
    goalSections,
    statusSections,
    worklogV,
    worklogD,
  };
}

function vaultPath(): string {
  return process.env.VAULT_PATH || "";
}

// Список папок-проектов: из PROJECTS или автодетект
async function projectFolders(vault: string): Promise<string[]> {
  const configured = (process.env.PROJECTS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (configured.length) return configured;

  // Автодетект: папки верхнего уровня, где есть GOAL.md или STATUS.md
  const entries = await fs.readdir(vault, { withFileTypes: true });
  const found: string[] = [];
  for (const e of entries) {
    if (!e.isDirectory() || e.name.startsWith(".")) continue;
    const has =
      (await readIfExists(path.join(vault, e.name, "GOAL.md"))) ||
      (await readIfExists(path.join(vault, e.name, "STATUS.md")));
    if (has) found.push(e.name);
  }
  return found;
}

// Все проекты для дашборда
export async function getProjects(): Promise<Project[]> {
  const vault = vaultPath();
  if (!vault) return [];
  const folders = await projectFolders(vault);
  const projects = await Promise.all(folders.map((f) => loadProject(vault, f)));
  return projects.filter((p): p is Project => p !== null);
}

// Один проект по slug
export async function getProject(slug: string): Promise<Project | null> {
  const projects = await getProjects();
  return projects.find((p) => p.slug === slug) ?? null;
}
