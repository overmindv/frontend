import { MockedProvider, type MockedResponse } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { LOGIN_MUTATION } from "../../api/mutations";
import { TOKEN_STORAGE_KEY, USER_ID_STORAGE_KEY } from "../../api/client";
import { AuthProvider } from "../../context/AuthContext";
import { Login } from "./Login";

const loginVariables = {
  input: { email: "user@example.com", password: "password" },
};

function renderLogin(mocks: MockedResponse[]) {
  return render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <MemoryRouter initialEntries={["/login"]}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/profile" element={<div>Страница профиля</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );
}

test("успешно входит, сохраняет JWT и открывает профиль", async () => {
  const user = userEvent.setup();
  renderLogin([
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
  expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("jwt-token");
  expect(localStorage.getItem(USER_ID_STORAGE_KEY)).toBe("user-id");
});

test("показывает ошибку входа", async () => {
  const user = userEvent.setup();
  renderLogin([
    {
      request: { query: LOGIN_MUTATION, variables: loginVariables },
      error: new Error("invalid credentials"),
    },
  ]);

  await user.type(screen.getByLabelText("Электронная почта"), "user@example.com");
  await user.type(screen.getByLabelText("Пароль"), "password");
  await user.click(screen.getByRole("button", { name: "Войти" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("invalid credentials");
});
