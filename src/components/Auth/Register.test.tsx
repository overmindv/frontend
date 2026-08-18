import { MockedProvider } from "@apollo/client/testing";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { vi } from "vitest";
import { REGISTER_MUTATION } from "../../api/mutations";
import { TOKEN_STORAGE_KEY } from "../../api/client";
import { AuthProvider } from "../../context/AuthContext";
import { PublicOnlyRoute } from "../PublicOnlyRoute";
import { Register } from "./Register";

const uploadAvatarMock = vi.hoisted(() => vi.fn());

vi.mock("../../api/media", () => ({
  uploadAvatar: uploadAvatarMock,
}));

vi.mock("../Profile/AvatarCropper", () => ({
  AvatarCropper: ({ onChange, onProcessingChange, onSelectionChange }: { onChange: (blob: Blob | null) => void; onProcessingChange?: (processing: boolean) => void; onSelectionChange?: (selected: boolean) => void }) => (
    <>
      <button onClick={() => { onSelectionChange?.(true); onProcessingChange?.(true); }} type="button">
        Начать обработку тестового фото
      </button>
      <button onClick={() => { onSelectionChange?.(true); onChange(new Blob(["avatar"], { type: "image/webp" })); onProcessingChange?.(false); }} type="button">
        Подготовить тестовое фото
      </button>
    </>
  ),
}));

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

test("не регистрирует аккаунт, пока выбранное фото обрабатывается", async () => {
  const user = userEvent.setup();
  render(
    <MockedProvider addTypename={false}>
      <MemoryRouter>
        <AuthProvider><Register /></AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

  await user.click(screen.getByRole("button", { name: "Начать обработку тестового фото" }));
  const submit = screen.getByRole("button", { name: "Готовим фото…" });
  fireEvent.submit(submit.closest("form")!);

  expect(await screen.findByRole("alert")).toHaveTextContent("Не удалось выполнить действие. Попробуйте ещё раз.");
  expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
});

test("загружает фото до auth-перехода и завершает регистрацию с аватаром", async () => {
  const user = userEvent.setup();
  uploadAvatarMock.mockImplementation(async () => {
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBe("register-token");

    return {};
  });
  const variables = {
    input: {
      email: "avatar@example.com",
      password: "password",
      username: "avatar_user",
      firstName: "Фото",
      lastName: "Пользователь",
      phone: "+79991234568",
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
                id: "avatar-user-id",
                email: "avatar@example.com",
                username: "avatar_user",
                firstName: "Фото",
                lastName: "Пользователь",
                birthDate: null,
                phone: "+79991234568",
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
      }]}
    >
      <MemoryRouter initialEntries={["/register"]}>
        <AuthProvider>
          <Routes>
            <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
            <Route path="/profile" element={<div>Профиль с фото</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    </MockedProvider>,
  );

  await user.type(screen.getByLabelText("Электронная почта"), "avatar@example.com");
  await user.type(screen.getByLabelText(/Пароль/), "password");
  await user.type(screen.getByLabelText("Имя"), "Фото");
  await user.type(screen.getByLabelText("Фамилия"), "Пользователь");
  await user.type(screen.getByLabelText("Username"), "avatar_user");
  await user.type(screen.getByLabelText(/Телефон/), "+79991234568");
  await user.click(screen.getByRole("button", { name: "Подготовить тестовое фото" }));
  await user.click(screen.getByRole("button", { name: "Создать аккаунт" }));

  expect(await screen.findByText("Профиль с фото")).toBeInTheDocument();
  expect(uploadAvatarMock).toHaveBeenCalledOnce();
});
