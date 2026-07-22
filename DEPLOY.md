# Деплой Virtual Office на Hetzner (Coolify)

**Репозиторий:** `pivosrakami-cmyk/virtual-office` (private)
**Домен:** `https://dashboard.tochtonado.com` (DNS уже на сервере Hetzner)
**Источник данных:** git-репо вольта `hlobe/tochtonado-vault` (read-only) — сервер клонирует и тянет `git pull` каждые 2 мин.

## Шаги в Coolify (https://coolify.tochtonado.com)

1. **New Resource → Public/Private Repository** → `pivosrakami-cmyk/virtual-office`, ветка `master`.
2. **Build Pack: Dockerfile** (не Compose — один сервис).
3. **Domain:** `https://dashboard.tochtonado.com`, **Port: 3000**. SSL — авто (Let's Encrypt).
4. **Environment Variables:**

   | Ключ | Значение |
   |---|---|
   | `VAULT_REPO` | `hlobe/tochtonado-vault` |
   | `VAULT_GIT_TOKEN` | *(read-only токен, см. ниже)* |
   | `VAULT_PATH` | `/data/vault` |
   | `VAULT_PULL_INTERVAL` | `120` |
   | `PROJECTS` | `rhmi,OWN WEB SITE,Sounds Good Media,VIRTUAL OFFICE` |
   | `DASH_USER` | `office` |
   | `DASH_PASSWORD` | *(пароль для входа на дашборд)* |

5. **(опц.) Volume Mount:** `/data` → чтобы клон вольта переживал редеплой (без него — клонируется заново при старте, тоже норм).
6. **Deploy.** После старта проверить `https://dashboard.tochtonado.com/api/health` → `{"status":"ok"}`.

## Токен доступа к вольту (`VAULT_GIT_TOKEN`)

Сервер клонирует приватный репо Виталия. Нужен read-доступ. Варианты:
- **Проще:** classic PAT Дениса (github.com/settings/tokens, scope `repo`) — Денис коллаборатор репо, токен сработает.
- **Чище:** Виталий добавляет read-only Deploy Key в Settings репо вольта.

Значение — только в Coolify Environment Variables, в git не коммитить. Шаблон — `D:\Claude\_secrets\virtual-office.txt`.

## Дев (локально)

`.env.local`: `VAULT_PATH=D:/Claude/Tochtonado`, без токена и пароля. `npm run dev` (порт 3458).
