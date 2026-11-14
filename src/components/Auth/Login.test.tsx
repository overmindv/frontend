import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LOGIN_MUTATION } from "../../api/mutations";
import { AuthProvider } from "../../context/AuthContext";
import { meMock } from "../../test/authMocks";
import { PublicOnlyRoute } from "../PublicOnlyRoute";
import { Login } from "./Login";

const loginVariables = {
  input: { email: "user@example.com", password: "password" },
};

function renderLogin(mocks: MockedResponse[], from?: string) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={[{ pathname: "/login", state: from ? { from: { pathname: from } } : null }]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
            <Route path="/profile" element={<div>Страница профиля</div>} />
            <Route path="/plans/public" element={<div>Возврат к плану</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );
}

test("успешно входит и открывает профиль (токен остаётся в httpOnly cookie, в localStorage его нет)", async () => {
  const user = userEvent.setup();
  renderLogin([
    meMock(null),
    {
      request: { query: LOGIN_MUTATION, variables: loginVariables },
      result: {
        data: {
          login: {
            token: "jwt-token",
            expiresAt: "2026-06-29T00:00:00Z",
            user: {
              __typename: "User",
              id: "user-id",
              email: "user@example.com",
              username: "user",
              firstName: "User",
              lastName: "Example",
              birthDate: null,
              phone: null,
              avatar: null,
              roles: [],
              isAdmin: false,
              isSuperuser: false,
              createdAt: "2026-06-28T00:00:00Z",
              updatedAt: "2026-06-28T00:00:00Z",
            },
          },
        },
      },
    },
  ]);

  await user.type(screen.getByLabelText("Электронная почта"), "user@example.com");
  await user.type(screen.getByLabelText("Пароль"), "password");
  await user.click(screen.getByRole("button", { name: "Войти" }));

  expect(await screen.findByText("Страница профиля")).toBeInTheDocument();
  // Токен недоступен JS: в localStorage ничего не сохраняется.
  expect(localStorage.getItem("ovm_session")).toBeNull();
});

test("показывает ошибку входа", async () => {
  const user = userEvent.setup();
  renderLogin([
    meMock(null),
    {
      request: { query: LOGIN_MUTATION, variables: loginVariables },
      error: new Error("invalid credentials"),
    },
  ]);

  await user.type(screen.getByLabelText("Электронная почта"), "user@example.com");
  await user.type(screen.getByLabelText("Пароль"), "password");
  await user.click(screen.getByRole("button", { name: "Войти" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось выполнить действие");
});

test("после входа возвращает к публичному плану", async () => {
  const user = userEvent.setup();
  renderLogin([
    meMock(null),
    {
      request: { query: LOGIN_MUTATION, variables: loginVariables },
      result: {
        data: {
          login: {
            token: "jwt-token",
            expiresAt: "2026-06-29T00:00:00Z",
            user: {
              __typename: "User",
              id: "user-id",
              email: "user@example.com",
              username: "user",
              firstName: "User",
              lastName: "Example",
              birthDate: null,
              phone: null,
              avatar: null,
              roles: [],
              isAdmin: false,
              isSuperuser: false,
              createdAt: "2026-06-28T00:00:00Z",
              updatedAt: "2026-06-28T00:00:00Z",
            },
          },
        },
      },
    },
  ], "/plans/public");

  await user.type(screen.getByLabelText("Электронная почта"), "user@example.com");
  await user.type(screen.getByLabelText("Пароль"), "password");
  await user.click(screen.getByRole("button", { name: "Войти" }));

  expect(await screen.findByText("Возврат к плану")).toBeInTheDocument();
  // Токен недоступен JS: в localStorage ничего не сохраняется.
  expect(localStorage.getItem("ovm_session")).toBeNull();
});
