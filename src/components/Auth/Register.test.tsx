import { MockedProvider } from "@apollo/client/testing";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { REGISTER_MUTATION } from "../../api/mutations";
import { TOKEN_STORAGE_KEY } from "../../api/client";
import { AuthProvider } from "../../context/AuthContext";
import { Register } from "./Register";

test("регистрирует пользователя и автоматически входит", async () => {
  const user = userEvent.setup();
  const variables = {
    input: {
      email: "new@example.com",
      password: "password",
      username: "new_user",
      firstName: "Новый",
      lastName: "Пользователь",
      phone: "+79991234567",
    },
  };
  render(
    <MockedProvider
      addTypename={false}
      mocks={[{
        request: { query: REGISTER_MUTATION, variables },
        result: {
          data: {
            register: {
              token: "register-token",
              expiresAt: "2026-06-29T00:00:00Z",
              user: {
                __typename: "User",
                id: "new-id",
                email: "new@example.com",
                username: "new_user",
                firstName: "Новый",
                lastName: "Пользователь",
                birthDate: null,
                phone: "+79991234567",
                createdAt: "2026-06-28T00:00:00Z",
                updatedAt: "2026-06-28T00:00:00Z",
              },
            },
          },
        },
      }]}
    >
      <MemoryRouter initialEntries={["/register"]}>
        <AuthProvider>
          <Routes>
            <Route path="/register" element={<Register />} />
            <Route path="/profile" element={<div>Страница профиля</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

  await user.type(screen.getByLabelText("Электронная почта"), "new@example.com");
  await user.type(screen.getByLabelText(/Пароль/), "password");
  await user.type(screen.getByLabelText("Имя"), "Новый");
  await user.type(screen.getByLabelText("Фамилия"), "Пользователь");
  await user.type(screen.getByLabelText("Username"), "new_user");
  await user.type(screen.getByLabelText(/Телефон/), "+79991234567");
  await user.click(screen.getByRole("button", { name: "Создать аккаунт" }));

  expect(await screen.findByText("Страница профиля")).toBeInTheDocument();
  expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("register-token");
});
