# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Обзор

React 19 / TypeScript frontend-клиент Overmindv. Приложение — SPA на Vite 8, работает только с GraphQL API `api-gateway` и **не обращается** к backend-сервисам напрямую. Стек: React 19, Apollo Client 3, react-router-dom v6, lucide-react (иконки). Тесты — Vitest + Testing Library в jsdom.

Требуется Node.js 22.15+.

## Команды

```bash
npm ci
npm run dev            # Vite dev-сервер, http://localhost:5173
npm run lint           # ESLint (typescript-eslint)
npm run typecheck      # tsc --noEmit
npm run test           # vitest (watch)
npm run test:ci        # vitest run (однократный прогон)
npm run build          # typecheck + vite build
```

Запуск одного теста / группы: `npx vitest run src/components/Auth/Login.test.tsx` (путь до файла, или флаги фильтрации, напр. `-t "вход"`). В watch-режиме — `npm run test`.

CI (`.github/workflows/ci.yml`) гоняет lint, test:ci и build на каждый PR/push в `main`.

## Конфигурация

- `.env` — скопировать из `.env.example`, ключ `VITE_API_URL` (GraphQL endpoint). По умолчанию `http://localhost:8081/graphql`.
- В dev-режиме Vite проксирует `/graphql` → `http://localhost:8081` через тот же origin (см. `vite.config.ts`), чтобы httpOnly session cookie работала так же, как в проде (nginx). Поэтому `VITE_API_URL` обычно не нужен.
- Docker: статический Vite-билд под непривилегированным Nginx на порту `3000`, внутренний `/graphql` проксируется в `http://api-gateway:8081/graphql`.
- GraphQL endpoint один и тот же для всех операций (включая загрузки файлов). frontend не знает URL `tasks`/др. сервисов.

## Архитектура

**Точка входа** — `src/main.tsx`: оборачивает `<App/>` в `ApolloProvider`, `BrowserRouter`, `ThemeProvider`, `AuthProvider` (в указанном порядке). `App.tsx` — фрейм приложения: `Header`, `CollectionNotifications`, `AppRoutes`.

**Маршрутизация** — централизована в `src/routes.tsx` (`<AppRoutes/>`). Гварды: `PrivateRoute` (требует авторизации), `PublicOnlyRoute` (только для неавторизованных, напр. `/login`). Все каталог-страницы переиспользуют один компонент `CatalogBrowsePage`/`CatalogDetailPage` с пропом `kind` (universities/programs/courses/topics).

**API-слой** — в `src/api/`:
- `client.ts` — настройка `apolloClient`: auth-линк (JWT из localStorage), error-линк, upload-линк. Единственное место создания клиента.
- `types.ts` — GraphQL-типы, **написанные вручную** (без codegen).
- `queries.ts` / `mutations.ts` — `gql`-документы, шаринг фрагментов (напр. `USER_FIELDS`).
- `errors.ts` — `getErrorMessage(error)`.
- Доменные операции вынесены в отдельные модули: `tasks.ts`, `catalog.ts`, `users`-админка (`adminUsers.ts`), `collection.ts` (сбор задач).

**Аутентификация** — сессия живёт в httpOnly cookie `ovm_session`, которую ставит сервер в ответ на login/register; браузер шлёт её автоматически (`fetchOptions: { credentials: "include" }` в `client.ts`). **Токен недоступен JS** (защита от XSS) — в localStorage сессии нет, куда бы попасть она не должна. `AuthContext` (`src/context/AuthContext.tsx`) владеет состоянием: восстанавливает сессию через `ME_QUERY` (fetchPolicy `network-only`) на старте, `signIn` строит состояние из ответа мутации, `logout` вызывает `LOGOUT_MUTATION` + `apolloClient.clearStore()`. `AuthProvider` регистрирует обработчик через `setUnauthenticatedHandler` из `client.ts`. **error-линк Apollo сам вызывает logout при `UNAUTHENTICATED` (extensions.code) или HTTP 401** — не дублируй эту логику в компонентах.

**Обработка ошибок** — принцип проекта: пользователь никогда не видит технические детали. `getErrorMessage()` всегда возвращает нейтральное сообщение независимо от типа ошибки (это сознательно, не упрощать). Технические коды живут в GraphQL `extensions.code` и серверных логах. Не выводи пользователю сырые тексты ошибок.

**Загрузка файлов** — через `apollo-upload-client` (multipart) на тот же GraphQL endpoint. Программинг-задачи принимают `.py`/`.go` до 256 КБ; после отправки клиент опрашивает query результата, пока статус `queued`.

## Тестирование

- `vitest.config.ts`: jsdom, `globals: true`, `restoreMocks: true`, setup — `src/test/setup.ts`.
- Загрузочный setup очищает `localStorage` перед каждым тестом.
- Компоненты тестируются через `MockedProvider` (`@apollo/client/testing`) + `MemoryRouter` + обёртку в необходимые провайдеры (`AuthProvider` и т.п.). Пример-референс: `src/components/Auth/Login.test.tsx`, `src/pages/tasks/TasksPages.test.tsx`.
- Тест-сеты данных для GraphQL моков повторяют полные объекты типов из `src/api/types.ts` (включая `__typename` при `addTypename`).
- ESLint запрещает `console.log` (разрешены `warn`/`error`).

## Соглашения о коммитах

Формат коммитов: `[TASK-123] тип: описание` (напр. `[OVM-37] add ...`), соответствует Ozon-конвенции — см. skill `ozon-dev:git-commit`.
