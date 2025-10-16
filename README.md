# NestJS: Сервіс управління юзерами

## 1) Мета

Побудувати бекенд‑сервіс для керування користувачами з авторизацією, ролями, дозволами та аудитом. Проєкт розрахований на роботу **3 розробників** і демонструє промислові практики (RBAC/ABAC, multi‑tenant, логування, тести, документація).

## 2) Коротко про функціонал (MVP → розширення)

* **Аутентифікація:** реєстрація, логін, refresh‑токени, вихід, відновлення пароля, верифікація email.
* **Користувачі:** профіль, CRUD, блокування/розблокування, пошук/фільтри/пагінація.
* **Організації та команди:** ієрархія організацій (parent/child), команди в межах організацій.
* **Ролі та дозволи:** RBAC (Role↔Permission), призначення ролей по скоупу (global/org/team).
* **Політики (ABAC):** умови доступу за атрибутами об’єктів/користувача, пріоритети, заборони.
* **Аудит та безпека:** лог дій, rate‑limit, блокування сесій, чорний список refresh.
* **Документація:** Swagger/OpenAPI, README, діаграми.

> **Рівні складності:**
>
> * **MVP**: Auth + Users CRUD + RBAC (базові ролі) + Swagger.
> * **Advanced**: Org/Team, ABAC, аудит, листи (email), кеш/Redis.

## 3) Технічний стек

* **NestJS 10+, TypeScript, Node 20+**
* **PostgreSQL + Prisma ORM**, **Redis**
* **JWT (access/refresh), Passport**, **bcrypt**
* **BullMQ** для фонового розсилання листів (Nodemailer + MailHog локально)
* **Swagger**, **Jest**, **Pino**
* Контейнеризація: **docker-compose** (Postgres/Redis/Mailhog)

## 4) Архітектура (план модулів)

* `auth` (стратегії JWT, сесії/refresh, гард)
* `users` (профіль, CRUD, пошук)
* `orgs`, `teams` (ієрархія tenant’ів)
* `roles`, `permissions` (RBAC)
* `policies` (ABAC: правила/умови)
* `audit` (лог дій), `emails` (листування)
* `health` (готовність/живість), `admin` (адмін‑ендпоїнти, якщо встигнемо)

## 5) Схема даних

* `User(id, email, passwordHash, orgId, isBlocked, isEmailVerified, ...)`
* `Organization(id, name, parentId)` → дерево
* `Team(id, name, orgId)`; зв’язок `UserTeam(userId, teamId)`
* `Role(id, key, parentId)`; `Permission(id, key)`; `RolePermission(roleId, permissionId)`
* `UserRole(userId, roleId, scope)` (`global`/`org:ID`/`team:ID`)
* `PolicyRule(subject, action, conditions(JSON), inverted, priority)`
* `Session(refreshToken, userId, expiresAt, isRevoked)`
* `AuditLog(userId, action, target, meta, createdAt)`

## 6) API ескіз (MVP)

* `POST /api/auth/register | /login | /refresh | /forgot-password | /reset-password`
* `GET /api/users/me | PATCH /api/users/me`
* `GET /api/users` (пошук, пагінація) | `GET /api/users/:id` | `POST /api/users` | `PATCH /api/users/:id` | `DELETE /api/users/:id`
* `GET/POST /api/roles`, `POST /api/roles/:id/permissions`
* `GET /api/docs` (Swagger)


## 7) Критерії приймання

* Ендпоїнти з валідацією (class-validator), помилки структуровані.
* Документація у Swagger, опис ролей/дозволів у README.
* Юніт‑тести ключових сервісів, мінімум 10–20 тестів.
* Демонстрація RBAC (доступ/відмова) на 2–3 сценаріях.
* (Бонус) ABAC‑правила на 1–2 кейсах.
