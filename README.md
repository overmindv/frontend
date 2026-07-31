# Soundwave frontend

React/TypeScript web client for the Overmindv user flow. All data goes through the Laserbeak GraphQL gateway; the browser never calls Arcee directly.

## Features

- registration with automatic sign-in;
- login and JWT persistence in `localStorage`;
- protected profile route;
- profile view and partial update;
- global logout on `UNAUTHENTICATED` GraphQL responses;
- Russian server-error messages and loading states;
- responsive pure-CSS UI.
- catalog browsing через Laserbeak для всех пользователей;
- admin-only catalog CRUD: университеты, программы, курсы, темы, backlog, дерево и пререквизиты;
- admin-only управление ролями пользователей.

## Администрирование каталога

После авторизации каталог доступен по `/admin/catalog/universities`. Обычные пользователи видят существующие элементы в read-only режиме. Кнопки создания, удаления, смены статуса и формы редактирования показываются только пользователям с ролью `admin` в JWT.

Backlog-страницы:

- `/admin/catalog/programs` — программы без обязательного университета.
- `/admin/catalog/courses` — курсы без обязательной программы.
- `/admin/catalog/topics` — темы без обязательного курса.

Страницы создания:

- `/admin/catalog/programs/new` — создать программу и опционально выбрать университет.
- `/admin/catalog/courses/new` — создать курс, выбрать университет для фильтрации и опционально программу.
- `/admin/catalog/topics/new` — создать тему, выбрать университет/программу для фильтрации и опционально курс.

Администраторы управляют ролями на `/admin/users`: список пользователей можно фильтровать по username/email, роль admin переключается через Laserbeak → Arcee. Поле `logoFileId` вводится вручную до появления upload flow Mirage.

Все пользовательские ошибки показываются нейтральным текстом без технической причины. Подробные коды остаются только в GraphQL `extensions.code` и серверных логах.

## Structure

```text
src/
├── api/                 Apollo client, documents, types and error mapping
├── components/
│   ├── Auth/            Login and Register forms
│   ├── Profile/         profile query/update form
│   ├── common/          Header, ErrorMessage and Spinner
│   ├── PrivateRoute.tsx
│   └── PublicOnlyRoute.tsx
├── context/             AuthContext and persistent session state
├── pages/               route-level composition
├── styles/              global responsive CSS
├── App.tsx
├── main.tsx
└── routes.tsx
```

Vite uses the root `index.html`; a `public/index.html` is intentionally not used.

## Local development

Prerequisites: Node.js 22.15+ and Laserbeak on port `8081`.

```bash
cp .env.example .env
npm install
npm run dev
```

Open <http://localhost:5173>. `VITE_API_URL` defaults to `http://localhost:8081/graphql`.

Quality commands:

```bash
npm run lint
npm run typecheck
npm run test:ci
npm run build
```

Tests use React Testing Library and Apollo `MockedProvider` for successful login, login error, registration and profile update.

## Docker and Ratchet

The multi-stage Dockerfile builds immutable Vite assets and serves them with unprivileged Nginx on port `3000`. The image compiles `VITE_API_URL=/graphql`; Nginx proxies that path to `http://laserbeak:8081/graphql`.

```bash
docker build -t soundwave:local .
```

Run the image on the same Docker/Kubernetes network as the service named `laserbeak`; the Nginx proxy resolves that internal hostname.

For the complete platform:

```bash
cd ../ratchet
cp .env.example .env
# Set POSTGRES_PASSWORD, IRONHIDE_POSTGRES_PASSWORD, JWT_SECRET and BOOTSTRAP_SUPERUSER_*.
make up
```

Open <http://localhost:3000>. The gateway Playground remains available at <http://localhost:8081/playground>.

## Gateway operations

Soundwave follows the current Laserbeak schema:

```graphql
mutation Register($input: RegisterInput!) { register(input: $input) { token user { id } } }
mutation Login($input: LoginInput!) { login(input: $input) { token user { id } } }
query GetUser($id: ID!) { getUser(id: $id) { id email username firstName lastName birthDate phone roles isAdmin isSuperuser } }
mutation UpdateUser($id: ID!, $input: UpdateUserInput!) { updateUser(id: $id, input: $input) { id username firstName lastName } }
query AdminUsers($search: String) { users(search: $search) { id username email isAdmin isSuperuser } }
mutation SetUserAdmin($id: ID!, $admin: Boolean!) { setUserAdmin(id: $id, admin: $admin) { id isAdmin } }
```

The profile ID is stored with the JWT after login/registration because the gateway currently exposes `getUser(id:)`, not `me`.
