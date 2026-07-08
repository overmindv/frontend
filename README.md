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
# Set POSTGRES_PASSWORD and JWT_SECRET.
make up
```

Open <http://localhost:3000>. The gateway Playground remains available at <http://localhost:8081/playground>.

## Gateway operations

Soundwave follows the current Laserbeak schema:

```graphql
mutation Register($input: RegisterInput!) { register(input: $input) { token user { id } } }
mutation Login($input: LoginInput!) { login(input: $input) { token user { id } } }
query GetUser($id: ID!) { getUser(id: $id) { id email username firstName lastName birthDate phone } }
mutation UpdateUser($id: ID!, $input: UpdateUserInput!) { updateUser(id: $id, input: $input) { id username firstName lastName } }
```

The profile ID is stored with the JWT after login/registration because the gateway currently exposes `getUser(id:)`, not `me`.
